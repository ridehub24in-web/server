const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');
const matchRoutes = require('./routes/match');
const swipeRoutes = require('./routes/swipe');
const paymentRoutes = require('./routes/payments');
const giftRoutes = require('./routes/gifts');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Pass io to app for use in routes/controllers
app.set('io', io);
app.set('onlineUsers', new Map());
const onlineUsers = app.get('onlineUsers');

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logging middleware for debugging API calls
app.use((req, res, next) => {
  const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip} - Body: ${JSON.stringify(req.body)}\n`;
  console.log(`[Incoming Request] ${req.method} ${req.url}`);
  try {
    fs.appendFileSync(path.join(__dirname, 'api_requests.log'), logMessage);
  } catch (err) {
    console.error('Failed to write to api_requests.log:', err);
  }
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static('uploads'));

// Testing route to verify server connectivity
app.get(['/test', '/api/test'], (req, res) => {
  res.status(200).json({ message: 'Backend is running correctly!', ip: req.ip });
});

// Routes (mapped with both /api prefix and direct fallback for absolute robustness)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/users', userRoutes);
app.use('/users', userRoutes);

app.use('/api/chats', chatRoutes);
app.use('/chats', chatRoutes);

app.use('/api/matches', matchRoutes);
app.use('/matches', matchRoutes);

app.use('/api/swipe', swipeRoutes);
app.use('/swipe', swipeRoutes);

app.use('/api/payments', paymentRoutes);
app.use('/payments', paymentRoutes);

app.use('/api/gifts', giftRoutes);
app.use('/gifts', giftRoutes);

// Socket.io logic
const User = require('./models/User');

io.on('connection', (socket) => {
  console.log('--- New Socket Connection ---');
  
  socket.on('join', async (userId) => {
    if (!userId) return;
    socket.join(userId);
    onlineUsers.set(userId, socket.id);
    
    // Set Active immediately
    await User.findByIdAndUpdate(userId, { isOnline: true });
    
    const allOnlineUsers = await User.find({ isOnline: true }).select('_id').lean();
    socket.emit('initialOnlineUsers', allOnlineUsers.map(u => u._id.toString()));
    io.emit('userOnline', userId);
    
    console.log(`User Active: ${userId}`);
  });

  socket.on('profileUpdated', (updatedUser) => {
    console.log(`Profile Updated Broadcast for user: ${updatedUser._id}`);
    io.emit('profileUpdated', updatedUser);
  });

  // Live Stream Socket Handlers
  socket.on('startLive', async ({ userId, name }) => {
    if (!userId) return;
    console.log(`[Socket] User ${name} (${userId}) started streaming live.`);
    socket.join(`live:${userId}`);
    await User.findByIdAndUpdate(userId, { isLive: true });
    io.emit('liveStreamStarted', { userId, name, timestamp: new Date() });
  });

  socket.on('joinLive', ({ streamUserId, viewerId, viewerName }) => {
    if (!streamUserId) return;
    console.log(`[Socket] Viewer ${viewerName} joined stream of ${streamUserId}`);
    socket.join(`live:${streamUserId}`);
    io.to(`live:${streamUserId}`).emit('viewerJoined', { viewerId, name: viewerName, timestamp: new Date() });
  });

  socket.on('sendLiveComment', ({ streamUserId, senderId, senderName, comment }) => {
    if (!streamUserId) return;
    console.log(`[Socket] Live Comment from ${senderName} on stream ${streamUserId}: ${comment}`);
    io.to(`live:${streamUserId}`).emit('newLiveComment', {
      senderId,
      senderName,
      comment,
      timestamp: new Date()
    });
  });

  socket.on('sendLiveReaction', ({ streamUserId, type }) => {
    if (!streamUserId) return;
    io.to(`live:${streamUserId}`).emit('newLiveReaction', {
      type: type || 'heart',
      timestamp: new Date()
    });
  });

  socket.on('stopLive', async ({ userId }) => {
    if (!userId) return;
    console.log(`[Socket] User (${userId}) stopped streaming live.`);
    socket.leave(`live:${userId}`);
    await User.findByIdAndUpdate(userId, { isLive: false });
    io.emit('liveStreamEnded', { userId, timestamp: new Date() });
  });

  socket.on('typing', (data) => {
    // data: { senderId, receiverId, isTyping }
    io.to(data.receiverId).emit('userTyping', data);
  });

  socket.on('sendMessage', async (data) => {
    const { receiver, receiverId } = data;
    const targetId = receiverId || receiver;
    io.to(targetId).emit('receiveMessage', data);
  });

  socket.on('messagesSeen', (data) => {
    // data: { senderId (who saw), receiverId (who sent) }
    io.to(data.receiverId).emit('messagesSeen', { seenBy: data.senderId });
  });

  socket.on('disconnect', async () => {
    let disconnectedUserId = null;
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        break;
      }
    }
    
    if (disconnectedUserId) {
      onlineUsers.delete(disconnectedUserId);
      // Check if user was live to properly end stream for viewers
      const dbUser = await User.findById(disconnectedUserId);
      if (dbUser && dbUser.isLive) {
        dbUser.isLive = false;
        await dbUser.save();
        io.emit('liveStreamEnded', { userId: disconnectedUserId, timestamp: new Date() });
      }

      await User.findByIdAndUpdate(disconnectedUserId, { 
        isOnline: false,
        lastSeen: new Date()
      });
      io.emit('userStatusChanged', { userId: disconnectedUserId, isOnline: false });
      console.log(`User Offline: ${disconnectedUserId}`);
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to Database
if (process.env.VERCEL) {
  // In serverless (Vercel), just connect to DB once
  connectDB();
} else {
  connectDB().then(async () => {
    try {
      const User = require('./models/User');
      await User.updateMany({ likesCount: { $lt: 1000 } }, { $set: { likesCount: 1000 } });
      console.log('Likes migration: All existing users updated to minimum 1000 likes.');
    } catch (err) {
      console.log('Likes migration error:', err);
    }
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}

module.exports = app;
