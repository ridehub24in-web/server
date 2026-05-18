const express = require('express');
const router = express.Router();
const { handleSwipe } = require('../controllers/matchController');
const auth = require('../middleware/auth');

router.post('/right', auth, (req, res) => {
  req.body.direction = 'right';
  handleSwipe(req, res);
});

router.post('/left', auth, (req, res) => {
  req.body.direction = 'left';
  handleSwipe(req, res);
});

module.exports = router;
