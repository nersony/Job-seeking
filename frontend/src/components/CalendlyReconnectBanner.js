import React, { useState, useEffect } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const CalendlyReconnectBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  
  // Check for reconnect status on mount and on localStorage changes
  useEffect(() => {
    const checkReconnectStatus = () => {
      const needsReconnect = localStorage.getItem('calendlyNeedsReconnect') === 'true';
      setShowBanner(needsReconnect);
    };
    
    // Check on initial mount
    checkReconnectStatus();
    
    // Listen for the custom event
    const handleReconnectEvent = () => {
      setShowBanner(true);
    };
    
    window.addEventListener('calendlyNeedsReconnect', handleReconnectEvent);
    
    // Clean up
    return () => {
      window.removeEventListener('calendlyNeedsReconnect', handleReconnectEvent);
    };
  }, []);
  
  const dismissBanner = () => {
    setShowBanner(false);
    // Don't clear localStorage here - only clear when reconnected successfully
  };
  
  if (!showBanner) return null;
  
  return (
    <Alert variant="warning" className="mb-0">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <strong>Calendly Connection Needs Refresh</strong>
          <p className="mb-0">Your Calendly connection has expired. Please reconnect to continue managing your availability.</p>
        </div>
        <div>
          <Link to="/profile">
            <Button variant="outline-primary" size="sm" className="me-2">
              Reconnect Calendly
            </Button>
          </Link>
          <Button variant="outline-secondary" size="sm" onClick={dismissBanner}>
            Dismiss
          </Button>
        </div>
      </div>
    </Alert>
  );
};

export default CalendlyReconnectBanner;