import express from 'express';
import { db } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get messages for a challenge
router.get('/challenge/:challengeId', authenticateToken, async (req, res) => {
  try {
    const list = await db.find('messages', m => m.challengeId === req.params.challengeId);
    
    // Sort by timestamp asc
    list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Post a message
router.post('/challenge/:challengeId', authenticateToken, async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Message text cannot be empty.' });
  }

  try {
    const systemTime = await db.getSystemTime();
    
    const user = await db.findOne('users', u => u.id === req.user.id);
    const profilePhoto = user ? user.profilePhoto : '';

    const newMessage = await db.insert('messages', {
      challengeId: req.params.challengeId,
      userId: req.user.id,
      username: req.user.username,
      profilePhoto,
      text,
      reactions: [], // reactions schema: { userId, emoji }
      timestamp: systemTime.toISOString()
    });

    // Send via socket will be handled in server.js or by the client refreshing,
    // but returning it is standard. We will also trigger Socket.IO emit in server.js.
    // To allow socket integration, we attach the message to req so server.js can emit it.
    req.newMessage = newMessage;

    res.status(210).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// React to a message
router.post('/:id/react', authenticateToken, async (req, res) => {
  const { emoji } = req.body;
  const validEmojis = ['🔥', '💪', '👑', '👏'];

  if (!emoji || !validEmojis.includes(emoji)) {
    return res.status(400).json({ error: 'Invalid or missing emoji reaction.' });
  }

  try {
    const message = await db.findOne('messages', m => m.id === req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    let reactions = [...(message.reactions || [])];
    
    // Check if user already reacted with this emoji
    const existingIndex = reactions.findIndex(r => r.userId === req.user.id && r.emoji === emoji);

    if (existingIndex !== -1) {
      // Remove reaction if clicked again (toggle)
      reactions.splice(existingIndex, 1);
    } else {
      // Add reaction
      reactions.push({
        userId: req.user.id,
        username: req.user.username,
        emoji
      });
    }

    const updatedMessage = await db.updateOne('messages', m => m.id === message.id, {
      reactions
    });

    res.json(updatedMessage);
  } catch (err) {
    console.error('React error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
