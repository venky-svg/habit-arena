import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateLevel, evaluateBadges } from '../services/streakManager.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'habit_arena_super_secret_key_123';

// Helper to validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Signup Endpoint
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields (username, email, password) are required.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.findOne('users', u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already in use.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await db.insert('users', {
      username,
      email,
      passwordHash,
      xp: 0,
      streak: 0,
      badges: [],
      level: 'Bronze',
      profilePhoto: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
      role: 'user', // user or admin
      isBanned: false
    });

    // Create JWT
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        xp: newUser.xp,
        streak: newUser.streak,
        badges: newUser.badges,
        level: newUser.level,
        profilePhoto: newUser.profilePhoto,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Login Endpoint
router.post('/login', async (req, res) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    return res.status(400).json({ error: 'Email/Username and password are required.' });
  }

  try {
    // Find user by email or username
    const user = await db.findOne('users', u => 
      u.email === emailOrUsername || u.username === emailOrUsername
    );

    if (!user) {
      return res.status(400).json({ error: 'Invalid username/email or password.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Your account has been suspended by the administrator.' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid username/email or password.' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        xp: user.xp,
        streak: user.streak,
        badges: user.badges,
        level: user.level,
        profilePhoto: user.profilePhoto,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Fetch Profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db.findOne('users', u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      xp: user.xp,
      streak: user.streak,
      badges: user.badges,
      level: user.level,
      profilePhoto: user.profilePhoto,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Update Profile
router.put('/profile', authenticateToken, async (req, res) => {
  const { profilePhoto, password } = req.body;
  const updates = {};

  try {
    if (profilePhoto) {
      updates.profilePhoto = profilePhoto;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      const salt = await bcrypt.genSalt(10);
      updates.passwordHash = await bcrypt.hash(password, salt);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    const updatedUser = await db.updateOne('users', u => u.id === req.user.id, updates);

    res.json({
      message: 'Profile updated successfully!',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        xp: updatedUser.xp,
        streak: updatedUser.streak,
        badges: updatedUser.badges,
        level: updatedUser.level,
        profilePhoto: updatedUser.profilePhoto,
        role: updatedUser.role
      }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
