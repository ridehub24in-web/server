const express = require('express');
const router = express.Router();
const imagekit = require('../config/imagekit');
const auth = require('../middleware/auth');

// Get authentication parameters for client-side upload
router.get('/auth', auth, (req, res) => {
    try {
        const result = imagekit.getAuthenticationParameters();
        res.send(result);
    } catch (err) {
        res.status(500).json({ message: 'Error generating ImageKit auth parameters' });
    }
});

module.exports = router;
