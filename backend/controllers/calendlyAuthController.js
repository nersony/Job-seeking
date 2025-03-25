// backend/controllers/calendlyAuthController.js (Updated)
const axios = require('axios');
const User = require('../models/userModel');
const Jobseeker = require('../models/jobseekerModel');
const CalendlyAvailability = require('../models/calendlyAvailabilityModel');
const jwt = require('jsonwebtoken');
const CalendlyService = require('../services/calendlyService');

/**
 * Generate Calendly OAuth URL for login
 * @route   GET /api/calendly/auth/url
 * @access  Public
 */
exports.getAuthUrl = async (req, res) => {
    try {
        // Check if this is a reconnection (token refresh) or a new connection
        const isReconnect = req.query.reconnect === 'true';
        
        // Build the state parameter - include userId and reconnect flag
        const stateObj = {
            userId: req.query.userId || '',
            isReconnect: isReconnect
        };
        
        // Encode state as base64 JSON string
        const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');
        
        // Generate the authorization URL with state parameter
        const calendlyAuthUrl = `https://auth.calendly.com/oauth/authorize?client_id=${process.env.CALENDLY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.CALENDLY_REDIRECT_URI)}&state=${state}`;

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

        // Decode state to get userId and reconnect flag
        let stateObj = {};
        try {
            stateObj = JSON.parse(Buffer.from(state, 'base64').toString());
        } catch (decodeError) {
            console.error('Error decoding state:', decodeError);
            // Fallback to treating state as just the userId for backward compatibility
            stateObj = { userId: state };
        }
        
        const { userId, isReconnect } = stateObj;

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

        // Handle reconnection case
        if (isReconnect && userId) {
            const user = await User.findById(userId);
            if (!user) {
                return res.redirect(
                    `${process.env.FRONTEND_URL}/profile?error=${encodeURIComponent(
                        'User not found for reconnection'
                    )}`
                );
            }
            
            // Update jobseeker profile for reconnection
            const jobseeker = await Jobseeker.findOne({ user: user._id });
            if (jobseeker) {
                // Validate that this is the same Calendly account
                if (jobseeker.calendlyUri && jobseeker.calendlyUri !== calendlyUri) {
                    return res.redirect(
                        `${process.env.FRONTEND_URL}/profile?error=${encodeURIComponent(
                            'This is a different Calendly account than the one previously connected. Please use the same account.'
                        )}`
                    );
                }
                
                // Update the tokens
                jobseeker.calendlyAccessToken = access_token;
                jobseeker.calendlyRefreshToken = refresh_token;
                jobseeker.calendlyTokenExpiry = new Date(Date.now() + expires_in * 1000);
                jobseeker.calendlyUri = calendlyUri;
                jobseeker.calendlyLink = calendlyUser.scheduling_url;
                jobseeker.calendlyEmailAddress = calendlyUser.email;
                // Clear any manual refresh flags
                jobseeker.calendlyTokenNeedsManualRefresh = false;
                
                await jobseeker.save();
                
                // Trigger a sync of the availability
                try {
                    // Get weekly availability
                    const availabilityResult = await CalendlyService.getWeeklyAvailability(
                        access_token,
                        calendlyUri
                    );
                    
                    // Find or create availability record
                    let availabilityRecord = await CalendlyAvailability.findOne({ jobseeker: jobseeker._id });
                    if (!availabilityRecord) {
                        availabilityRecord = new CalendlyAvailability({
                            jobseeker: jobseeker._id,
                            scheduleUri: 'reconnect-sync',
                            scheduleName: availabilityResult.scheduleName,
                            weeklyAvailability: availabilityResult.availability,
                            lastUpdated: new Date()
                        });
                    } else {
                        availabilityRecord.scheduleName = availabilityResult.scheduleName;
                        availabilityRecord.weeklyAvailability = availabilityResult.availability;
                        availabilityRecord.lastUpdated = new Date();
                    }
                    await availabilityRecord.save();
                    
                    // Update jobseeker's hasWeeklyAvailability flag
                    const hasAvailability = Object.values(availabilityResult.availability).some(
                        daySlots => daySlots && daySlots.length > 0
                    );
                    
                    jobseeker.hasWeeklyAvailability = hasAvailability;
                    await jobseeker.save();
                } catch (syncError) {
                    console.error('Error syncing availability after reconnect:', syncError);
                    // Continue anyway - we've at least updated the tokens
                }
                
                // Generate JWT token for authentication
                const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
                    expiresIn: '30d'
                });
                
                // Redirect to frontend with success message and token
                return res.redirect(
                    `${process.env.FRONTEND_URL}/profile?reconnectSuccess=true&token=${token}`
                );
            } else {
                return res.redirect(
                    `${process.env.FRONTEND_URL}/profile?error=${encodeURIComponent(
                        'Jobseeker profile not found'
                    )}`
                );
            }
        }

        // Regular flow (not reconnection) continues from here...
        // Check if this Calendly account is already connected to another user
        const existingJobseeker = await Jobseeker.findOne({
            calendlyUri,
            user: { $ne: userId ? userId : null } // Not equal to the current user's ID
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

        // Find user by ID if state parameter contains userId
        let user;
        if (userId) {
            user = await User.findById(userId);

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
                jobseeker.calendlyEmailAddress = calendlyUser.email;
                // Clear any manual refresh flags
                jobseeker.calendlyTokenNeedsManualRefresh = false;

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
        res.redirect(
            `${process.env.FRONTEND_URL}/profile?error=${encodeURIComponent(
                'Error connecting to Calendly. Please try again.'
            )}`
        );
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

        try {
            // Use the service method for token refresh
            const response = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);
            
            // Update tokens in database
            jobseeker.calendlyAccessToken = response.access_token;
            
            // Only update refresh token if a new one was provided
            if (response.refresh_token) {
                jobseeker.calendlyRefreshToken = response.refresh_token;
            }
            
            jobseeker.calendlyTokenExpiry = new Date(Date.now() + response.expires_in * 1000);
            
            // Clear manual refresh flag if present
            if (jobseeker.calendlyTokenNeedsManualRefresh) {
                jobseeker.calendlyTokenNeedsManualRefresh = false;
            }
            
            await jobseeker.save();
            
            res.json({
                success: true,
                message: 'Token refreshed successfully'
            });
        } catch (refreshError) {
            console.error('Error in CalendlyService.refreshToken:', refreshError);
            
            // Set a flag that this token needs manual reconnection
            jobseeker.calendlyTokenNeedsManualRefresh = true;
            await jobseeker.save();
            
            // Return a clear error message
            return res.status(401).json({
                success: false,
                message: 'Calendly authentication expired. Please reconnect your account.',
                needsReconnect: true,
                code: 'CALENDLY_NEEDS_RECONNECT'
            });
        }
    } catch (error) {
        console.error('Error refreshing Calendly token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh token',
            error: error.message
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
        jobseeker.calendlyTokenNeedsManualRefresh = undefined;
        jobseeker.calendlyEmailAddress = undefined;
        jobseeker.hasWeeklyAvailability = false;

        await jobseeker.save();
        
        // Remove availability data
        await CalendlyAvailability.deleteOne({ jobseeker: jobseeker._id });

        res.json({
            success: true,
            message: 'Calendly account disconnected successfully'
        });
    } catch (error) {
        console.error('Error disconnecting Calendly account:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disconnect Calendly account',
            error: error.message
        });
    }
};

/**
 * Check Calendly connection status
 * @route   GET /api/calendly/auth/status
 * @access  Private/Jobseeker
 */
exports.checkConnectionStatus = async (req, res) => {
    try {
        const jobseeker = await Jobseeker.findOne({ user: req.user._id });

        if (!jobseeker) {
            return res.status(404).json({
                success: false,
                message: 'Jobseeker profile not found'
            });
        }

        // Check if Calendly is connected
        const isConnected = !!jobseeker.calendlyAccessToken && !!jobseeker.calendlyUri;
        
        // Check if token is expired
        let isExpired = false;
        let needsReconnect = false;
        
        if (isConnected) {
            if (jobseeker.calendlyTokenNeedsManualRefresh) {
                needsReconnect = true;
            } else if (jobseeker.calendlyTokenExpiry) {
                isExpired = new Date(jobseeker.calendlyTokenExpiry) <= new Date();
                
                // If expired, try to refresh token automatically
                if (isExpired && jobseeker.calendlyRefreshToken) {
                    try {
                        const response = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);
                        
                        // Update tokens
                        jobseeker.calendlyAccessToken = response.access_token;
                        if (response.refresh_token) {
                            jobseeker.calendlyRefreshToken = response.refresh_token;
                        }
                        jobseeker.calendlyTokenExpiry = new Date(Date.now() + response.expires_in * 1000);
                        await jobseeker.save();
                        
                        // Token refreshed successfully
                        isExpired = false;
                    } catch (refreshError) {
                        console.error('Error refreshing token during status check:', refreshError);
                        needsReconnect = true;
                        
                        // Mark token as needing manual reconnection
                        jobseeker.calendlyTokenNeedsManualRefresh = true;
                        await jobseeker.save();
                    }
                }
            }
        }

        res.json({
            success: true,
            isConnected,
            isExpired,
            needsReconnect,
            calendlyEmail: jobseeker.calendlyEmailAddress,
            calendlyLink: jobseeker.calendlyLink,
            hasAvailabilityData: jobseeker.hasWeeklyAvailability
        });
    } catch (error) {
        console.error('Error checking Calendly connection status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check Calendly connection status',
            error: error.message
        });
    }
};