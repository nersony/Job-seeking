import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table, Button, Row, Col, Badge, Tabs, Tab } from 'react-bootstrap';
import { FaEye } from 'react-icons/fa';
import Message from '../components/Message';
import Loader from '../components/Loader';
import { useAuth } from '../contexts/AuthContext';

const getStatusBadge = (status) => {
  let variant;
  switch (status) {
    case 'pending':
      variant = 'warning';
      break;
    case 'confirmed':
      variant = 'info';
      break;
    case 'completed':
      variant = 'success';
      break;
    case 'cancelled':
      variant = 'danger';
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

const BookingListScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { API, currentUser } = useAuth();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const res = await API.get('/bookings');
        setBookings(res.data.bookings);
        setError('');
      } catch (error) {
        console.error('Error fetching bookings:', error);
        setError(
          error.response && error.response.data.message
            ? error.response.data.message
            : 'Failed to load bookings'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [API]);

  const pendingBookings = bookings.filter(booking => booking.status === 'pending');
  const confirmedBookings = bookings.filter(booking => booking.status === 'confirmed');
  const completedBookings = bookings.filter(booking => booking.status === 'completed');
  const cancelledBookings = bookings.filter(booking => booking.status === 'cancelled');

  return (
    <>
      <h1>My Bookings</h1>
      
      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error}</Message>
      ) : bookings.length === 0 ? (
        <Message>
          You don't have any bookings yet.{' '}
          {currentUser && currentUser.role === 'enduser' && (
            <>
              <Link to="/jobseekers">Find service providers</Link> to get started.
            </>
          )}
        </Message>
      ) : (
        <Tabs defaultActiveKey="upcoming" className="mb-4">
          <Tab eventKey="upcoming" title={`Upcoming (${pendingBookings.length + confirmedBookings.length})`}>
            {pendingBookings.length === 0 && confirmedBookings.length === 0 ? (
              <Message>No upcoming bookings</Message>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Date</th>
                    <th>Time</th>
                    {currentUser && currentUser.role === 'enduser' ? (
                      <th>Service Provider</th>
                    ) : (
                      <th>Client</th>
                    )}
                    <th>Service</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pendingBookings, ...confirmedBookings]
                    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                    .map((booking) => (
                      <tr key={booking._id}>
                        <td>{booking._id.substring(booking._id.length - 6).toUpperCase()}</td>
                        <td>{new Date(booking.startTime).toLocaleDateString()}</td>
                        <td>
                          {new Date(booking.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {' - '}
                          {new Date(booking.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        {currentUser && currentUser.role === 'enduser' ? (
                          <td>{booking.jobseeker.user.name}</td>
                        ) : (
                          <td>{booking.endUser.name}</td>
                        )}
                        <td>
                          {booking.service.replace('_', ' ').charAt(0).toUpperCase() + 
                           booking.service.replace('_', ' ').slice(1)}
                        </td>
                        <td>{getStatusBadge(booking.status)}</td>
                        <td>${booking.totalAmount}</td>
                        <td>
                          <Link to={`/bookings/${booking._id}`}>
                            <Button variant="light" size="sm">
                              <FaEye /> Details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            )}
          </Tab>
          
          <Tab eventKey="completed" title={`Completed (${completedBookings.length})`}>
            {completedBookings.length === 0 ? (
              <Message>No completed bookings</Message>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Date</th>
                    <th>Time</th>
                    {currentUser && currentUser.role === 'enduser' ? (
                      <th>Service Provider</th>
                    ) : (
                      <th>Client</th>
                    )}
                    <th>Service</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {completedBookings
                    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
                    .map((booking) => (
                      <tr key={booking._id}>
                        <td>{booking._id.substring(booking._id.length - 6).toUpperCase()}</td>
                        <td>{new Date(booking.startTime).toLocaleDateString()}</td>
                        <td>
                          {new Date(booking.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {' - '}
                          {new Date(booking.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        {currentUser && currentUser.role === 'enduser' ? (
                          <td>{booking.jobseeker.user.name}</td>
                        ) : (
                          <td>{booking.endUser.name}</td>
                        )}
                        <td>
                          {booking.service.replace('_', ' ').charAt(0).toUpperCase() + 
                           booking.service.replace('_', ' ').slice(1)}
                        </td>
                        <td>{getStatusBadge(booking.status)}</td>
                        <td>${booking.totalAmount}</td>
                        <td>
                          <Link to={`/bookings/${booking._id}`}>
                            <Button variant="light" size="sm">
                              <FaEye /> Details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            )}
          </Tab>
          
          <Tab eventKey="cancelled" title={`Cancelled (${cancelledBookings.length})`}>
            {cancelledBookings.length === 0 ? (
              <Message>No cancelled bookings</Message>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Date</th>
                    <th>Time</th>
                    {currentUser && currentUser.role === 'enduser' ? (
                      <th>Service Provider</th>
                    ) : (
                      <th>Client</th>
                    )}
                    <th>Service</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cancelledBookings
                    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
                    .map((booking) => (
                      <tr key={booking._id}>
                        <td>{booking._id.substring(booking._id.length - 6).toUpperCase()}</td>
                        <td>{new Date(booking.startTime).toLocaleDateString()}</td>
                        <td>
                          {new Date(booking.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {' - '}
                          {new Date(booking.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        {currentUser && currentUser.role === 'enduser' ? (
                          <td>{booking.jobseeker.user.name}</td>
                        ) : (
                          <td>{booking.endUser.name}</td>
                        )}
                        <td>
                          {booking.service.replace('_', ' ').charAt(0).toUpperCase() + 
                           booking.service.replace('_', ' ').slice(1)}
                        </td>
                        <td>{getStatusBadge(booking.status)}</td>
                        <td>${booking.totalAmount}</td>
                        <td>
                          <Link to={`/bookings/${booking._id}`}>
                            <Button variant="light" size="sm">
                              <FaEye /> Details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            )}
          </Tab>
        </Tabs>
      )}
    </>
  );
};

export default BookingListScreen;