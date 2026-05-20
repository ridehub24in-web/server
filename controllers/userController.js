const User = require('../models/User');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // Allow all incoming fields from body to be updated (like pushToken, isOnline, etc.)
    const updateData = { ...req.body };
    
    if (req.file) {
      updateData.profilePhoto = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    
    // Ensure we don't accidentally update sensitive fields if they were in the body
    delete updateData.password;
    delete updateData.email;
    delete updateData.username;
    
    const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('-password');
    
    // Emit real-time profile update to all connected users
    const io = req.app.get('io');
    if (io) {
      io.emit('profileUpdated', user);
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { gender, country, city, interest } = req.query;
    const query = {};

    if (gender) query.gender = gender;
    if (country) query.country = { $regex: new RegExp(country, 'i') };
    if (city) query.city = { $regex: new RegExp(city, 'i') };
    if (interest) query.interests = { $in: [interest] };

    const users = await User.find(query).select('-password').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Use the stored likesCount for performance
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.uploadGalleryImage = async (req, res) => {
  try {
    const { imageUrl: bodyImageUrl } = req.body;
    let imageUrl = bodyImageUrl;

    if (!imageUrl && req.file) {
      imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    if (!imageUrl) return res.status(400).json({ message: 'No image provided' });
    
    const user = await User.findById(req.user.id).select('-password');
    if (user.images.length >= 9) {
      return res.status(400).json({ message: 'Maximum 9 images allowed' });
    }
    
    user.images.push(imageUrl);
    await user.save();
    
    // Emit real-time profile update to all connected users
    const io = req.app.get('io');
    if (io) {
      io.emit('profileUpdated', user);
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteGalleryImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const user = await User.findById(req.user.id).select('-password');
    user.images = user.images.filter(img => img !== imageUrl);
    await user.save();
    
    // Emit real-time profile update to all connected users
    const io = req.app.get('io');
    if (io) {
      io.emit('profileUpdated', user);
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.followUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    // Add target to current user's following list
    const currentUser = await User.findByIdAndUpdate(
      currentUserId,
      { $addToSet: { following: targetUserId } },
      { new: true }
    ).select('-password');

    // Add current user to target user's followers list
    const targetUser = await User.findByIdAndUpdate(
      targetUserId,
      { $addToSet: { followers: currentUserId } },
      { new: true }
    );

    // Emit real-time profile update to all connected users
    const io = req.app.get('io');
    if (io) {
      io.emit('profileUpdated', currentUser);
      io.emit('profileUpdated', targetUser);
    }

    res.json({ success: true, user: currentUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    // Remove target from current user's following list
    const currentUser = await User.findByIdAndUpdate(
      currentUserId,
      { $pull: { following: targetUserId } },
      { new: true }
    ).select('-password');

    // Remove current user from target user's followers list
    const targetUser = await User.findByIdAndUpdate(
      targetUserId,
      { $pull: { followers: currentUserId } },
      { new: true }
    );

    // Emit real-time profile update to all connected users
    const io = req.app.get('io');
    if (io) {
      io.emit('profileUpdated', currentUser);
      io.emit('profileUpdated', targetUser);
    }

    res.json({ success: true, user: currentUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleLiveStatus = async (req, res) => {
  try {
    const { isLive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { isLive: !!isLive },
      { new: true }
    ).select('-password');

    const io = req.app.get('io');
    if (io) {
      io.emit('profileUpdated', user);
      io.emit('liveStatusChanged', { userId: req.user.id, isLive: !!isLive, user });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getLiveUsers = async (req, res) => {
  try {
    const users = await User.find({ isLive: true }).select('-password').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
