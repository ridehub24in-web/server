const User = require('../models/User');
const Message = require('../models/Message');
const Transaction = require('../models/Transaction');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const GIFTS = [
  { id: 'heart', name: 'Free Heart', price: 0, icon: '❤️', category: 'Free' },
  { id: 'rose', name: 'Rose Gift', price: 100, icon: '🌹', category: 'Premium' },
  { id: 'diamond', name: 'Diamond Gift', price: 150, icon: '💎', category: 'Premium' },
  { id: 'crown', name: 'Crown/Taj Gift', price: 250, icon: '👑', category: 'Premium' },
];

exports.getGiftsList = (req, res) => {
  res.json(GIFTS);
};

// Step 1: Create Order for a specific gift
exports.createGiftOrder = async (req, res) => {
  try {
    const { giftId } = req.body;
    
    // Validation
    if (!giftId) {
      return res.status(400).json({ success: false, message: "giftId is required" });
    }

    const gift = GIFTS.find(g => g.id === giftId);
    if (!gift) {
      return res.status(400).json({ success: false, message: "Invalid gift type" });
    }

    if (gift.price === 0) {
      return res.status(400).json({ success: false, message: "Free gifts do not need orders" });
    }

    const options = {
      amount: gift.price * 100, // Amount in paise
      currency: 'INR',
      receipt: `gift_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    res.json({ 
      success: true, 
      order,
      gift 
    });
  } catch (err) {
    console.error('Order creation failed:', err);
    res.status(500).json({ 
      success: false, 
      message: "Order creation failed",
      error: err.message 
    });
  }
};

// Step 2: Verify Payment and Send Gift
exports.verifyAndSendGift = async (req, res) => {
  try {
    const { 
      receiverId, 
      giftId, 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      method,
      upiApp
    } = req.body;
    
    const senderId = req.user.id;
    const gift = GIFTS.find(g => g.id === giftId);

    // 1. Verify Signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // 2. Record Transaction
    const transaction = new Transaction({
      senderId,
      receiverId,
      giftType: gift.id,
      amount: gift.price,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: 'success',
      method,
      upiApp,
      giftIcon: gift.icon
    });
    await transaction.save();

    // 3. Process Gift (Add to receiver's history and send message)
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    receiver.receivedGifts.push({
      giftId: gift.id,
      name: gift.name,
      price: gift.price,
      senderId: senderId,
      createdAt: new Date()
    });
    await receiver.save();

    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content: `🎁 Sent you a ${gift.name}!`,
      type: 'gift',
      giftData: {
        ...gift,
        paymentId: razorpay_payment_id
      }
    });
    await message.save();

    // 4. Real-time emit
    const io = req.app.get('io');
    io.to(receiverId.toString()).emit('receiveMessage', message);
    io.to(receiverId.toString()).emit('giftReceived', { gift, senderName: sender.name });

    res.json({ message, transaction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Handle Free Gift Sending
exports.sendFreeGift = async (req, res) => {
  try {
    const { receiverId, giftId } = req.body;
    const senderId = req.user.id;
    const gift = GIFTS.find(g => g.id === giftId);

    if (!gift || gift.price > 0) return res.status(400).json({ message: 'Invalid free gift' });

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    receiver.receivedGifts.push({
      giftId: gift.id,
      name: gift.name,
      price: 0,
      senderId: senderId
    });
    await receiver.save();

    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content: `❤️ Sent a ${gift.name}`,
      type: 'gift',
      giftData: gift
    });
    await message.save();

    const io = req.app.get('io');
    io.to(receiverId.toString()).emit('receiveMessage', message);

    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getGiftHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const received = await Transaction.find({ receiverId: userId }).populate('senderId', 'name profilePhoto');
    const sent = await Transaction.find({ senderId: userId }).populate('receiverId', 'name profilePhoto');
    
    res.json({ received, sent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
