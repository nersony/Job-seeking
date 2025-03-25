// frontend/src/screens/CalendlyCallbackScreen.js
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

/**
 * This component handles the OAuth callback from Calendly
 * It expects a 'token' query parameter that contains a JWT token
 */
const CalendlyCallbackScreen = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        
        if (!token) {
          setError('No authentication token received from Calendly');
          setLoading(false);
          return;
        }
        
        // Store the token in localStorage
        localStorage.setItem('token', token);
        
        // IMPORTANT: Don't call login() here directly because it's triggering
        // another authentication flow. Instead:
        
        // Get user data directly using the token
        try {
          const response = await fetch('/api/users/profile', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch user data: ${response.statusText}`);
          }
          
          const userData = await response.json();
          
          // Update auth context
          if (login && typeof login === 'function') {
            // Instead of calling login with credentials, set the user directly
            // or use a special method to set the authenticated user from token
            login(null, null, token, userData.user);
            // ^ Modify your login function to accept this signature
          }
          
          // Redirect to profile page
          setTimeout(() => {
            navigate('/profile', { 
              state: { calendarConnected: true }
            });
          }, 2000);
        } catch (profileError) {
          console.error('Profile fetch error:', profileError);
          setError('Error fetching user profile');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error handling Calendly callback:', error);
        setError('An error occurred while connecting your Calendly account');
        setLoading(false);
      }
    };
    
    handleCallback();
  }, [location, navigate, login]);
  
  return (
    <Container>
      <Row className="justify-content-md-center mt-5">
        <Col md={6}>
          <Card>
            <Card.Body className="text-center">
              <h2>Connecting your Calendly account</h2>
              
              {loading ? (
                <>
                  <Spinner animation="border" role="status" className="my-4" />
                  <p>Please wait while we finalize the connection with your Calendly account...</p>
                </>
              ) : error ? (
                <Alert variant="danger">
                  {error}
                  <div className="mt-3">
                    <a href="/profile" className="btn btn-primary">Go to Profile</a>
                  </div>
                </Alert>
              ) : (
                <Alert variant="success">
                  <p>Your Calendly account has been successfully connected!</p>
                  <p>You'll be redirected to your profile in a moment...</p>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CalendlyCallbackScreen;