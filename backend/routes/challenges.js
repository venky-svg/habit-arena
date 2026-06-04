import express from 'express';
import { db } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { triggerWinnerEvaluation } from '../services/streakManager.js';

const router = express.Router();

// Generate unique challenge invite code
function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create Challenge
router.post('/', authenticateToken, async (req, res) => {
  const { title, description, duration, isPublic, maxParticipants } = req.body;

  if (!title || !duration) {
    return res.status(400).json({ error: 'Title and duration are required.' });
  }

  const durationDays = parseInt(duration, 10);
  if (isNaN(durationDays) || durationDays <= 0) {
    return res.status(400).json({ error: 'Duration must be a positive number of days.' });
  }

  try {
    const inviteCode = generateInviteCode();
    
    // Set start date to today, end date to today + duration
    const systemTime = await db.getSystemTime();
    const startDate = systemTime.toISOString();
    const endDate = new Date(systemTime.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const newChallenge = await db.insert('challenges', {
      title,
      description: description || '',
      duration: durationDays,
      inviteCode,
      isPublic: isPublic === undefined ? true : isPublic,
      maxParticipants: parseInt(maxParticipants, 10) || 10,
      creatorId: req.user.id,
      creatorName: req.user.username,
      members: [req.user.id],
      status: 'active', // active, completed
      startDate,
      endDate,
      winner: null,
      leaderboard: [
        {
          userId: req.user.id,
          username: req.user.username,
          totalXp: 0,
          tasksCompleted: 0,
          totalTasks: 0,
          completionRate: 0
        }
      ]
    });

    // Create system chat message
    await db.insert('messages', {
      challengeId: newChallenge.id,
      userId: 'system',
      username: 'System',
      text: `🎉 Challenge "${title}" was created by ${req.user.username}! Invite Code: ${inviteCode}`,
      reactions: [],
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Challenge created successfully!',
      challenge: newChallenge
    });
  } catch (err) {
    console.error('Create challenge error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Join Challenge via Invite Code
router.post('/join', authenticateToken, async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ error: 'Invite code is required.' });
  }

  try {
    const challenge = await db.findOne('challenges', c => 
      c.inviteCode === inviteCode.toUpperCase()
    );

    if (!challenge) {
      return res.status(404).json({ error: 'Invalid invite code. Challenge room not found.' });
    }

    if (challenge.status !== 'active') {
      return res.status(400).json({ error: 'This challenge has already concluded.' });
    }

    if (challenge.members.includes(req.user.id)) {
      return res.status(400).json({ error: 'You are already a member of this challenge.' });
    }

    if (challenge.members.length >= challenge.maxParticipants) {
      return res.status(400).json({ error: 'Challenge room is already full.' });
    }

    const updatedMembers = [...challenge.members, req.user.id];
    
    // Add user to leaderboard entry
    const updatedLeaderboard = [
      ...(challenge.leaderboard || []),
      {
        userId: req.user.id,
        username: req.user.username,
        totalXp: 0,
        tasksCompleted: 0,
        totalTasks: 0,
        completionRate: 0
      }
    ];

    const updatedChallenge = await db.updateOne('challenges', c => c.id === challenge.id, {
      members: updatedMembers,
      leaderboard: updatedLeaderboard
    });

    // Notify group chat
    await db.insert('messages', {
      challengeId: challenge.id,
      userId: 'system',
      username: 'System',
      text: `👋 ${req.user.username} joined the arena!`,
      reactions: [],
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Successfully joined challenge room!',
      challenge: updatedChallenge
    });
  } catch (err) {
    console.error('Join challenge error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// List Public Challenges
router.get('/public', authenticateToken, async (req, res) => {
  try {
    const list = await db.find('challenges', c => 
      c.isPublic && 
      c.status === 'active' && 
      !c.members.includes(req.user.id)
    );
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// List My Challenges
router.get('/my-challenges', authenticateToken, async (req, res) => {
  try {
    const list = await db.find('challenges', c => 
      c.members.includes(req.user.id)
    );
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get Challenge Details and Live Leaderboard
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const challenge = await db.findOne('challenges', c => c.id === req.params.id);
    
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }

    if (!challenge.members.includes(req.user.id) && !challenge.isPublic && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied to private challenge room.' });
    }

    // Refresh dynamic leaderboard statistics for a live view
    const membersDetails = [];
    const updatedLeaderboard = [];

    for (const memberId of challenge.members) {
      const user = await db.findOne('users', u => u.id === memberId);
      if (!user) continue;

      const userTasks = await db.find('tasks', t => t.challengeId === challenge.id && t.userId === memberId);
      const completedTasks = userTasks.filter(t => t.completed);
      
      // Calculate XP inside this challenge
      let challengeXp = 0;
      completedTasks.forEach(t => {
        if (t.difficulty === 'hard') challengeXp += 40;
        else if (t.difficulty === 'medium') challengeXp += 20;
        else challengeXp += 10;
      });

      const rate = userTasks.length > 0 ? (completedTasks.length / userTasks.length) * 100 : 0;

      updatedLeaderboard.push({
        userId: memberId,
        username: user.username,
        profilePhoto: user.profilePhoto,
        streak: user.streak || 0,
        level: user.level || 'Bronze',
        totalXp: challengeXp,
        tasksCompleted: completedTasks.length,
        totalTasks: userTasks.length,
        completionRate: Math.round(rate)
      });

      membersDetails.push({
        id: user.id,
        username: user.username,
        profilePhoto: user.profilePhoto,
        xp: user.xp,
        streak: user.streak,
        level: user.level,
        badges: user.badges || []
      });
    }

    // Sort rankings by total XP inside challenge, then completion rate
    updatedLeaderboard.sort((a, b) => b.totalXp - a.totalXp || b.completionRate - a.completionRate);

    // Save recalculated leaderboard
    const freshChallenge = await db.updateOne('challenges', c => c.id === challenge.id, {
      leaderboard: updatedLeaderboard
    });

    res.json({
      challenge: freshChallenge,
      members: membersDetails
    });
  } catch (err) {
    console.error('Get challenge details error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Finalize and conclude challenge (Trigger Winner evaluation manually if endDate passed)
router.post('/:id/finalize', authenticateToken, async (req, res) => {
  try {
    const challenge = await db.findOne('challenges', c => c.id === req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }

    // Check if end date passed
    const systemTime = await db.getSystemTime();
    if (systemTime < new Date(challenge.endDate) && req.user.id !== challenge.creatorId && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Challenge is still in progress and cannot be completed yet.' });
    }

    await triggerWinnerEvaluation(challenge.id);
    const updated = await db.findOne('challenges', c => c.id === challenge.id);
    res.json({
      message: 'Challenge finalized successfully!',
      challenge: updated
    });
  } catch (err) {
    console.error('Finalize challenge error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
