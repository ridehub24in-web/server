const User = require('../models/User');
const Match = require('../models/Match');

exports.handleSwipe = async (req, res) => {
  try {
    const { targetUserId, direction } = req.body;
    const currentUser = await User.findById(req.user.id);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    if (direction === 'right') {
      // Increment total likes for targetUser if not already liked
      if (!currentUser.likedUsers.includes(targetUserId)) {
        await User.findByIdAndUpdate(targetUserId, { $inc: { likesCount: 1 } });
      }

      // Check if it's already a match
      if (targetUser.likedUsers.includes(currentUser._id)) {
        // It's a match!
        const match = new Match({ users: [currentUser._id, targetUserId] });
        await match.save();

        if (!currentUser.matches.includes(targetUserId)) currentUser.matches.push(targetUserId);
        if (!targetUser.matches.includes(currentUser._id)) targetUser.matches.push(currentUser._id);
        
        await currentUser.save();
        await targetUser.save();

        return res.status(201).json({ message: 'It is a match!', match });
      } else {
        if (!currentUser.likedUsers.includes(targetUserId)) {
          currentUser.likedUsers.push(targetUserId);
          await currentUser.save();
        }
        return res.json({ message: 'User liked' });
      }
    } else {
      // Left swipe
      if (!currentUser.dislikedUsers.includes(targetUserId)) {
        currentUser.dislikedUsers.push(targetUserId);
        await currentUser.save();
      }
      return res.json({ message: 'User disliked' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createMatch = async (req, res) => {
  // Existing createMatch logic (can be kept for compatibility or removed)
  req.body.direction = 'right';
  this.handleSwipe(req, res);
};

exports.getMatches = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('matches', 'name profilePhoto isOnline');
    res.json(user.matches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getLikedMe = async (req, res) => {
  try {
    const users = await User.find({ likedUsers: req.user.id }).select('name profilePhoto city age');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
