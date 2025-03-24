import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import axios from 'axios';

const PublicCalendlyAvailability = ({ calendlyLink }) => {
  const [eventData, setEventData] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPublicAvailability = async () => {
      try {
        setLoading(true);
        const encodedLink = encodeURIComponent(calendlyLink);
        const response = await axios.get(`/api/calendly/public-availability/${encodedLink}`);
        
        setEventData(response.data.event);
        setAvailability(response.data.availability);
        setError('');
      } catch (error) {
        console.error('Error fetching public availability:', error);
        setError('Could not load availability information');
      } finally {
        setLoading(false);
      }
    };

    if (calendlyLink) {
      fetchPublicAvailability();
    }
  }, [calendlyLink]);

  if (loading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading availability information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Could not load availability</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  if (!eventData || !availability) {
    return (
      <Alert variant="info">
        No availability information found for this provider.
      </Alert>
    );
  }

  // Format the availability data for display
  const formatAvailabilityData = () => {
    // This may need adjustment based on the actual API response
    const days = availability.days || [];
    
    return days.map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      }),
      hasAvailability: day.spots_available > 0,
      spotsAvailable: day.spots_available
    }));
  };

  const availabilityData = formatAvailabilityData();

  return (
    <Card className="mb-4">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">{eventData.name} - {eventData.duration} min</h5>
      </Card.Header>
      <Card.Body>
        {eventData.description && (
          <p className="text-muted mb-3">{eventData.description}</p>
        )}
        
        <h6 className="mb-3">Provider's Availability Overview</h6>
        
        <Row className="mb-3">
          {availabilityData.map((day, index) => (
            <Col key={index} md={4} className="mb-2">
              <Card className="h-100">
                <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                  <h6 className="mb-2">{day.date}</h6>
                  {day.hasAvailability ? (
                    <Badge bg="success">Available</Badge>
                  ) : (
                    <Badge bg="secondary">Not Available</Badge>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        
        <Alert variant="info" className="mb-0">
          <Alert.Heading size="sm">Booking Information</Alert.Heading>
          <p className="mb-0">
            This shows when the provider is generally available. To book a specific time, 
            please complete the booking process first.
          </p>
        </Alert>
      </Card.Body>
    </Card>
  );
};

export default PublicCalendlyAvailability;