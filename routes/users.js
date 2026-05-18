const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getUsers, getUserById, uploadGalleryImage, deleteGalleryImage } = require('../controllers/userController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/profile', auth, getProfile);

// Support both form-data profile image upload and standard JSON profile updates
router.put('/update', auth, upload.single('profilePhoto'), updateProfile);

// Gallery upload routes matching client's multipart requests
router.post('/gallery/upload', auth, upload.single('image'), uploadGalleryImage);
router.post('/gallery/delete', auth, deleteGalleryImage);

// Backwards compatibility routes
router.post('/gallery', auth, upload.single('image'), uploadGalleryImage);
router.delete('/gallery', auth, deleteGalleryImage);

router.get('/all', auth, getUsers);
router.get('/:id', auth, getUserById);

module.exports = router;
