const express = require('express');
const router = express.Router();
const { sendMessage, getMessages, getChatList, markAsSeen } = require('../controllers/chatController');
const auth = require('../middleware/auth');

router.post('/send', auth, sendMessage);
router.get('/messages/:otherUserId', auth, getMessages);
router.get('/', auth, getChatList);
router.put('/seen/:otherUserId', auth, markAsSeen);

module.exports = router;
