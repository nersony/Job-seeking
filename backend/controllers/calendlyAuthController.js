// backend/controllers/calendlyAuthController.js
const axios = require('axios');
const User = require('../models/userModel');
const Jobseeker = require('../models/jobseekerModel');
const jwt = require('jsonwebtoken');

// Environment variables needed:
// CALENDLY_CLIENT_ID
// CALENDLY_CLIENT_SECRET
// CALENDLY_REDIRECT_URI (e.g. https://your-domain.com/api/calendly/oauth/callback)

/**
 * Generate Calendly OAuth URL for login
 * @route   GET /api/calendly/auth/url
 * @access  Public
 */
exports.getAuthUrl = async (req, res) => {
    try {
        const calendlyAuthUrl = `https://auth.calendly.com/oauth/authorize?client_id=${process.env.CALENDLY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.CALENDLY_REDIRECT_URI)}&state=${req.query.userId || ''}`;

        res.json({
            success: true,
            authUrl: calendlyAuthUrl
        });
    } catch (error) {
        console.error('Error generating Calendly auth URL:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate Calendly authentication URL'
        });
    }
};

/**
 * Handle Calendly OAuth callback
 * @route   GET /api/calendly/oauth/callback
 * @access  Public
 */
exports.handleOAuthCallback = async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Authorization code is missing'
            });
        }

        // Exchange code for token
        const tokenResponse = await axios.post('https://auth.calendly.com/oauth/token', {
            client_id: process.env.CALENDLY_CLIENT_ID,
            client_secret: process.env.CALENDLY_CLIENT_SECRET,
            code,
            redirect_uri: process.env.CALENDLY_REDIRECT_URI,
            grant_type: 'authorization_code'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // Get Calendly user info
        const userInfoResponse = await axios.get('https://api.calendly.com/users/me', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        const calendlyUser = userInfoResponse.data.resource;
        const calendlyUri = calendlyUser.uri;

        // Check if this Calendly account is already connected to another user
        const existingJobseeker = await Jobseeker.findOne({
            calendlyUri,
            user: { $ne: state ? state : null } // Not equal to the current user's ID
        });

        if (existingJobseeker) {
            // Find the user information for better error messages
            const existingUser = await User.findById(existingJobseeker.user);

            return res.redirect(
                `${process.env.FRONTEND_URL}/profile?error=${encodeURIComponent(
                    `This Calendly account is already connected to another user (${existingUser ? existingUser.name : 'Unknown'}). ` +
                    `Each Calendly account can only be connected to one user in our system.`
                )}`
            );
        }

        // Rest of your existing code to update the user's profile...
        // Find user by ID if state parameter contains userId
        let user;
        if (state) {
            user = await User.findById(state);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Update jobseeker profile
            const jobseeker = await Jobseeker.findOne({ user: user._id });

            if (jobseeker) {
                jobseeker.calendlyAccessToken = access_token;
                jobseeker.calendlyRefreshToken = refresh_token;
                jobseeker.calendlyTokenExpiry = new Date(Date.now() + expires_in * 1000);
                jobseeker.calendlyUri = calendlyUser.uri;
                jobseeker.calendlyLink = calendlyUser.scheduling_url;

                await jobseeker.save();
            }
        } else {
            // If no user ID in state, try to find user by email
            user = await User.findOne({ email: calendlyUser.email });
        }

        // Generate JWT token if user found
        if (user) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
                expiresIn: '30d'
            });

            // Redirect to frontend with token
            return res.redirect(`${process.env.FRONTEND_URL}/calendly-callback?token=${token}`);
        }

        // If no existing user, redirect to registration page with calendly data
        const calendlyData = Buffer.from(JSON.stringify({
            email: calendlyUser.email,
            name: calendlyUser.name,
            calendlyUri: calendlyUser.uri,
            calendlyLink: calendlyUser.scheduling_url,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: expires_in
        })).toString('base64');

        res.redirect(`${process.env.FRONTEND_URL}/register?calendlyData=${calendlyData}`);

    } catch (error) {
        console.error('Error handling Calendly OAuth callback:', error);
        res.status(500).json({
            success: false,
            message: 'Error connecting to Calendly'
        });
    }
};

/**
 * Refresh Calendly access token
 * @route   POST /api/calendly/auth/refresh
 * @access  Private/Jobseeker
 */
exports.refreshToken = async (req, res) => {
    try {
        const jobseeker = await Jobseeker.findOne({ user: req.user._id });

        if (!jobseeker || !jobseeker.calendlyRefreshToken) {
            return res.status(400).json({
                success: false,
                message: 'No refresh token available'
            });
        }

        const response = await axios.post('https://auth.calendly.com/oauth/token', {
            client_id: process.env.CALENDLY_CLIENT_ID,
            client_secret: process.env.CALENDLY_CLIENT_SECRET,
            refresh_token: jobseeker.calendlyRefreshToken,
            grant_type: 'refresh_token'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const { access_token, refresh_token, expires_in } = response.data;

        // Update tokens
        jobseeker.calendlyAccessToken = access_token;

        // Only update refresh token if a new one was provided
        if (refresh_token) {
            jobseeker.calendlyRefreshToken = refresh_token;
        }

        jobseeker.calendlyTokenExpiry = new Date(Date.now() + expires_in * 1000);
        await jobseeker.save();

        res.json({
            success: true,
            message: 'Token refreshed successfully'
        });

    } catch (error) {
        console.error('Error refreshing Calendly token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh token'
        });
    }
};

/**
 * Disconnect Calendly account
 * @route   DELETE /api/calendly/auth/disconnect
 * @access  Private/Jobseeker
 */
exports.disconnectCalendly = async (req, res) => {
    try {
        const jobseeker = await Jobseeker.findOne({ user: req.user._id });

        if (!jobseeker) {
            return res.status(404).json({
                success: false,
                message: 'Jobseeker profile not found'
            });
        }

        // Reset Calendly fields
        jobseeker.calendlyAccessToken = undefined;
        jobseeker.calendlyRefreshToken = undefined;
        jobseeker.calendlyTokenExpiry = undefined;
        jobseeker.calendlyUri = undefined;
        jobseeker.calendlyLink = undefined;

        await jobseeker.save();

        res.json({
            success: true,
            message: 'Calendly account disconnected successfully'
        });

    } catch (error) {
        console.error('Error disconnecting Calendly account:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disconnect Calendly account'
        });
    }
};