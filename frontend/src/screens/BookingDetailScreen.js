import React, { useState, useEffect } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Button,
  Badge,
  ListGroup,
  Form,
  Alert,
} from "react-bootstrap";
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaClock,
  FaDollarSign,
  FaExclamationTriangle,
} from "react-icons/fa";
import Message from "../components/Message";
import Loader from "../components/Loader";
import CalendlyEmbed from "../components/CalendlyEmbed";
import StripeCheckout from "../components/StripeCheckout";
import { useAuth } from "../contexts/AuthContext";

const getStatusBadge = (status) => {
  let variant;
  switch (status) {
    case "pending":
      variant = "warning";
      break;
    case "confirmed":
      variant = "info";
      break;
    case "completed":
      variant = "success";
      break;
    case "cancelled":
      variant = "danger";
      break;
    default:
      variant = "secondary";
  }

  return (
    <Badge bg={variant} className="p-2" style={{ fontSize: "1rem" }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const BookingDetailScreen = () => {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobseeker, setJobseeker] = useState(null);
  const [error, setError] = useState("");
  const [paymentProof, setPaymentProof] = useState("");
  const [updateStatus, setUpdateStatus] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");

  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { API, currentUser } = useAuth();

  const showSuccess =
    new URLSearchParams(location.search).get("success") === "true";

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/bookings/${id}`);
      setBooking(res.data.booking);

      if (res.data.booking && res.data.booking.jobseeker) {
        // Check if jobseeker is an object with an _id property
        const jobseekerId =
          res.data.booking.jobseeker._id || res.data.booking.jobseeker;

        console.log("Jobseeker data from booking:", res.data.booking.jobseeker);
        console.log("Extracted jobseeker ID:", jobseekerId);

        // Use the extracted ID for the API call
        const jobseekerRes = await API.get(`/jobseekers/${jobseekerId}`);

        // Set the jobseeker data in its own state variable
        setJobseeker(jobseekerRes.data.jobseeker);

        // Log for debugging
        console.log("Jobseeker data from API:", jobseekerRes.data.jobseeker);
      } else {
        console.warn("No jobseeker ID found in booking data");
      }

      setError("");
    } catch (error) {
      console.error("Error fetching booking details:", error);
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : "Failed to load booking details"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetails();
  }, [id, API]);

  const handleStatusChange = (e) => {
    setUpdateStatus(e.target.value);
  };

  const updateBookingStatus = async () => {
    if (!updateStatus) return;

    try {
      setStatusLoading(true);
      setStatusError("");
      setStatusSuccess("");

      await API.put(`/bookings/${id}/status`, { status: updateStatus });

      setStatusSuccess(`Booking status updated to ${updateStatus}`);

      // Refresh booking details
      const res = await API.get(`/bookings/${id}`);
      setBooking(res.data.booking);
    } catch (error) {
      console.error("Error updating booking status:", error);
      setStatusError(
        error.response && error.response.data.message
          ? error.response.data.message
          : "Failed to update booking status"
      );
    } finally {
      setStatusLoading(false);
    }
  };

  const handlePaymentProofChange = (e) => {
    setPaymentProof(e.target.value);
  };

  const submitPaymentProof = async (e) => {
    e.preventDefault();

    if (!paymentProof) {
      setPaymentError("Please provide payment proof");
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentError("");
      setPaymentSuccess("");

      await API.put(`/bookings/${id}/payment-proof`, { paymentProof });

      setPaymentSuccess("Payment proof submitted successfully");
      setPaymentProof("");

      // Refresh booking details
      const res = await API.get(`/bookings/${id}`);
      setBooking(res.data.booking);
    } catch (error) {
      console.error("Error submitting payment proof:", error);
      setPaymentError(
        error.response && error.response.data.message
          ? error.response.data.message
          : "Failed to submit payment proof"
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const createDispute = () => {
    navigate(`/disputes?bookingId=${id}`);
  };

  return (
    <>
      <Link to="/bookings" className="btn btn-light my-3">
        Back to Bookings
      </Link>

      {showSuccess && (
        <Alert variant="success">
          Booking created successfully! Please submit payment to confirm your
          booking.
        </Alert>
      )}

      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error}</Message>
      ) : !booking ? (
        <Message>Booking not found</Message>
      ) : (
        <>
          <h1>
            Booking #
            {booking._id.substring(booking._id.length - 6).toUpperCase()}
          </h1>

          <Row>
            <Col md={8}>
              <Card className="mb-4">
                <Card.Body>
                  <Card.Title as="h3">Booking Details</Card.Title>
                  <Row className="mb-3">
                    <Col md={6}>
                      <strong>Status: </strong>
                      {getStatusBadge(booking.status)}
                    </Col>
                    <Col md={6}>
                      <strong>Payment: </strong>
                      <Badge
                        bg={
                          booking.paymentStatus === "paid"
                            ? "success"
                            : "warning"
                        }
                        className="p-2"
                      >
                        {booking.paymentStatus.charAt(0).toUpperCase() +
                          booking.paymentStatus.slice(1)}
                      </Badge>
                    </Col>
                  </Row>
                  <ListGroup variant="flush">
                    <ListGroup.Item>
                      <Row>
                        <Col md={4}>
                          <strong>Service Type:</strong>
                        </Col>
                        <Col md={8}>
                          {booking.service
                            .replace("_", " ")
                            .charAt(0)
                            .toUpperCase() +
                            booking.service.replace("_", " ").slice(1)}
                        </Col>
                      </Row>
                    </ListGroup.Item>

                    <ListGroup.Item>
                      <Row>
                        <Col md={4}>
                          <strong>Service Provider:</strong>
                        </Col>
                        <Col md={8}>{booking.jobseeker.user.name}</Col>
                      </Row>
                    </ListGroup.Item>

                    <ListGroup.Item>
                      <Row>
                        <Col md={4}>
                          <strong>Client:</strong>
                        </Col>
                        <Col md={8}>{booking.endUser.name}</Col>
                      </Row>
                    </ListGroup.Item>

                    <ListGroup.Item>
                      <Row>
                        <Col md={4}>
                          <strong>Date:</strong>
                        </Col>
                        <Col md={8}>
                          {new Date(booking.startTime).toLocaleDateString()}
                        </Col>
                      </Row>
                    </ListGroup.Item>

                    <ListGroup.Item>
                      <Row>
                        <Col md={4}>
                          <strong>Time:</strong>
                        </Col>
                        <Col md={8}>
                          {new Date(booking.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" - "}
                          {new Date(booking.endTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Col>
                      </Row>
                    </ListGroup.Item>

                    <ListGroup.Item>
                      <Row>
                        <Col md={4}>
                          <strong>Location:</strong>
                        </Col>
                        <Col md={8}>{booking.location}</Col>
                      </Row>
                    </ListGroup.Item>

                    {booking.notes && (
                      <ListGroup.Item>
                        <Row>
                          <Col md={4}>
                            <strong>Notes:</strong>
                          </Col>
                          <Col md={8}>{booking.notes}</Col>
                        </Row>
                      </ListGroup.Item>
                    )}

                    <ListGroup.Item>
                      <Row>
                        <Col md={4}>
                          <strong>Total Amount:</strong>
                        </Col>
                        <Col md={8}>${booking.totalAmount.toFixed(2)}</Col>
                      </Row>
                    </ListGroup.Item>

                    {booking.paymentProof && (
                      <ListGroup.Item>
                        <Row>
                          <Col md={4}>
                            <strong>Payment Proof:</strong>
                          </Col>
                          <Col md={8}>
                            <a
                              href={booking.paymentProof}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Payment Proof
                            </a>
                          </Col>
                        </Row>
                      </ListGroup.Item>
                    )}
                  </ListGroup>
                </Card.Body>
              </Card>

              {/* Payment submission for end users */}
              {/* {currentUser && 
               currentUser.role === 'enduser' && 
               booking.status !== 'cancelled' &&
               booking.paymentStatus !== 'paid' && (
                <Card className="mb-4">
                  <Card.Body>
                    <Card.Title as="h3">Submit Payment</Card.Title>
                    {paymentError && <Message variant="danger">{paymentError}</Message>}
                    {paymentSuccess && <Message variant="success">{paymentSuccess}</Message>}
                    
                    <p>
                      Please make payment using one of the following methods and provide the 
                      payment reference or receipt link below:
                    </p>
                    
                    <Alert variant="info">
                      <strong>Payment Options:</strong>
                      <ul className="mb-0">
                        <li>
                          <strong>Stripe:</strong> Pay online using credit/debit card
                        </li>
                        <li>
                          <strong>PayNow:</strong> Use Singapore's PayNow to UEN: 202220420R
                        </li>
                      </ul>
                    </Alert>
                    
                    <Form onSubmit={submitPaymentProof}>
                      <Form.Group className="mb-3" controlId="paymentProof">
                        <Form.Label>Payment Proof</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Enter payment reference or receipt URL"
                          value={paymentProof}
                          onChange={handlePaymentProofChange}
                          required
                        />
                        <Form.Text className="text-muted">
                          Please provide the payment reference number or upload the receipt to a file 
                          sharing service and paste the link here.
                        </Form.Text>
                      </Form.Group>
                      
                      <Button 
                        type="submit" 
                        variant="primary" 
                        disabled={paymentLoading}
                      >
                        {paymentLoading ? 'Submitting...' : 'Submit Payment Proof'}
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              )} */}
              {currentUser &&
                currentUser.role === "enduser" &&
                booking.status !== "cancelled" &&
                booking.paymentStatus !== "paid" && (
                  <Card className="mb-4">
                    <Card.Body>
                      <Card.Title as="h3">Make Payment</Card.Title>

                      <p>
                        Please proceed to make a secure payment for your
                        booking.
                      </p>

                      <StripeCheckout bookingId={booking._id} />
                    </Card.Body>
                  </Card>
                )}
              {/* Status update for service providers */}
              {currentUser &&
                currentUser.role === "jobseeker" &&
                booking.status !== "cancelled" &&
                booking.status !== "completed" && (
                  <Card className="mb-4">
                    <Card.Body>
                      <Card.Title as="h3">Update Booking Status</Card.Title>
                      {statusError && (
                        <Message variant="danger">{statusError}</Message>
                      )}
                      {statusSuccess && (
                        <Message variant="success">{statusSuccess}</Message>
                      )}

                      <div className="d-flex">
                        <Form.Select
                          value={updateStatus}
                          onChange={handleStatusChange}
                          className="me-2"
                        >
                          <option value="">Select status</option>
                          {booking.paymentStatus === "paid" &&
                            booking.status === "pending" && (
                              <option value="confirmed">Confirm</option>
                            )}
                          {booking.status === "confirmed" && (
                            <option value="completed">Mark as Completed</option>
                          )}
                          {(booking.status === "pending" ||
                            booking.status === "confirmed") && (
                            <option value="cancelled">Cancel</option>
                          )}
                        </Form.Select>

                        <Button
                          onClick={updateBookingStatus}
                          disabled={!updateStatus || statusLoading}
                          variant="primary"
                        >
                          {statusLoading ? "Updating..." : "Update Status"}
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                )}

              {/* Report issue button */}
              {booking.status !== "cancelled" && (
                <Card>
                  <Card.Body className="d-flex justify-content-between align-items-center">
                    <div>
                      <h4 className="mb-0">Having issues with this booking?</h4>
                      <p className="text-muted mb-0">
                        Report a problem to get support from our team
                      </p>
                    </div>
                    <Button variant="outline-danger" onClick={createDispute}>
                      <FaExclamationTriangle className="me-2" />
                      Report Issue
                    </Button>
                  </Card.Body>
                </Card>
              )}
            </Col>

            <Col md={4}>
              <Card className="mb-4">
                <Card.Body>
                  <Card.Title as="h3">Contact Information</Card.Title>
                  <Card.Subtitle className="mb-3">
                    Service Provider
                  </Card.Subtitle>
                  <ListGroup variant="flush">
                    <ListGroup.Item>
                      <strong>Name:</strong> {booking.jobseeker.user.name}
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <strong>Email:</strong> {booking.jobseeker.user.email}
                    </ListGroup.Item>
                    {booking.jobseeker.user.phone && (
                      <ListGroup.Item>
                        <strong>Phone:</strong> {booking.jobseeker.user.phone}
                      </ListGroup.Item>
                    )}
                  </ListGroup>

                  <Card.Subtitle className="mt-4 mb-3">Client</Card.Subtitle>
                  <ListGroup variant="flush">
                    <ListGroup.Item>
                      <strong>Name:</strong> {booking.endUser.name}
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <strong>Email:</strong> {booking.endUser.email}
                    </ListGroup.Item>
                    {booking.endUser.phone && (
                      <ListGroup.Item>
                        <strong>Phone:</strong> {booking.endUser.phone}
                      </ListGroup.Item>
                    )}
                  </ListGroup>
                </Card.Body>
              </Card>

              <Card>
                <Card.Body>
                  <Card.Title as="h3">Booking Timeline</Card.Title>
                  <ListGroup variant="flush">
                    <ListGroup.Item>
                      <div className="d-flex justify-content-between">
                        <strong>Created:</strong>
                        <span>
                          {new Date(booking.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </ListGroup.Item>

                    {booking.updatedAt &&
                      booking.updatedAt !== booking.createdAt && (
                        <ListGroup.Item>
                          <div className="d-flex justify-content-between">
                            <strong>Updated:</strong>
                            <span>
                              {new Date(booking.updatedAt).toLocaleString()}
                            </span>
                          </div>
                        </ListGroup.Item>
                      )}

                    {/* {booking.status === "confirmed" && (
                      <ListGroup.Item>
                        <div className="d-flex justify-content-between">
                          <strong>Confirmed:</strong>
                          <span>
                            {new Date(booking.updatedAt).toLocaleString()}
                          </span>
                        </div>
                      </ListGroup.Item>
                    )} */}

                    {booking.status === "confirmed" &&
                      jobseeker.calendlyLink &&
                      !booking.calendlyEventUri && (
                        <Card className="mb-4">
                          <Card.Body>
                            <Card.Title as="h3">
                              Schedule Your Appointment
                            </Card.Title>
                            <p>
                              Your booking is confirmed. Please use the calendar
                              below to select a specific time:
                            </p>

                            <CalendlyEmbed
                              calendlyUrl={jobseeker.calendlyLink}
                              bookingData={booking}
                              onEventScheduled={(e) => {
                                // Refresh booking data after scheduling
                                fetchBookingDetails();
                              }}
                            />
                          </Card.Body>
                        </Card>
                      )}
                    {booking.calendlyEventUri && (
                      <Card className="mb-4">
                        <Card.Body>
                          <Card.Title as="h3">Appointment Details</Card.Title>
                          <p>
                            Your appointment has been scheduled. You should
                            receive confirmation and details via email.
                          </p>
                          <Button
                            variant="outline-primary"
                            href={`https://calendly.com/reschedule/${booking.calendlyEventUri
                              .split("/")
                              .pop()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Reschedule Appointment
                          </Button>
                        </Card.Body>
                      </Card>
                    )}
                    {booking.status === "completed" && (
                      <ListGroup.Item>
                        <div className="d-flex justify-content-between">
                          <strong>Completed:</strong>
                          <span>
                            {new Date(booking.updatedAt).toLocaleString()}
                          </span>
                        </div>
                      </ListGroup.Item>
                    )}

                    {booking.status === "cancelled" && (
                      <ListGroup.Item>
                        <div className="d-flex justify-content-between">
                          <strong>Cancelled:</strong>
                          <span>
                            {new Date(booking.updatedAt).toLocaleString()}
                          </span>
                        </div>
                      </ListGroup.Item>
                    )}
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </>
  );
};

export default BookingDetailScreen;
