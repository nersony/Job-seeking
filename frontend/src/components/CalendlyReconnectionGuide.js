// frontend/src/components/CalendlyReconnectionGuide.js

import React, { useState } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import { FaCalendarAlt, FaLink, FaExternalLinkAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const CalendlyReconnectionGuide = ({ jobseekerProfile, onReconnectSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { API } = useAuth();

  const handleReconnect = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get auth URL for reconnection
      const res = await API.get(`/calendly/auth/url?userId=${jobseekerProfile.user}&reconnect=true`);
      
      // Open Calendly auth in new window
      window.location.href = res.data.authUrl;
    } catch (error) {
      console.error('Error generating reconnect URL:', error);
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : 'Failed to start reconnection process'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const clearReconnectFlag = () => {
    // Clear the reconnect flag in localStorage when reconnected successfully
    localStorage.removeItem('calendlyNeedsReconnect');
    
    // If a success callback was provided, call it
    if (onReconnectSuccess && typeof onReconnectSuccess === 'function') {
      onReconnectSuccess();
    }
  };
  
  // This function would be called when user returns from successful OAuth flow
  const handleReconnectSuccess = () => {
    setSuccess('Calendly account reconnected successfully!');
    clearReconnectFlag();
  };
  
  // Determine reconnection status
  const needsReconnect = localStorage.getItem('calendlyNeedsReconnect') === 'true' || 
                         (jobseekerProfile && jobseekerProfile.calendlyTokenNeedsManualRefresh);
  
  // If the profile has a valid token that's not expired, clear any reconnect flags
  if (jobseekerProfile && 
      jobseekerProfile.calendlyAccessToken && 
      jobseekerProfile.calendlyTokenExpiry && 
      new Date(jobseekerProfile.calendlyTokenExpiry) > new Date()) {
    
    if (localStorage.getItem('calendlyNeedsReconnect') === 'true') {
      clearReconnectFlag();
    }
  }
  
  if (!needsReconnect && !success) {
    // Don't show anything if no reconnection is needed and no success message
    return null;
  }
  
  return (
    <Card className="mb-4">
      <Card.Header className={success ? "bg-success text-white" : "bg-warning"}>
        <div className="d-flex align-items-center">
          <FaCalendarAlt className="me-2" />
          <h5 className="mb-0">
            {success ? "Calendly Connected" : "Calendly Connection Required"}
          </h5>
        </div>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}
        
        {success ? (
          <Alert variant="success">
            {success}
          </Alert>
        ) : (
          <>
            <p>
              Your Calendly connection has expired and needs to be refreshed. This is necessary to:
            </p>
            <ul>
              <li>Allow clients to see your availability</li>
              <li>Enable booking of appointments</li>
              <li>Keep your calendar in sync</li>
            </ul>
            
            <div className="d-grid">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleReconnect}
                disabled={loading}
              >
                <FaLink className="me-2" />
                {loading ? "Connecting..." : "Reconnect Calendly Account"}
              </Button>
            </div>
            
            <div className="mt-3 text-center">
              <small className="text-muted">
                You'll be redirected to Calendly to approve the connection
              </small>
            </div>
            
            <Alert variant="info" className="mt-4">
              <div className="d-flex">
                <div className="me-3">
                  <FaExternalLinkAlt />
                </div>
                <div>
                  <p className="mb-2">
                    <strong>Having trouble?</strong> You can also:
                  </p>
                  <p className="mb-0">
                    1. Go to <a href="https://calendly.com/app/settings" target="_blank" rel="noopener noreferrer">Calendly Settings</a><br />
                    2. Check your API & Webhooks integrations<br />
                    3. Reconnect manually through your profile
                  </p>
                </div>
              </div>
            </Alert>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default CalendlyReconnectionGuide;