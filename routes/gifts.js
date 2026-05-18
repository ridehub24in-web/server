const express = require('express');
const router = express.Router();
const { 
  getGiftsList, 
  createGiftOrder, 
  verifyAndSendGift, 
  sendFreeGift, 
  getGiftHistory 
} = require('../controllers/giftController');
const auth = require('../middleware/auth');

router.get('/list', auth, getGiftsList);
router.post('/create-order', auth, createGiftOrder);
router.post('/verify', auth, verifyAndSendGift);
router.post('/send-free', auth, sendFreeGift);
router.get('/history', auth, getGiftHistory);

module.exports = router;
