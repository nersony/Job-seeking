import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const AvailabilityDisplay = ({ jobseeker }) => {
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { API } = useAuth();

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        // Encode the calendly link to use in the URL
        const encodedLink = encodeURIComponent(jobseeker.calendlyLink);
        const response = await API.get(`/calendly/availability/${encodedLink}`);
        setAvailability(response.data.availability);
        setError('');
      } catch (error) {
        console.error('Error fetching availability:', error);
        setError('Could not load availability information');
      } finally {
        setLoading(false);
      }
    };

    if (jobseeker && jobseeker.calendlyLink) {
      fetchAvailability();
    } else {
      setLoading(false);
      setError('No availability schedule has been set up');
    }
  }, [jobseeker, API]);

  // Group slots by day
  const groupAvailabilityByDay = (slots) => {
    const grouped = {};
    
    slots.forEach(slot => {
      const date = new Date(slot.start_time);
      const day = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      
      if (!grouped[day]) {
        grouped[day] = [];
      }
      
      grouped[day].push({
        startTime: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        endTime: new Date(slot.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      });
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status" variant="primary" />
        <p className="mt-2">Loading availability schedule...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="info">
        <Alert.Heading>Availability Information</Alert.Heading>
        <p>{error}</p>
        <p>Please contact the provider directly for their availability or use the Book Now button to start the booking process.</p>
      </Alert>
    );
  }

  if (!availability || !availability.availableSlots || availability.availableSlots.length === 0) {
    return (
      <Alert variant="info">
        <Alert.Heading>No Available Time Slots</Alert.Heading>
        <p>There are currently no available time slots in the next 7 days.</p>
        <p>Please check back later or contact the provider directly.</p>
      </Alert>
    );
  }

  const groupedSlots = groupAvailabilityByDay(availability.availableSlots);

  return (
    <div className="availability-display">
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">Available Time Slots</h5>
        </Card.Header>
        <Card.Body>
          <p className="text-muted mb-3">
            These are {jobseeker.user.name}'s available time slots for the next 7 days.
            To book a specific time, please create a booking first.
          </p>
          
          <Row>
            {Object.entries(groupedSlots).map(([day, timeSlots]) => (
              <Col md={6} lg={4} key={day} className="mb-3">
                <Card>
                  <Card.Header>
                    <strong>{day}</strong>
                  </Card.Header>
                  <Card.Body>
                    <ul className="list-unstyled mb-0">
                      {timeSlots.map((slot, index) => (
                        <li key={index} className="mb-1">
                          {slot.startTime} - {slot.endTime}
                        </li>
                      ))}
                    </ul>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          
          <Alert variant="info" className="mt-3">
            <i className="fas fa-info-circle me-2"></i>
            Duration: {availability.duration} minutes per session
          </Alert>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AvailabilityDisplay;