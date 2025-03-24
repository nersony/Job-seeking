const User = require('../models/userModel');
const Jobseeker = require('../models/jobseekerModel');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role
    });

    if (user) {
      // If user is a jobseeker, create jobseeker profile
      if (role === 'jobseeker') {
        const { serviceCategory, hourlyRate } = req.body;
        
        if (!serviceCategory || !hourlyRate) {
          return res.status(400).json({
            success: false,
            message: 'Jobseekers must provide service category and hourly rate'
          });
        }
        
        await Jobseeker.create({
          user: user._id,
          serviceCategory,
          hourlyRate
        });
      }

      res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid user data'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      res.json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      let userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address
      };

      // If user is a jobseeker, include jobseeker profile
      if (user.role === 'jobseeker') {
        const jobseekerProfile = await Jobseeker.findOne({ user: user._id });
        if (jobseekerProfile) {
          userData.jobseekerProfile = jobseekerProfile;
        }
      }

      res.json({
        success: true,
        user: userData
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      
      if (req.body.address) {
        user.address = {
          ...user.address,
          ...req.body.address
        };
      }

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      // If user is a jobseeker and jobseeker profile data is provided
      if (user.role === 'jobseeker' && req.body.jobseekerProfile) {
        const jobseekerProfile = await Jobseeker.findOne({ user: user._id });
        
        if (jobseekerProfile) {
          const { bio, skills, hourlyRate, calendlyLink } = req.body.jobseekerProfile;
          
          jobseekerProfile.bio = bio || jobseekerProfile.bio;
          jobseekerProfile.hourlyRate = hourlyRate || jobseekerProfile.hourlyRate;
          jobseekerProfile.calendlyLink = calendlyLink || jobseekerProfile.calendlyLink;
          
          if (skills && Array.isArray(skills)) {
            jobseekerProfile.skills = skills;
          }
          
          await jobseekerProfile.save();
        }
      }

      res.json({
        success: true,
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          address: updatedUser.address
        },
        token: generateToken(updatedUser._id)
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      // If user is a jobseeker, delete jobseeker profile
      if (user.role === 'jobseeker') {
        await Jobseeker.findOneAndDelete({ user: user._id });
      }
      
      await user.remove();
      
      res.json({
        success: true,
        message: 'User removed'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};