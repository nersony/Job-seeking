import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Row, Col, Nav, Card, Table, Button, Badge } from 'react-bootstrap';
import { FaUsers, FaCalendarCheck, FaMoneyBillWave, FaExclamationTriangle, FaUserCheck } from 'react-icons/fa';
import Message from '../components/Message';
import Loader from '../components/Loader';
import { useAuth } from '../contexts/AuthContext';

// Admin Dashboard Components
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { API } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await API.get('/users');
        setUsers(res.data.users);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError(
          error.response && error.response.data.message
            ? error.response.data.message
            : 'Failed to load users'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [API]);

  return (
    <Card>
      <Card.Body>
        <Card.Title as="h2">User Management</Card.Title>
        {loading ? (
          <Loader />
        ) : error ? (
          <Message variant="danger">{error}</Message>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user._id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <Badge bg={
                      user.role === 'admin' 
                        ? 'danger' 
                        : user.role === 'jobseeker' 
                          ? 'success' 
                          : 'primary'
                    }>
                      {user.role}
                    </Badge>
                  </td>
                  <td>
                    <Button variant="light" size="sm" className="me-2">
                      View
                    </Button>
                    <Button variant="danger" size="sm">
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};

const BookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { API } = useAuth();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const res = await API.get('/bookings');
        setBookings(res.data.bookings);
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

  return (
    <Card>
      <Card.Body>
        <Card.Title as="h2">Booking Management</Card.Title>
        {loading ? (
          <Loader />
        ) : error ? (
          <Message variant="danger">{error}</Message>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Client</th>
                <th>Provider</th>
                <th>Service</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking._id}>
                  <td>{booking._id.substring(booking._id.length - 6).toUpperCase()}</td>
                  <td>{new Date(booking.startTime).toLocaleDateString()}</td>
                  <td>{booking.endUser.name}</td>
                  <td>{booking.jobseeker.user.name}</td>
                  <td>{booking.service}</td>
                  <td>{getStatusBadge(booking.status)}</td>
                  <td>
                    <Link to={`/bookings/${booking._id}`}>
                      <Button variant="light" size="sm">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};

const DisputeManagement = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { API } = useAuth();

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        setLoading(true);
        const res = await API.get('/disputes');
        setDisputes(res.data.disputes);
      } catch (error) {
        console.error('Error fetching disputes:', error);
        setError(
          error.response && error.response.data.message
            ? error.response.data.message
            : 'Failed to load disputes'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, [API]);

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

  return (
    <Card>
      <Card.Body>
        <Card.Title as="h2">Dispute Management</Card.Title>
        {loading ? (
          <Loader />
        ) : error ? (
          <Message variant="danger">{error}</Message>
        ) : disputes.length === 0 ? (
          <Message>No disputes found</Message>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reported By</th>
                <th>Issue Type</th>
                <th>Booking ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((dispute) => (
                <tr key={dispute._id}>
                  <td>{new Date(dispute.createdAt).toLocaleDateString()}</td>
                  <td>{dispute.reportedBy.name}</td>
                  <td>{dispute.issueType.replace('_', ' ')}</td>
                  <td>{dispute.booking._id.substring(dispute.booking._id.length - 6).toUpperCase()}</td>
                  <td>{getStatusBadge(dispute.status)}</td>
                  <td>
                    <Button variant="primary" size="sm" className="me-2">
                      Resolve
                    </Button>
                    <Link to={`/bookings/${dispute.booking._id}`}>
                      <Button variant="light" size="sm">
                        View Booking
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};

const VerificationManagement = () => {
  const [jobseekers, setJobseekers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { API } = useAuth();

  useEffect(() => {
    const fetchJobseekers = async () => {
      try {
        setLoading(true);
        const res = await API.get('/jobseekers');
        
        // Filter jobseekers with unverified certifications
        const jobseekersWithUnverifiedCerts = res.data.jobseekers.filter(
          jobseeker => 
            jobseeker.certifications && 
            jobseeker.certifications.some(cert => !cert.isVerified)
        );
        
        setJobseekers(jobseekersWithUnverifiedCerts);
      } catch (error) {
        console.error('Error fetching jobseekers:', error);
        setError(
          error.response && error.response.data.message
            ? error.response.data.message
            : 'Failed to load verification requests'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchJobseekers();
  }, [API]);

  const verifyCertification = async (jobseekerId, certId) => {
    try {
      await API.put(`/jobseekers/${jobseekerId}/certifications/${certId}/verify`);
      
      // Refresh jobseekers list
      const res = await API.get('/jobseekers');
      const jobseekersWithUnverifiedCerts = res.data.jobseekers.filter(
        jobseeker => 
          jobseeker.certifications && 
          jobseeker.certifications.some(cert => !cert.isVerified)
      );
      setJobseekers(jobseekersWithUnverifiedCerts);
    } catch (error) {
      console.error('Error verifying certification:', error);
      alert('Failed to verify certification');
    }
  };

  return (
    <Card>
      <Card.Body>
        <Card.Title as="h2">Certification Verification</Card.Title>
        {loading ? (
          <Loader />
        ) : error ? (
          <Message variant="danger">{error}</Message>
        ) : jobseekers.length === 0 ? (
          <Message>No certifications pending verification</Message>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Certification</th>
                <th>Issuer</th>
                <th>Date Obtained</th>
                <th>Document</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobseekers.flatMap(jobseeker => 
                jobseeker.certifications
                  .filter(cert => !cert.isVerified)
                  .map(cert => (
                    <tr key={`${jobseeker._id}-${cert._id}`}>
                      <td>{jobseeker.user.name}</td>
                      <td>{cert.name}</td>
                      <td>{cert.issuer}</td>
                      <td>{new Date(cert.dateObtained).toLocaleDateString()}</td>
                      <td>
                        <a 
                          href={cert.documentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          View Document
                        </a>
                      </td>
                      <td>
                        <Button 
                          variant="success" 
                          size="sm"
                          onClick={() => verifyCertification(jobseeker._id, cert._id)}
                        >
                          Verify
                        </Button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};

const PayoutManagement = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { API } = useAuth();

  useEffect(() => {
    // This would be implemented in a real application
    // For now, we'll use mock data
    setLoading(false);
    setWithdrawals([
      {
        _id: 'w1',
        jobseeker: { user: { name: 'Jane Smith' } },
        amount: 250,
        requestDate: new Date(),
        status: 'pending',
        paymentMethod: 'bank_transfer'
      },
      {
        _id: 'w2',
        jobseeker: { user: { name: 'John Doe' } },
        amount: 480,
        requestDate: new Date(),
        status: 'approved',
        paymentMethod: 'paypal'
      }
    ]);
  }, [API]);

  const getStatusBadge = (status) => {
    let variant;
    switch (status) {
      case 'pending':
        variant = 'warning';
        break;
      case 'approved':
        variant = 'info';
        break;
      case 'completed':
        variant = 'success';
        break;
      case 'rejected':
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

  return (
    <Card>
      <Card.Body>
        <Card.Title as="h2">Payout Management</Card.Title>
        {loading ? (
          <Loader />
        ) : error ? (
          <Message variant="danger">{error}</Message>
        ) : withdrawals.length === 0 ? (
          <Message>No pending withdrawals</Message>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Date</th>
                <th>Provider</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal._id}>
                  <td>{new Date(withdrawal.requestDate).toLocaleDateString()}</td>
                  <td>{withdrawal.jobseeker.user.name}</td>
                  <td>${withdrawal.amount}</td>
                  <td>{withdrawal.paymentMethod.replace('_', ' ')}</td>
                  <td>{getStatusBadge(withdrawal.status)}</td>
                  <td>
                    {withdrawal.status === 'pending' && (
                      <>
                        <Button variant="success" size="sm" className="me-2">
                          Approve
                        </Button>
                        <Button variant="danger" size="sm">
                          Reject
                        </Button>
                      </>
                    )}
                    {withdrawal.status === 'approved' && (
                      <Button variant="primary" size="sm">
                        Mark as Paid
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};

// Main Admin Dashboard
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    // Redirect if user is not an admin
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  return (
    <>
      <h1>Admin Dashboard</h1>
      <Row className="mb-4">
        <Col>
          <Card bg="primary" text="white" className="mb-2">
            <Card.Body>
              <Card.Title>Welcome, Admin!</Card.Title>
              <Card.Text>
                From here, you can manage users, bookings, disputes, verifications, and payouts.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col md={3}>
          <Nav className="flex-column">
            <Nav.Link as={Link} to="/admin" className="bg-light p-3 mb-2 rounded">
              <FaUsers className="me-2" /> User Management
            </Nav.Link>
            <Nav.Link as={Link} to="/admin/bookings" className="bg-light p-3 mb-2 rounded">
              <FaCalendarCheck className="me-2" /> Booking Management
            </Nav.Link>
            <Nav.Link as={Link} to="/admin/disputes" className="bg-light p-3 mb-2 rounded">
              <FaExclamationTriangle className="me-2" /> Dispute Management
            </Nav.Link>
            <Nav.Link as={Link} to="/admin/verifications" className="bg-light p-3 mb-2 rounded">
              <FaUserCheck className="me-2" /> Verification Management
            </Nav.Link>
            <Nav.Link as={Link} to="/admin/payouts" className="bg-light p-3 mb-2 rounded">
              <FaMoneyBillWave className="me-2" /> Payout Management
            </Nav.Link>
          </Nav>
        </Col>
        
        <Col md={9}>
          <Routes>
            <Route path="/" element={<UserManagement />} />
            <Route path="/bookings" element={<BookingManagement />} />
            <Route path="/disputes" element={<DisputeManagement />} />
            <Route path="/verifications" element={<VerificationManagement />} />
            <Route path="/payouts" element={<PayoutManagement />} />
          </Routes>
        </Col>
      </Row>
    </>
  );
};

export default AdminDashboard;