import dotenv from "dotenv";
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { db } from './database/db.js';

// Route imports
import authRoutes from './routes/auth.js';
import challengeRoutes from './routes/challenges.js';
import taskRoutes from './routes/tasks.js';
import messageRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';

// Service imports
import { processDayTransition } from './services/streakManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.log(err));

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for simplicity in local demo testing
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Attach routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// Developer Simulation Endpoint (Critical for demo testing of reset logic)
app.post('/api/developer/advance-day', async (req, res) => {
  const { days } = req.body;
  const daysToAdvance = parseInt(days, 10) || 1;

  try {
    const prevTime = await db.getSystemTime();
    const prevYear = prevTime.getFullYear();
    const prevMonth = String(prevTime.getMonth() + 1).padStart(2, '0');
    const prevDay = String(prevTime.getDate()).padStart(2, '0');
    const prevDateStr = `${prevYear}-${prevMonth}-${prevDay}`;

    // Advance time in database
    const newTime = await db.advanceSystemTime(daysToAdvance);
    
    // Process streaks and resets for the day that just passed
    // If advancing multiple days, simulate them sequentially:
    let currentSimTime = new Date(prevTime.getTime());
    for (let i = 0; i < daysToAdvance; i++) {
      const year = currentSimTime.getFullYear();
      const month = String(currentSimTime.getMonth() + 1).padStart(2, '0');
      const day = String(currentSimTime.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      await processDayTransition(dateString);
      currentSimTime.setDate(currentSimTime.getDate() + 1);
    }

    const newYear = newTime.getFullYear();
    const newMonth = String(newTime.getMonth() + 1).padStart(2, '0');
    const newDay = String(newTime.getDate()).padStart(2, '0');
    const newDateStr = `${newYear}-${newMonth}-${newDay}`;

    // Broadcast update message globally
    await db.insert('messages', {
      challengeId: 'system',
      userId: 'system',
      username: 'System',
      text: `⏰ Time advanced by ${daysToAdvance} day(s). System date: ${newDateStr}. Tasks reset for the new day!`,
      reactions: [],
      timestamp: newTime.toISOString()
    });

    // Notify connected sockets of the time change
    io.emit('time_shifted', { newTime: newTime.toISOString(), newDate: newDateStr });

    res.json({
      message: `System clock successfully advanced by ${daysToAdvance} day(s).`,
      previousDate: prevDateStr,
      newDate: newDateStr,
      systemTime: newTime.toISOString()
    });
  } catch (err) {
    console.error('Time advancement error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Developer Fetch System Time
app.get('/api/developer/time', async (req, res) => {
  try {
    const time = await db.getSystemTime();
    const year = time.getFullYear();
    const month = String(time.getMonth() + 1).padStart(2, '0');
    const day = String(time.getDate()).padStart(2, '0');
    
    res.json({
      systemTime: time.toISOString(),
      dateString: `${year}-${month}-${day}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

  //res.sendFile(path.join(frontendBuildPath, 'index.html'));
  app.get("/", (req, res) => {
  res.send("HabitArena Backend Running");
});
// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join challenge room
  socket.on('join_room', ({ challengeId }) => {
    socket.join(challengeId);
    console.log(`Socket ${socket.id} joined room: ${challengeId}`);
  });

  // Leave room
  socket.on('leave_room', ({ challengeId }) => {
    socket.leave(challengeId);
    console.log(`Socket ${socket.id} left room: ${challengeId}`);
  });

  // New chat message
  socket.on('send_message', (messageData) => {
    // Broadcast to everyone in the room (including sender)
    io.to(messageData.challengeId).emit('receive_message', messageData);
  });

  // Reaction updates
  socket.on('reaction_update', ({ challengeId, messageId, reactions }) => {
    io.to(challengeId).emit('receive_reaction', { messageId, reactions });
  });

  // Broadcast completion updates to trigger live leaderboard updates
  socket.on('task_completed', ({ challengeId, username, taskName, xpGained }) => {
    io.to(challengeId).emit('leaderboard_update', { username, taskName, xpGained });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`HabitArena server running on port ${PORT}`);
});
