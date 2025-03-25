// Sample implementation for improved error handling in controllers
// This should be applied to all controller methods that use refreshToken

// backend/controllers/improvedTokenRefresh.js

/**
 * Safe token refresh helper function
 * @param {Object} jobseeker - Jobseeker document
 * @return {Promise<boolean>} Success status
 */
const safeRefreshToken = async (jobseeker) => {
    if (!jobseeker.calendlyRefreshToken) {
      return false;
    }
    
    try {
      const CalendlyService = require('../services/calendlyService');
      const tokenData = await CalendlyService.refreshToken(jobseeker.calendlyRefreshToken);
      
      // Update the tokens in jobseeker document
      jobseeker.calendlyAccessToken = tokenData.access_token;
      jobseeker.calendlyRefreshToken = tokenData.refresh_token || jobseeker.calendlyRefreshToken;
      jobseeker.calendlyTokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
      await jobseeker.save();
      
      return true;
    } catch (error) {
      console.error('Safe token refresh failed:', error);
      
      // Important: Don't clear tokens on refresh failure
      // This prevents the user from being automatically logged out
      // Instead, we'll mark the token as requiring manual reconnection
      jobseeker.calendlyTokenNeedsManualRefresh = true;
      await jobseeker.save();
      
      return false;
    }
  };
  
  /**
   * Example implementation in a controller method
   */
  exports.exampleControllerMethod = async (req, res) => {
    try {
      // Get jobseeker profile
      const jobseeker = await Jobseeker.findOne({ user: req.user._id });
      
      if (!jobseeker) {
        return res.status(404).json({
          success: false,
          message: 'Jobseeker profile not found'
        });
      }
      
      // Check if token refresh is needed
      let needsManualReconnect = false;
      
      if (jobseeker.calendlyTokenExpiry && new Date(jobseeker.calendlyTokenExpiry) <= new Date()) {
        // Token is expired, attempt refresh
        const refreshSuccess = await safeRefreshToken(jobseeker);
        
        if (!refreshSuccess) {
          needsManualReconnect = true;
          
          // Return a clear message but don't prevent accessing the rest of the functionality
          // This allows the user to still use the app even if Calendly needs reconnection
          return res.status(401).json({
            success: false,
            message: 'Your Calendly connection needs to be refreshed. Please visit your profile to reconnect.',
            needsReconnect: true,
            code: 'CALENDLY_NEEDS_RECONNECT'
          });
        }
      }
      
      // If token is marked for manual refresh, prompt reconnection
      if (jobseeker.calendlyTokenNeedsManualRefresh) {
        return res.status(401).json({
          success: false,
          message: 'Your Calendly connection needs to be refreshed. Please visit your profile to reconnect.',
          needsReconnect: true,
          code: 'CALENDLY_NEEDS_RECONNECT'
        });
      }
      
      // Rest of controller method...
      
      // Success response
      res.json({
        success: true,
        // data...
      });
    } catch (error) {
      console.error('Controller error:', error);
      
      // Enhanced error handling
      if (error.message === 'Failed to refresh Calendly token') {
        // Specific error for token refresh failures
        return res.status(401).json({
          success: false,
          message: 'Your Calendly connection needs to be refreshed. Please visit your profile to reconnect.',
          needsReconnect: true,
          code: 'CALENDLY_NEEDS_RECONNECT'
        });
      }
      
      // Generic server error
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  };