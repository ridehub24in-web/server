const Message = require('../models/Message');
const User = require('../models/User');
const axios = require('axios');
const mongoose = require('mongoose');

exports.sendMessage = async (req, res) => {
  try {
    console.log('--- SendMessage Request ---');
    console.log('Body:', req.body);
    console.log('File:', req.file);

    const { receiverId, content } = req.body;
    
    if (!receiverId) {
      console.error('SendMessage Error: Missing receiverId');
      return res.status(400).json({ message: 'Receiver ID is required' });
    }

    const io = req.app.get('io');

    const message = new Message({
      sender: req.user.id,
      receiver: receiverId,
      content
    });
    await message.save();

    // Populate sender info for the socket event
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name profilePhoto');

    if (!populatedMessage) {
      return res.status(500).json({ message: 'Error saving message' });
    }

    // Emit real-time message via socket
    // Emit to both sender and receiver rooms to ensure all devices are synced
    io.to(receiverId).emit('receiveMessage', populatedMessage);
    io.to(req.user.id).emit('receiveMessage', populatedMessage);

    // Emit specialized notification event for the receiver
    io.to(receiverId).emit('messageNotification', {
      senderName: populatedMessage.sender.name,
      senderPhoto: populatedMessage.sender.profilePhoto,
      content: content || 'Sent an image',
      timestamp: populatedMessage.createdAt,
      messageId: populatedMessage._id,
      senderId: req.user.id
    });
    
    console.log(`Server: Syncing message and notification between ${req.user.id} and ${receiverId}`);

    // SEND EXPO PUSH NOTIFICATION (Background)
    const trySendPush = async () => {
      try {
        const receiver = await User.findById(receiverId);
        if (receiver && receiver.pushToken) {
          await axios.post('https://exp.host/--/api/v2/push/send', {
            to: receiver.pushToken,
            title: populatedMessage.sender.name,
            body: content || 'Sent an image',
            data: { senderId: req.user.id },
            sound: 'default',
          });
          console.log('Push notification sent to:', receiver.pushToken);
        }
      } catch (pushErr) {
        console.error('Error sending push notification', pushErr.message);
      }
    };
    trySendPush();

    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('SendMessage Error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: 'Invalid User ID' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.user.id }
      ]
    }).sort('createdAt');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getChatList = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }]
    })
    .sort('-createdAt')
    .populate('sender receiver', 'name profilePhoto');

    const chatMap = new Map();
    
    // Get unread counts
    const unreadCounts = await Message.aggregate([
      { $match: { receiver: new mongoose.Types.ObjectId(req.user.id), seen: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } }
    ]);
    
    const unreadMap = new Map(unreadCounts.map(u => [u._id.toString(), u.count]));

    messages.forEach(msg => {
      if (!msg.sender || !msg.receiver) return;
      
      const otherUser = msg.sender._id.toString() === req.user.id ? msg.receiver : msg.sender;
      if (!chatMap.has(otherUser._id.toString())) {
        chatMap.set(otherUser._id.toString(), {
          recipient: otherUser,
          lastMessage: msg,
          unreadCount: unreadMap.get(otherUser._id.toString()) || 0
        });
      }
    });

    res.json(Array.from(chatMap.values()));
  } catch (err) {
    console.error('GetChatList Error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.markAsSeen = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    await Message.updateMany(
      { sender: otherUserId, receiver: req.user.id, seen: false },
      { $set: { seen: true } }
    );

    // Notify the sender that their messages were seen
    const io = req.app.get('io');
    io.to(otherUserId).emit('messagesSeen', { seenBy: req.user.id });

    res.json({ message: 'Messages marked as seen' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
