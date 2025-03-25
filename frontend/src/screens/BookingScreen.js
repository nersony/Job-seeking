// frontend/src/screens/BookingScreen.js
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Row, Col, Form, Button, Card, ListGroup, Alert, Tabs, Tab, Badge } from 'react-bootstrap';
import { FaCalendarAlt, FaMapMarkerAlt, FaClock, FaDollarSign, FaCalendarCheck } from 'react-icons/fa';
import Message from '../components/Message';
import Loader from '../components/Loader';
import SimplifiedCalendar from '../components/SimplifiedCalendar';
import FormContainer from '../components/FormContainer';
import { useAuth } from '../contexts/AuthContext';

const BookingScreen = () => {
  const [jobseeker, setJobseeker] = useState(null);
  const [bookingData, setBookingData] = useState({
    startTime: '',
    endTime: '',
    location: '',
    notes: '',
    eventTypeUri: ''
  });
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [eventTypes, setEventTypes] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEventType, setSelectedEventType] = useState(null);
  const [bookingMethod, setBookingMethod] = useState('manual'); // 'manual' or 'calendly'
  
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { API, currentUser } = useAuth();

  // Get availability filters from location state if they exist
  const searchParams = new URLSearchParams(location.search);
  const preselectedStartTime = searchParams.get('startTime');
  const preselectedEndTime = searchParams.get('endTime');

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

        // Prefill booking data with any preselected times
        if (preselectedStartTime && preselectedEndTime) {
          setBookingData(prev => ({
            ...prev,
            startTime: preselectedStartTime,
            endTime: preselectedEndTime
          }));
        }

        // If jobseeker has Calendly integration, fetch their event types
        if (res.data.jobseeker.calendlyAccessToken) {
          try {
            const eventTypesRes = await API.get(`/calendly/availability?jobseekerId=${id}`);
            if (eventTypesRes.data.success) {
              setAvailability(eventTypesRes.data.availability || []);
              
              // Extract unique event types from availability data
              const uniqueEventTypes = [];
              const eventTypeMap = {};
              
              eventTypesRes.data.availability.forEach(day => {
                day.eventTypes.forEach(eventType => {
                  if (!eventTypeMap[eventType.uri]) {
                    eventTypeMap[eventType.uri] = true;
                    uniqueEventTypes.push(eventType);
                  }
                });
              });
              
              setEventTypes(uniqueEventTypes);
              
              // Default to Calendly booking if available
              if (uniqueEventTypes.length > 0) {
                setBookingMethod('calendly');
              }
            }
          } catch (err) {
            console.error('Error fetching Calendly data:', err);
            // Fall back to manual booking if Calendly data can't be fetched
            setBookingMethod('manual');
          }
        }

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
  }, [id, API, currentUser, navigate, preselectedStartTime, preselectedEndTime]);

  // Calculate total amount when start time or end time changes in manual booking mode
  useEffect(() => {
    if (jobseeker && bookingMethod === 'manual' && bookingData.startTime && bookingData.endTime) {
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
    } else if (bookingMethod === 'calendly' && selectedEventType) {
      // For Calendly bookings, calculate based on event type duration
      const durationHours = selectedEventType.duration / 60; // Convert minutes to hours
      const amount = jobseeker.hourlyRate * durationHours;
      setTotalAmount(amount.toFixed(2));
    } else {
      setTotalAmount(0);
    }
  }, [bookingData.startTime, bookingData.endTime, jobseeker, bookingMethod, selectedEventType]);

  const handleInputChange = (e) => {
    setBookingData({ ...bookingData, [e.target.name]: e.target.value });
  };

  const handleEventTypeSelect = (eventType) => {
    setSelectedEventType(eventType);
    
    // Clear previously selected time slot when changing event type
    setSelectedTimeSlot(null);
    setSelectedDate('');
    
    // Update booking data with event type URI
    setBookingData({
      ...bookingData,
      eventTypeUri: eventType.uri
    });
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    
    // Clear previously selected time slot when changing date
    setSelectedTimeSlot(null);
  };

  const handleTimeSlotSelect = (timeSlot, date) => {
    // Calculate end time based on event type duration
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const startDate = new Date(date);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate);
    const durationMinutes = selectedEventType.duration;
    endDate.setMinutes(endDate.getMinutes() + durationMinutes);
    
    const formattedStartTime = startDate.toISOString().replace('Z', '');
    const formattedEndTime = endDate.toISOString().replace('Z', '');
    
    setSelectedTimeSlot(timeSlot);
    
    // Update booking data
    setBookingData({
      ...bookingData,
      startTime: formattedStartTime,
      endTime: formattedEndTime
    });
  };

  const validateBookingData = () => {
    if (bookingMethod === 'manual') {
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
    } else {
      // Calendly booking validation
      if (!selectedEventType) {
        setError('Please select a service type');
        return false;
      }
      
      if (!selectedTimeSlot || !selectedDate) {
        setError('Please select an available time slot');
        return false;
      }
      
      if (!bookingData.location) {
        setError('Please enter a location');
        return false;
      }
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
      
      // First check if the jobseeker is available at this time
      const availabilityCheckParams = new URLSearchParams({
        jobseekerId: jobseeker._id,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime
      });
      
      const availabilityCheck = await API.get(
        `/calendly/check-jobseeker-availability?${availabilityCheckParams}`
      );
      
      if (!availabilityCheck.data.available) {
        setError(`This provider is not available at the selected time. Reason: ${availabilityCheck.data.reason || 'No availability'}`);
        setSubmitting(false);
        return;
      }
      
      // Continue with booking creation if available
      const bookingPayload = {
        jobseekerId: jobseeker._id,
        service: jobseeker.serviceCategory,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        location: bookingData.location,
        notes: bookingData.notes
      };
  
      // For Calendly bookings, add event type URI
      if (bookingMethod === 'calendly' && bookingData.eventTypeUri) {
        bookingPayload.eventTypeUri = bookingData.eventTypeUri;
      }
  
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

  // Get available time slots for selected date
  const getAvailableTimeSlots = () => {
    if (!selectedDate || !availability) return [];
    
    const dateAvailability = availability.find(d => d.date === selectedDate);
    return dateAvailability ? dateAvailability.timeSlots : [];
  };

  // Format time to 12-hour format
  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
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
                
                {jobseeker.calendlyAccessToken && (
                  <Tabs
                    activeKey={bookingMethod}
                    onSelect={(k) => setBookingMethod(k)}
                    className="mb-3"
                  >
                    <Tab eventKey="calendly" title="Schedule with Calendar">
                      <p>Select from available time slots on the provider's calendar.</p>
                    </Tab>
                    <Tab eventKey="manual" title="Custom Booking">
                      <p>Set your own custom time and duration.</p>
                    </Tab>
                  </Tabs>
                )}
                
                <Form onSubmit={submitBookingHandler}>
                  {bookingMethod === 'calendly' && (
                    <>
                      <Form.Group className="mb-3">
                        <Form.Label>Select Service Type</Form.Label>
                        <div className="d-flex flex-wrap gap-2">
                          {eventTypes.map((eventType) => (
                            <Button
                              key={eventType.uri}
                              variant={selectedEventType?.uri === eventType.uri ? "primary" : "outline-primary"}
                              onClick={() => handleEventTypeSelect(eventType)}
                              className="mb-2"
                            >
                              {eventType.name} ({eventType.duration} min)
                            </Button>
                          ))}
                        </div>
                      </Form.Group>
                      
                      {selectedEventType && (
                        <>
                          <Form.Group className="mb-3">
                            <Form.Label>Select Date</Form.Label>
                            <div className="calendar-wrapper">
                              {/* Simplified calendar selector showing available dates */}
                              <div className="d-flex flex-wrap gap-2">
                                {availability.map((day) => {
                                  // Check if this date has the selected event type
                                  const hasEventType = day.eventTypes.some(
                                    et => et.uri === selectedEventType.uri
                                  );
                                  
                                  if (!hasEventType) return null;
                                  
                                  const date = new Date(day.date);
                                  const formattedDate = date.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                  });
                                  
                                  return (
                                    <Button
                                      key={day.date}
                                      variant={selectedDate === day.date ? "primary" : "outline-primary"}
                                      onClick={() => handleDateSelect(day.date)}
                                      className="mb-2"
                                    >
                                      {formattedDate}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          </Form.Group>
                          
                          {selectedDate && (
                            <Form.Group className="mb-3">
                              <Form.Label>Select Time Slot</Form.Label>
                              <div className="d-flex flex-wrap gap-2">
                                {getAvailableTimeSlots().map((timeSlot) => (
                                  <Button
                                    key={timeSlot}
                                    variant={selectedTimeSlot === timeSlot ? "primary" : "outline-primary"}
                                    onClick={() => handleTimeSlotSelect(timeSlot, selectedDate)}
                                    className="mb-2"
                                  >
                                    {formatTime(timeSlot)}
                                  </Button>
                                ))}
                              </div>
                              {getAvailableTimeSlots().length === 0 && (
                                <Alert variant="info">
                                  No available time slots on this date. Please select another date.
                                </Alert>
                              )}
                            </Form.Group>
                          )}
                        </>
                      )}
                    </>
                  )}
                  
                  {bookingMethod === 'manual' && (
                    <>
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
                    </>
                  )}

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

                  {bookingMethod === 'calendly' && selectedEventType && (
                    <ListGroup.Item>
                      <div className="d-flex">
                        <div className="me-2">
                          <FaCalendarCheck />
                        </div>
                        <div>
                          <strong>Service: </strong> {selectedEventType.name} ({selectedEventType.duration} min)
                        </div>
                      </div>
                    </ListGroup.Item>
                  )}

                  {(bookingData.startTime) && (
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