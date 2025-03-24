import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, Form, Table, Badge } from 'react-bootstrap';
import { FaEye } from 'react-icons/fa';
import Message from '../components/Message';
import Loader from '../components/Loader';
import FormContainer from '../components/FormContainer';
import { useAuth } from '../contexts/AuthContext';

const getStatusBadge = (status) => {
  let variant;
  switch (status) {
    case 'open':
      variant = 'danger';
      break;
    case 'investigating':
      variant = 'warning';
      break;
    case 'resolved':
      variant = 'success';
      break;
    case 'closed':
      variant = 'secondary';
      break;
    default:
      variant = 'secondary';
  }
  
  return (
    <Badge bg={variant}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const DisputeScreen = () => {
  const [disputes, setDisputes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState('');
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  const { API } = useAuth();
  
  const queryParams = new URLSearchParams(location.search);
  const bookingIdParam = queryParams.get('bookingId');

  useEffect(() => {
    if (bookingIdParam) {
      setSelectedBooking(bookingIdParam);
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user's disputes
        const disputesRes = await API.get('/disputes');
        setDisputes(disputesRes.data.disputes);
        
        // Fetch user's bookings for dropdown
        const bookingsRes = await API.get('/bookings');
        setBookings(bookingsRes.data.bookings);
        
        setError('');
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(
          error.response && error.response.data.message
            ? error.response.data.message
            : 'Failed to load data'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [API, bookingIdParam]);

  const submitHandler = async (e) => {
    e.preventDefault();
    
    if (!selectedBooking) {
      setError('Please select a booking');
      return;
    }
    
    if (!issueType) {
      setError('Please select an issue type');
      return;
    }
    
    if (!description) {
      setError('Please provide a description of the issue');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      
      const disputeData = {
        bookingId: selectedBooking,
        issueType,
        description
      };

      await API.post('/disputes', disputeData);
      
      setSuccess('Your dispute has been submitted successfully');
      
      // Clear form
      setSelectedBooking('');
      setIssueType('');
      setDescription('');
      
      // Refresh disputes list
      const disputesRes = await API.get('/disputes');
      setDisputes(disputesRes.data.disputes);
    } catch (error) {
      console.error('Error creating dispute:', error);
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : 'Failed to submit dispute'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Row>
      <Col md={6}>
        <Card className="mb-4">
          <Card.Body>
            <Card.Title as="h2">Report an Issue</Card.Title>
            {error && <Message variant="danger">{error}</Message>}
            {success && <Message variant="success">{success}</Message>}
            {loading ? (
              <Loader />
            ) : (
              <Form onSubmit={submitHandler}>
                <Form.Group className="mb-3" controlId="booking">
                  <Form.Label>Select Booking</Form.Label>
                  <Form.Select
                    value={selectedBooking}
                    onChange={(e) => setSelectedBooking(e.target.value)}
                    required
                  >
                    <option value="">Select a booking</option>
                    {bookings.map((booking) => (
                      <option key={booking._id} value={booking._id}>
                        {new Date(booking.startTime).toLocaleDateString()} - {' '}
                        {booking.service.replace('_', ' ')} with {' '}
                        {booking.jobseeker.user.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3" controlId="issueType">
                  <Form.Label>Issue Type</Form.Label>
                  <Form.Select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    required
                  >
                    <option value="">Select issue type</option>
                    <option value="service_quality">Service Quality Issue</option>
                    <option value="payment">Payment Issue</option>
                    <option value="cancellation">Cancellation Issue</option>
                    <option value="behavior">Behavioral Issue</option>
                    <option value="other">Other Issue</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3" controlId="description">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    placeholder="Please describe the issue in detail"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </Form>
            )}
          </Card.Body>
        </Card>
      </Col>
      
      <Col md={6}>
        <Card>
          <Card.Body>
            <Card.Title as="h2">My Reported Issues</Card.Title>
            {loading ? (
              <Loader />
            ) : disputes.length === 0 ? (
              <Message>You haven't reported any issues yet</Message>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Issue Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((dispute) => (
                    <tr key={dispute._id}>
                      <td>{new Date(dispute.createdAt).toLocaleDateString()}</td>
                      <td>
                        {dispute.issueType.replace('_', ' ').charAt(0).toUpperCase() + 
                        dispute.issueType.replace('_', ' ').slice(1)}
                      </td>
                      <td>{getStatusBadge(dispute.status)}</td>
                      <td>
                        <Button variant="light" size="sm" onClick={() => {
                          // View dispute details - This would be implemented in a real app
                          alert(`Dispute details for ID: ${dispute._id}\n\nDescription: ${dispute.description}\n\nStatus: ${dispute.status}`);
                        }}>
                          <FaEye /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default DisputeScreen;