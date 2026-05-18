const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { name, password, gender, country, city } = req.body;
    const email = req.body.email.toLowerCase();
    
    // Auto-generate username from email
    let username = email.split('@')[0] + Math.floor(Math.random() * 1000);

    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) return res.status(400).json({ message: 'User already exists with this email or username' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ 
      name, 
      username, 
      email, 
      password: hashedPassword,
      gender: gender || 'other',
      country: country || '',
      city: city || ''
    });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        name, 
        username, 
        email,
        gender: user.gender,
        country: user.country,
        city: user.city
      } 
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email.toLowerCase();
    console.log('Login attempt for:', email);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log('Login failed: User not found ->', email);
      return res.status(400).json({ message: 'Account not found. Please sign up first.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Login failed: Wrong password for ->', email);
      return res.status(400).json({ message: 'Incorrect password. Please try again.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        username: user.username, 
        email: user.email, 
        profilePhoto: user.profilePhoto,
        gender: user.gender,
        country: user.country,
        city: user.city
      } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message });
  }
};
