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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/swipe', swipeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/gifts', giftRoutes);

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
    
    const allOnlineUsers = await User.find({ isOnline: true }).select('_id');
    socket.emit('initialOnlineUsers', allOnlineUsers.map(u => u._id.toString()));
    io.emit('userOnline', userId);
    
    console.log(`User Active: ${userId}`);
  });

  socket.on('profileUpdated', (updatedUser) => {
    console.log(`Profile Updated Broadcast for user: ${updatedUser._id}`);
    io.emit('profileUpdated', updatedUser);
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
  connectDB().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}

module.exports = app;
