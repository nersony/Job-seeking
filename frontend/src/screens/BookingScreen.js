import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Form, Button, Card, ListGroup } from 'react-bootstrap';
import { FaCalendarAlt, FaMapMarkerAlt, FaClock, FaDollarSign } from 'react-icons/fa';
import Message from '../components/Message';
import Loader from '../components/Loader';
import FormContainer from '../components/FormContainer';
import { useAuth } from '../contexts/AuthContext';

const BookingScreen = () => {
  const [jobseeker, setJobseeker] = useState(null);
  const [bookingData, setBookingData] = useState({
    startTime: '',
    endTime: '',
    location: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { API, currentUser } = useAuth();

  useEffect(() => {
    // Redirect if user is not an end user
    if (currentUser && currentUser.role !== 'enduser') {
      navigate('/');
      return;
    }

    const fetchJobseekerDetails = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/jobseekers/${id}`);
        setJobseeker(res.data.jobseeker);
        setError('');
      } catch (error) {
        console.error('Error fetching jobseeker details:', error);
        setError(
          error.response && error.response.data.message
            ? error.response.data.message
            : 'Failed to load jobseeker details'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchJobseekerDetails();
  }, [id, API, currentUser, navigate]);

  useEffect(() => {
    // Calculate total amount when start time or end time changes
    if (jobseeker && bookingData.startTime && bookingData.endTime) {
      const start = new Date(bookingData.startTime);
      const end = new Date(bookingData.endTime);
      
      // Calculate duration in hours
      const durationHours = (end - start) / (1000 * 60 * 60);
      
      if (durationHours > 0) {
        const amount = jobseeker.hourlyRate * durationHours;
        setTotalAmount(amount.toFixed(2));
      } else {
        setTotalAmount(0);
      }
    } else {
      setTotalAmount(0);
    }
  }, [bookingData.startTime, bookingData.endTime, jobseeker]);

  const handleInputChange = (e) => {
    setBookingData({ ...bookingData, [e.target.name]: e.target.value });
  };

  const validateBookingData = () => {
    if (!bookingData.startTime || !bookingData.endTime || !bookingData.location) {
      setError('Please fill in all required fields');
      return false;
    }

    const start = new Date(bookingData.startTime);
    const end = new Date(bookingData.endTime);

    if (end <= start) {
      setError('End time must be after start time');
      return false;
    }

    const now = new Date();
    if (start <= now) {
      setError('Start time must be in the future');
      return false;
    }

    return true;
  };

  const submitBookingHandler = async (e) => {
    e.preventDefault();
    
    if (!validateBookingData()) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const bookingPayload = {
        jobseekerId: jobseeker._id,
        service: jobseeker.serviceCategory,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        location: bookingData.location,
        notes: bookingData.notes
      };

      const res = await API.post('/bookings', bookingPayload);
      
      setBookingConfirmed(true);
      navigate(`/bookings/${res.data.booking._id}?success=true`);
    } catch (error) {
      console.error('Error creating booking:', error);
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : 'Failed to create booking'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Link to={`/jobseekers/${id}`} className="btn btn-light my-3">
        Back to Provider Profile
      </Link>
      
      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error}</Message>
      ) : !jobseeker ? (
        <Message>Service provider not found</Message>
      ) : (
        <Row>
          <Col md={8}>
            <Card className="mb-4">
              <Card.Body>
                <Card.Title as="h2">Book an Appointment</Card.Title>
                
                <Form onSubmit={submitBookingHandler}>
                  <Form.Group className="mb-3" controlId="startTime">
                    <Form.Label>Start Date & Time</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      name="startTime"
                      value={bookingData.startTime}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="endTime">
                    <Form.Label>End Date & Time</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      name="endTime"
                      value={bookingData.endTime}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="location">
                    <Form.Label>Location</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter address or location details"
                      name="location"
                      value={bookingData.location}
                      onChange={handleInputChange}
                      required
                    />
                    <Form.Text className="text-muted">
                      Please provide the full address or virtual meeting details
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="notes">
                    <Form.Label>Additional Notes</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder="Any special requirements or information"
                      name="notes"
                      value={bookingData.notes}
                      onChange={handleInputChange}
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-100"
                    disabled={submitting}
                  >
                    {submitting ? 'Confirming...' : 'Confirm Booking'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4}>
            <Card>
              <Card.Body>
                <Card.Title as="h3">Booking Summary</Card.Title>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <h5>{jobseeker.user.name}</h5>
                    <p className="text-muted">
                      {jobseeker.serviceCategory.replace('_', ' ').charAt(0).toUpperCase() + 
                       jobseeker.serviceCategory.replace('_', ' ').slice(1)}
                    </p>
                  </ListGroup.Item>

                  <ListGroup.Item>
                    <div className="d-flex">
                      <div className="me-2">
                        <FaDollarSign />
                      </div>
                      <div>
                        <strong>Rate: </strong> ${jobseeker.hourlyRate}/hour
                      </div>
                    </div>
                  </ListGroup.Item>

                  {bookingData.startTime && (
                    <ListGroup.Item>
                      <div className="d-flex">
                        <div className="me-2">
                          <FaCalendarAlt />
                        </div>
                        <div>
                          <strong>Date: </strong>
                          {new Date(bookingData.startTime).toLocaleDateString()}
                        </div>
                      </div>
                    </ListGroup.Item>
                  )}

                  {bookingData.startTime && bookingData.endTime && (
                    <ListGroup.Item>
                      <div className="d-flex">
                        <div className="me-2">
                          <FaClock />
                        </div>
                        <div>
                          <strong>Time: </strong>
                          {new Date(bookingData.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {' - '}
                          {new Date(bookingData.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </ListGroup.Item>
                  )}

                  {bookingData.location && (
                    <ListGroup.Item>
                      <div className="d-flex">
                        <div className="me-2">
                          <FaMapMarkerAlt />
                        </div>
                        <div>
                          <strong>Location: </strong>
                          {bookingData.location}
                        </div>
                      </div>
                    </ListGroup.Item>
                  )}

                  <ListGroup.Item>
                    <div className="d-flex justify-content-between">
                      <h5>Total:</h5>
                      <h5>${totalAmount}</h5>
                    </div>
                  </ListGroup.Item>
                </ListGroup>
              </Card.Body>
            </Card>

            <Card className="mt-4">
              <Card.Body>
                <Card.Title as="h4">Payment Information</Card.Title>
                <p>
                  After booking is confirmed, you will need to arrange payment using one of the following methods:
                </p>
                <ul>
                  <li>Stripe (Online payment)</li>
                  <li>PayNow (Singapore payment service)</li>
                </ul>
                <p>
                  Payment instructions will be provided after booking confirmation.
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </>
  );
};

export default BookingScreen;