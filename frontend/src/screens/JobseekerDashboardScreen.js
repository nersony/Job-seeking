import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Table, Badge, Alert, Tabs, Tab } from 'react-bootstrap';
import { FaCalendar, FaMoneyBillWave, FaChartLine, FaUsers, FaClock } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import CalendlyAvailabilitySettings from '../components/CalendlyAvailabilitySettings';
import Loader from '../components/Loader';
import Message from '../components/Message';
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

const JobseekerDashboardScreen = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    availableBalance: 0,
    pendingWithdrawals: 0,
    completedWithdrawals: 0,
    recentCompletedBookings: [],
    recentWithdrawals: []
  });
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    averageRating: 0
  });
  const [isCalendlyConnected, setIsCalendlyConnected] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  
  const { API, currentUser } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch bookings
        const bookingsRes = await API.get('/bookings');
        const bookingsData = bookingsRes.data.bookings;
        setBookings(bookingsData);
        
        // Calculate stats from bookings
        const totalBookings = bookingsData.length;
        const pendingBookings = bookingsData.filter(b => b.status === 'pending').length;
        const confirmedBookings = bookingsData.filter(b => b.status === 'confirmed').length;
        const completedBookings = bookingsData.filter(b => b.status === 'completed').length;
        const cancelledBookings = bookingsData.filter(b => b.status === 'cancelled').length;
        
        const newStats = {
          totalBookings,
          pendingBookings,
          upcomingBookings: pendingBookings + confirmedBookings,
          completedBookings,
          cancelledBookings,
          averageRating: 0 // To be implemented with actual ratings
        };
        
        setStats(newStats);
        
        // Fetch earnings if the API endpoint exists
        try {
          const earningsRes = await API.get('/payments/earnings');
          setEarnings(earningsRes.data.earnings);
        } catch (earningsError) {
          console.warn('Earnings endpoint not available, using dummy data');
          // Use dummy data if endpoint is not available yet
          const newEarnings = {
            totalEarnings: bookingsData
              .filter(b => b.status === 'completed')
              .reduce((sum, booking) => sum + booking.totalAmount, 0),
            availableBalance: 0,
            pendingWithdrawals: 0,
            completedWithdrawals: 0,
            recentCompletedBookings: bookingsData
              .filter(b => b.status === 'completed')
              .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
              .slice(0, 5),
            recentWithdrawals: []
          };
          setEarnings(newEarnings);
        }
        
        // Fetch user profile to check if Calendly is connected
        const profileRes = await API.get('/users/profile');
        const jobseekerProfile = profileRes.data.user.jobseekerProfile;
        
        if (jobseekerProfile) {
          setIsCalendlyConnected(!!jobseekerProfile.calendlyAccessToken && !!jobseekerProfile.calendlyUri);
          
          // Check if profile is complete
          const isComplete = 
            !!jobseekerProfile.bio &&
            jobseekerProfile.skills && jobseekerProfile.skills.length > 0 &&
            !!jobseekerProfile.hourlyRate;
            
          setProfileComplete(isComplete);
        }
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError(
          error.response && error.response.data.message
            ? error.response.data.message
            : 'Failed to load dashboard data'
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [API]);

  const renderCompletionChecklist = () => {
    return (
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h4 className="mb-0">Complete Your Profile</h4>
        </Card.Header>
        <Card.Body>
          <div className="profile-checklist">
            <div className="checklist-item d-flex align-items-center mb-3">
              <div className={`status-indicator ${profileComplete ? 'text-success' : 'text-warning'} me-3`}>
                <i className={`fas ${profileComplete ? 'fa-check-circle' : 'fa-exclamation-circle'} fa-lg`}></i>
              </div>
              <div className="flex-grow-1">
                <h5 className="mb-1">Profile Information</h5>
                <p className="mb-0 text-muted">Add your bio, skills, and service rates</p>
              </div>
              <div>
                <Link to="/profile">
                  <Button variant={profileComplete ? "outline-success" : "outline-primary"} size="sm">
                    {profileComplete ? "Update" : "Complete"}
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="checklist-item d-flex align-items-center mb-3">
              <div className={`status-indicator ${isCalendlyConnected ? 'text-success' : 'text-warning'} me-3`}>
                <i className={`fas ${isCalendlyConnected ? 'fa-check-circle' : 'fa-exclamation-circle'} fa-lg`}></i>
              </div>
              <div className="flex-grow-1">
                <h5 className="mb-1">Connect Calendar</h5>
                <p className="mb-0 text-muted">Link your Calendly account to manage availability</p>
              </div>
              <div>
                <Link to="/profile">
                  <Button variant={isCalendlyConnected ? "outline-success" : "outline-primary"} size="sm">
                    {isCalendlyConnected ? "Manage" : "Connect"}
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="checklist-item d-flex align-items-center">
              <div className={`status-indicator text-warning me-3`}>
                <i className="fas fa-exclamation-circle fa-lg"></i>
              </div>
              <div className="flex-grow-1">
                <h5 className="mb-1">Add Certifications</h5>
                <p className="mb-0 text-muted">Upload your professional certifications</p>
              </div>
              <div>
                <Link to="/profile">
                  <Button variant="outline-primary" size="sm">
                    Add
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  };

  const renderStatCards = () => {
    return (
      <Row className="mb-4">
        <Col md={3}>
          <Card className="dashboard-stat">
            <Card.Body className="d-flex align-items-center">
              <div className="icon-box bg-primary text-white me-3">
                <FaCalendar size={24} />
              </div>
              <div>
                <h3 className="mb-0">{stats.totalBookings}</h3>
                <p className="text-muted mb-0">Total Bookings</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="dashboard-stat">
            <Card.Body className="d-flex align-items-center">
              <div className="icon-box bg-warning text-white me-3">
                <FaClock size={24} />
              </div>
              <div>
                <h3 className="mb-0">{stats.upcomingBookings}</h3>
                <p className="text-muted mb-0">Upcoming Bookings</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="dashboard-stat">
            <Card.Body className="d-flex align-items-center">
              <div className="icon-box bg-success text-white me-3">
                <FaMoneyBillWave size={24} />
              </div>
              <div>
                <h3 className="mb-0">${earnings.totalEarnings.toFixed(2)}</h3>
                <p className="text-muted mb-0">Total Earnings</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="dashboard-stat">
            <Card.Body className="d-flex align-items-center">
              <div className="icon-box bg-info text-white me-3">
                <FaUsers size={24} />
              </div>
              <div>
                <h3 className="mb-0">${earnings.availableBalance.toFixed(2)}</h3>
                <p className="text-muted mb-0">Available Balance</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  };

  const renderRecentBookings = () => {
    // Sort bookings by creation date, newest first
    const sortedBookings = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentBookings = sortedBookings.slice(0, 5);
    
    return (
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Recent Bookings</h4>
          <Link to="/bookings">
            <Button variant="outline-primary" size="sm">View All</Button>
          </Link>
        </Card.Header>
        <Card.Body>
          {recentBookings.length === 0 ? (
            <Message>No bookings yet</Message>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>{new Date(booking.startTime).toLocaleDateString()}</td>
                    <td>{booking.endUser.name}</td>
                    <td>
                      {booking.service.replace('_', ' ').charAt(0).toUpperCase() + 
                       booking.service.replace('_', ' ').slice(1)}
                    </td>
                    <td>{getStatusBadge(booking.status)}</td>
                    <td>${booking.totalAmount.toFixed(2)}</td>
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

  const renderEarningsSummary = () => {
    return (
      <Card className="mb-4">
        <Card.Header>
          <h4 className="mb-0">Earnings Summary</h4>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <div className="mb-4">
                <h5>Available Balance</h5>
                <h2 className="text-success">${earnings.availableBalance.toFixed(2)}</h2>
                <Button variant="primary" size="sm">
                  Request Withdrawal
                </Button>
              </div>
              
              <div>
                <h5>Total Earnings</h5>
                <h3>${earnings.totalEarnings.toFixed(2)}</h3>
                <p className="text-muted">Lifetime earnings from completed bookings</p>
              </div>
            </Col>
            
            <Col md={6}>
              <div className="mb-3">
                <h5>Recent Transactions</h5>
                {earnings.recentCompletedBookings.length === 0 ? (
                  <p>No recent transactions</p>
                ) : (
                  <Table responsive size="sm">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.recentCompletedBookings.map((booking) => (
                        <tr key={booking._id}>
                          <td>{new Date(booking.updatedAt).toLocaleDateString()}</td>
                          <td>Booking payment</td>
                          <td className="text-success">+${booking.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                      {earnings.recentWithdrawals.map((withdrawal) => (
                        <tr key={withdrawal._id}>
                          <td>{new Date(withdrawal.processedDate || withdrawal.requestDate).toLocaleDateString()}</td>
                          <td>Withdrawal</td>
                          <td className="text-danger">-${withdrawal.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };

  const renderAvailabilitySettings = () => {
    return isCalendlyConnected ? (
      <CalendlyAvailabilitySettings />
    ) : (
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h4 className="mb-0">Calendar Integration</h4>
        </Card.Header>
        <Card.Body className="text-center">
          <p>Connect your Calendly account to manage your availability and let clients book appointments with you.</p>
          <Link to="/profile">
            <Button variant="primary" size="lg">
              <FaCalendar className="me-2" />
              Set Up Calendly Integration
            </Button>
          </Link>
        </Card.Body>
      </Card>
    );
  };

  const renderUpcomingBookings = () => {
    // Filter and sort upcoming bookings (pending + confirmed)
    const upcomingBookings = bookings
      .filter(booking => booking.status === 'pending' || booking.status === 'confirmed')
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime)); // Ascending by start time
    
    return (
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Upcoming Appointments</h4>
          <Link to="/bookings">
            <Button variant="outline-primary" size="sm">View All</Button>
          </Link>
        </Card.Header>
        <Card.Body>
          {upcomingBookings.length === 0 ? (
            <Message>No upcoming appointments</Message>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingBookings.slice(0, 5).map((booking) => {
                  const bookingDate = new Date(booking.startTime);
                  const today = new Date();
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  
                  // Determine if the booking is today, tomorrow, or another day
                  let dateDisplay;
                  if (bookingDate.toDateString() === today.toDateString()) {
                    dateDisplay = <span className="text-primary">Today</span>;
                  } else if (bookingDate.toDateString() === tomorrow.toDateString()) {
                    dateDisplay = <span className="text-info">Tomorrow</span>;
                  } else {
                    dateDisplay = bookingDate.toLocaleDateString();
                  }
                  
                  return (
                    <tr key={booking._id}>
                      <td>
                        <div>{dateDisplay}</div>
                        <small>{bookingDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                      </td>
                      <td>{booking.endUser.name}</td>
                      <td>
                        {booking.service.replace('_', ' ').charAt(0).toUpperCase() + 
                        booking.service.replace('_', ' ').slice(1)}
                      </td>
                      <td>{getStatusBadge(booking.status)}</td>
                      <td>
                        <Link to={`/bookings/${booking._id}`}>
                          <Button variant="primary" size="sm">
                            Manage
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderWithdrawalHistory = () => {
    return (
      <Card className="mb-4">
        <Card.Header>
          <h4 className="mb-0">Withdrawal History</h4>
        </Card.Header>
        <Card.Body>
          {earnings.recentWithdrawals && earnings.recentWithdrawals.length > 0 ? (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {earnings.recentWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal._id}>
                    <td>{new Date(withdrawal.requestDate).toLocaleDateString()}</td>
                    <td>${withdrawal.amount.toFixed(2)}</td>
                    <td>
                      <Badge bg={
                        withdrawal.status === 'completed' ? 'success' :
                        withdrawal.status === 'approved' ? 'info' :
                        withdrawal.status === 'rejected' ? 'danger' : 'warning'
                      }>
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </Badge>
                    </td>
                    <td>{withdrawal.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-4">
              <p className="mb-3">You haven't made any withdrawal requests yet.</p>
              <Button variant="outline-primary">Request Withdrawal</Button>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderMonthlyEarningsChart = () => {
    // This would be replaced with actual chart component in production
    return (
      <Card className="mb-4">
        <Card.Header>
          <h4 className="mb-0">Monthly Earnings</h4>
        </Card.Header>
        <Card.Body className="text-center">
          <div className="py-5 text-muted">
            <FaChartLine size={48} className="mb-3" />
            <h5>Monthly earnings chart would be displayed here</h5>
            <p>Visualize your earnings over time</p>
          </div>
        </Card.Body>
      </Card>
    );
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Provider Dashboard</h1>
        <Link to="/profile">
          <Button variant="outline-primary">
            Edit Profile
          </Button>
        </Link>
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error}</Message>
      ) : (
        <>
          {(!profileComplete || !isCalendlyConnected) && renderCompletionChecklist()}
          
          {renderStatCards()}
          
          <Row className="mb-4">
            <Col lg={8}>
              {renderUpcomingBookings()}
            </Col>
            <Col lg={4}>
              <Card>
                <Card.Header className="bg-primary text-white">
                  <h4 className="mb-0">Quick Actions</h4>
                </Card.Header>
                <Card.Body>
                  <div className="d-grid gap-2">
                    <Link to="/profile">
                      <Button variant="outline-primary" className="w-100 mb-2">
                        Update Profile
                      </Button>
                    </Link>
                    <Link to="/bookings">
                      <Button variant="outline-primary" className="w-100 mb-2">
                        View All Bookings
                      </Button>
                    </Link>
                    {earnings.availableBalance > 0 && (
                      <Button variant="outline-success" className="w-100 mb-2">
                        Request Withdrawal (${earnings.availableBalance.toFixed(2)})
                      </Button>
                    )}
                    {isCalendlyConnected && (
                      <Link to="/profile">
                        <Button variant="outline-primary" className="w-100">
                          Manage Calendar
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Tabs defaultActiveKey="bookings" className="mb-4">
            <Tab eventKey="bookings" title="Recent Bookings">
              {renderRecentBookings()}
            </Tab>
            <Tab eventKey="earnings" title="Earnings">
              <Row>
                <Col lg={7}>
                  {renderEarningsSummary()}
                </Col>
                <Col lg={5}>
                  {renderWithdrawalHistory()}
                </Col>
              </Row>
              {renderMonthlyEarningsChart()}
            </Tab>
            <Tab eventKey="availability" title="Availability">
              {renderAvailabilitySettings()}
            </Tab>
          </Tabs>
        </>
      )}
    </>
  );
};

export default JobseekerDashboardScreen;