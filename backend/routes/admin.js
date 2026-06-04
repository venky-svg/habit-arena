import express from 'express';
import { db } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to verify Admin role
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
}

// Get Dashboard Statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.getCollection('users');
    const challenges = await db.getCollection('challenges');
    const tasks = await db.getCollection('tasks');

    const activeChallenges = challenges.filter(c => c.status === 'active').length;
    const completedChallenges = challenges.filter(c => c.status === 'completed').length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;

    // Server health stats
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    res.json({
      totalUsers: users.length,
      activeChallenges,
      completedChallenges,
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      serverHealth: {
        uptime: Math.round(uptime), // seconds
        memoryUsage: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
        status: 'Healthy'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get Users List (for moderation)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.getCollection('users');
    // Hide password hashes
    const sanitizedUsers = users.map(u => {
      const { passwordHash, ...rest } = u;
      return rest;
    });
    res.json(sanitizedUsers);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Toggle User Ban
router.post('/users/:id/ban', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await db.findOne('users', u => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot ban another administrator.' });
    }

    const currentBanStatus = user.isBanned || false;
    const updatedUser = await db.updateOne('users', u => u.id === user.id, {
      isBanned: !currentBanStatus
    });

    res.json({
      message: updatedUser.isBanned ? 'User successfully suspended.' : 'User suspension lifted.',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        isBanned: updatedUser.isBanned
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Delete Challenge (Moderation)
router.delete('/challenges/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const challenge = await db.findOne('challenges', c => c.id === req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }

    // Delete tasks, messages and the challenge itself
    await db.delete('challenges', c => c.id === req.params.id);
    await db.delete('tasks', t => t.challengeId === req.params.id);
    await db.delete('messages', m => m.challengeId === req.params.id);

    res.json({ message: 'Challenge and associated data deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
