import express from 'express';
import { db } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateLevel, evaluateBadges } from '../services/streakManager.js';

const router = express.Router();

// Helper to get date string YYYY-MM-DD in simulated system time
async function getSimulatedDateString() {
  const time = await db.getSystemTime();
  const year = time.getFullYear();
  const month = String(time.getMonth() + 1).padStart(2, '0');
  const day = String(time.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Add Task
router.post('/', authenticateToken, async (req, res) => {
  const { taskName, difficulty, challengeId } = req.body;

  if (!taskName || !difficulty || !challengeId) {
    return res.status(400).json({ error: 'Task name, difficulty, and challenge ID are required.' });
  }

  const allowedDifficulties = ['easy', 'medium', 'hard'];
  if (!allowedDifficulties.includes(difficulty.toLowerCase())) {
    return res.status(400).json({ error: 'Difficulty must be easy, medium, or hard.' });
  }

  try {
    // Verify user is member of the challenge
    const challenge = await db.findOne('challenges', c => c.id === challengeId);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }
    if (!challenge.members.includes(req.user.id)) {
      return res.status(403).json({ error: 'You must be a member of this challenge to add tasks.' });
    }

    const dateStr = await getSimulatedDateString();

    const newTask = await db.insert('tasks', {
      taskName,
      difficulty: difficulty.toLowerCase(),
      completed: false,
      completionTime: null,
      userId: req.user.id,
      challengeId,
      date: dateStr // YYYY-MM-DD format
    });

    res.status(210).json({
      message: 'Task added successfully!',
      task: newTask
    });
  } catch (err) {
    console.error('Add task error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get Tasks for a Challenge
router.get('/challenge/:challengeId', authenticateToken, async (req, res) => {
  const { date } = req.query; // Optional date query parameter, defaults to current simulated date
  
  try {
    const targetDate = date || await getSimulatedDateString();
    
    // Find all tasks for this challenge and date
    const tasks = await db.find('tasks', t => 
      t.challengeId === req.params.challengeId && 
      t.date === targetDate
    );

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Toggle Task Completion (Complete / Uncomplete)
router.post('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const task = await db.findOne('tasks', t => t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (task.userId !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to complete someone else\'s task.' });
    }

    const challenge = await db.findOne('challenges', c => c.id === task.challengeId);
    if (challenge && challenge.status !== 'active') {
      return res.status(400).json({ error: 'Cannot update tasks for a finished challenge.' });
    }

    const wasCompleted = task.completed;
    const nowCompleted = !wasCompleted;
    
    const systemTime = await db.getSystemTime();
    const completionTime = nowCompleted ? systemTime.toISOString() : null;

    // Calculate XP updates
    // Easy = 10 XP, Medium = 20 XP, Hard = 40 XP
    let xpDiff = 0;
    if (task.difficulty === 'hard') xpDiff = 40;
    else if (task.difficulty === 'medium') xpDiff = 20;
    else xpDiff = 10;

    const finalXpDiff = nowCompleted ? xpDiff : -xpDiff;

    // Get User and update XP
    const user = await db.findOne('users', u => u.id === req.user.id);
    if (user) {
      const updatedXp = Math.max(0, (user.xp || 0) + finalXpDiff);
      const level = calculateLevel(updatedXp);
      
      await db.updateOne('users', u => u.id === req.user.id, { xp: updatedXp, level });
      
      if (nowCompleted) {
        // Evaluate user badges
        await evaluateBadges(req.user.id);
      }
    }

    // Update Task
    const updatedTask = await db.updateOne('tasks', t => t.id === task.id, {
      completed: nowCompleted,
      completionTime
    });

    // Create activity feed notification if completed
    if (nowCompleted) {
      await db.insert('messages', {
        challengeId: task.challengeId,
        userId: 'system',
        username: 'System',
        text: `💪 ${req.user.username} completed: "${task.taskName}" (+${xpDiff} XP) 🔥`,
        reactions: [],
        timestamp: systemTime.toISOString()
      });
    }

    res.json({
      message: nowCompleted ? 'Task completed!' : 'Task uncompleted.',
      task: updatedTask,
      xpGained: finalXpDiff
    });
  } catch (err) {
    console.error('Toggle task error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Edit Task
router.put('/:id', authenticateToken, async (req, res) => {
  const { taskName, difficulty } = req.body;
  if (!taskName || !difficulty) {
    return res.status(400).json({ error: 'Task name and difficulty are required.' });
  }

  try {
    const task = await db.findOne('tasks', t => t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    if (task.userId !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to edit this task.' });
    }

    const updatedTask = await db.updateOne('tasks', t => t.id === task.id, {
      taskName,
      difficulty: difficulty.toLowerCase()
    });

    res.json({
      message: 'Task updated successfully!',
      task: updatedTask
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Delete Task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const task = await db.findOne('tasks', t => t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    if (task.userId !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to delete this task.' });
    }

    // If task was completed, revert the XP first!
    if (task.completed) {
      let xpDiff = 0;
      if (task.difficulty === 'hard') xpDiff = 40;
      else if (task.difficulty === 'medium') xpDiff = 20;
      else xpDiff = 10;

      const user = await db.findOne('users', u => u.id === req.user.id);
      if (user) {
        const updatedXp = Math.max(0, (user.xp || 0) - xpDiff);
        const level = calculateLevel(updatedXp);
        await db.updateOne('users', u => u.id === req.user.id, { xp: updatedXp, level });
      }
    }

    await db.delete('tasks', t => t.id === req.params.id);
    res.json({ message: 'Task deleted successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
