// frontend/src/components/JobseekerCalendlySettings.js
import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, ListGroup, Spinner, Badge } from 'react-bootstrap';
import { FaCalendarAlt, FaLink, FaUnlink, FaSync } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const JobseekerCalendlySettings = () => {
  const [loading, setLoading] = useState(false);
  const [eventTypes, setEventTypes] = useState([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { API, currentUser } = useAuth();

  useEffect(() => {
    fetchCalendlyData();
  }, []);

  const fetchCalendlyData = async () => {
    try {
      setLoading(true);
      
      // First check if user profile has Calendly data
      const profileRes = await API.get('/users/profile');
      const jobseekerProfile = profileRes.data.user.jobseekerProfile;
      
      if (jobseekerProfile && jobseekerProfile.calendlyAccessToken) {
        setIsConnected(true);
        
        // Fetch event types
        try {
          const eventTypesRes = await API.get('/calendly/event-types');
          setEventTypes(eventTypesRes.data.eventTypes);
          
          // Set selected event types from profile
          if (jobseekerProfile.selectedEventTypes) {
            setSelectedEventTypes(jobseekerProfile.selectedEventTypes);
          }
        } catch (apiError) {
          if (apiError.response && apiError.response.data.needsRefresh) {
            // Token needs refresh
            await refreshToken();
            
            // Try again after refresh
            const retryRes = await API.get('/calendly/event-types');
            setEventTypes(retryRes.data.eventTypes);
          } else {
            throw apiError;
          }
        }
      } else {
        setIsConnected(false);
      }
      
      setError('');
    } catch (error) {
      console.error('Error fetching Calendly data:', error);
      setError('Failed to load Calendly data. Please try reconnecting your account.');
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      setIsRefreshing(true);
      await API.post('/calendly/auth/refresh');
      setIsRefreshing(false);
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      setError('Failed to refresh token. Please reconnect your Calendly account.');
      setIsRefreshing(false);
      return false;
    }
  };

  const handleConnectCalendly = async () => {
    try {
      const res = await API.get(`/calendly/auth/url?userId=${currentUser._id}`);
      window.location.href = res.data.authUrl;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      setError('Failed to connect to Calendly. Please try again.');
    }
  };

  const handleDisconnectCalendly = async () => {
    try {
      setLoading(true);
      await API.delete('/calendly/auth/disconnect');
      
      setIsConnected(false);
      setEventTypes([]);
      setSelectedEventTypes([]);
      setSuccess('Calendly account disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Calendly:', error);
      setError('Failed to disconnect Calendly account');
    } finally {
      setLoading(false);
    }
  };

  const handleEventTypeSelection = (eventTypeUri) => {
    const updatedSelection = selectedEventTypes.includes(eventTypeUri)
      ? selectedEventTypes.filter(uri => uri !== eventTypeUri)
      : [...selectedEventTypes, eventTypeUri];
    
    setSelectedEventTypes(updatedSelection);
  };

  const saveSelectedEventTypes = async () => {
    try {
      setLoading(true);
      await API.put('/calendly/selected-events', {
        selectedEventTypeUris: selectedEventTypes
      });
      
      setSuccess('Selected event types updated successfully');
      setError('');
    } catch (error) {
      console.error('Error saving selected event types:', error);
      setError('Failed to update selected event types');
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeDuration = (eventType) => {
    if (!eventType.duration) return 'N/A';
    
    // Duration is in minutes
    const minutes = eventType.duration;
    
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? 
        `${hours} hr ${remainingMinutes} min` : 
        `${hours} hr`;
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header className="bg-primary text-white">
        <div className="d-flex align-items-center">
          <FaCalendarAlt className="me-2" />
          <h4 className="mb-0">Calendly Integration</h4>
        </div>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        {loading ? (
          <div className="text-center my-4">
            <Spinner animation="border" role="status" variant="primary" />
            <p className="mt-2">Loading Calendly data...</p>
          </div>
        ) : isConnected ? (
          <>
            <Alert variant="success">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Connected to Calendly</strong>
                  <p className="mb-0">Your Calendly account is connected. You can now manage your event types.</p>
                </div>
                <div>
                  <Button 
                    variant="outline-danger" 
                    onClick={handleDisconnectCalendly}
                    disabled={loading}
                  >
                    <FaUnlink className="me-2" />
                    Disconnect
                  </Button>
                </div>
              </div>
            </Alert>
            
            <div className="mb-4">
              <h5>Select Event Types to Display</h5>
              <p className="text-muted">
                Choose which event types clients can book. Only selected event types will be visible to clients.
              </p>
              
              {isRefreshing ? (
                <div className="text-center my-2">
                  <Spinner animation="border" role="status" size="sm" />
                  <span className="ms-2">Refreshing token...</span>
                </div>
              ) : (
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="mb-3"
                  onClick={refreshToken}
                >
                  <FaSync className="me-2" />
                  Refresh Token
                </Button>
              )}
              
              {eventTypes.length === 0 ? (
                <Alert variant="info">
                  No event types found. Please create event types in your Calendly account.
                </Alert>
              ) : (
                <>
                  <ListGroup className="mb-3">
                    {eventTypes.map(eventType => (
                      <ListGroup.Item key={eventType.uri}>
                        <Form.Check
                          type="checkbox"
                          id={`event-type-${eventType.uri}`}
                          label={
                            <div>
                              <strong>{eventType.name}</strong>
                              <Badge bg="info" className="ms-2">
                                {getEventTypeDuration(eventType)}
                              </Badge>
                              <div className="text-muted small">
                                {eventType.description || 'No description'}
                              </div>
                            </div>
                          }
                          checked={selectedEventTypes.includes(eventType.uri)}
                          onChange={() => handleEventTypeSelection(eventType.uri)}
                          className="custom-checkbox"
                        />
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                  
                  <Button 
                    variant="primary" 
                    onClick={saveSelectedEventTypes}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Event Type Settings'}
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="text-center">
            <p>Connect your Calendly account to manage your availability and let clients book appointments with you.</p>
            <Button 
              variant="primary" 
              onClick={handleConnectCalendly}
              disabled={loading}
              size="lg"
            >
              <FaLink className="me-2" />
              Connect Calendly Account
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default JobseekerCalendlySettings;