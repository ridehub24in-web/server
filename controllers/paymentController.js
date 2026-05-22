const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: "amount is required" });
    }

    const options = {
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      receipt: `order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    res.json({ 
      success: true, 
      order 
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

exports.verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      amount,
      method,
      upiApp
    } = req.body;
    
    const userId = req.user.id;

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
      senderId: userId,
      receiverId: userId, // Wallet top-up
      giftType: 'wallet_topup',
      amount: amount || 0,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: 'success',
      method,
      upiApp
    });
    await transaction.save();

    // 3. Add to user wallet
    const user = await User.findById(userId);
    if (amount) {
      user.wallet = (user.wallet || 0) + Number(amount);
      await user.save();
    }

    res.json({ success: true, message: "Payment verified successfully", transaction, wallet: user.wallet });
  } catch (err) {
    console.error('Payment verification failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
