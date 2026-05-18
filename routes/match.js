const express = require('express');
const router = express.Router();
const { createMatch, getMatches, getLikedMe } = require('../controllers/matchController');
const auth = require('../middleware/auth');

router.post('/swipe', auth, createMatch);
router.get('/', auth, getMatches);
router.get('/liked-me', auth, getLikedMe);

module.exports = router;
