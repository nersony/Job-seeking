import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Button,
  Badge,
  ListGroup,
  Tabs,
  Tab,
  Alert,
  Spinner
} from "react-bootstrap";
import Rating from "../components/Rating";
import Message from "../components/Message";
import Loader from "../components/Loader";
import SimplifiedCalendar from "../components/SimplifiedCalendar";
import { useAuth } from "../contexts/AuthContext";

const JobseekerDetailScreen = () => {
  const [jobseeker, setJobseeker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState("");

  const { id } = useParams();
  const navigate = useNavigate();
  const { API, currentUser } = useAuth();

  useEffect(() => {
    const fetchJobseekerDetails = async () => {
      try {
        setLoading(true);
        const res = await API.get(`/jobseekers/${id}`);
        setJobseeker(res.data.jobseeker);
        setError("");
      } catch (error) {
        console.error("Error fetching jobseeker details:", error);
        setError(
          error.response && error.response.data.message
            ? error.response.data.message
            : "Failed to load jobseeker details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchJobseekerDetails();
  }, [id, API]);

  const bookHandler = () => {
    // Redirect to booking page with this jobseeker
    navigate(`/book/${id}`);
  };

  // Handler for calendar loading state
  const handleCalendarLoadingState = (isLoading) => {
    setCalendarLoading(isLoading);
  };

  // Handler for calendar errors
  const handleCalendarError = (errorMessage) => {
    setCalendarError(errorMessage);
  };

  return (
    <>
      <Link to="/jobseekers" className="btn btn-light my-3">
        Back to Service Providers
      </Link>

      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error}</Message>
      ) : jobseeker ? (
        <>
          <Row>
            <Col md={4}>
              <Card className="mb-4">
                <Card.Body>
                  <h1>{jobseeker.user.name}</h1>
                  <Card.Text>
                    <Badge
                      bg="primary"
                      className="mb-2"
                      style={{ fontSize: "1rem" }}
                    >
                      {jobseeker.serviceCategory
                        .replace("_", " ")
                        .charAt(0)
                        .toUpperCase() +
                        jobseeker.serviceCategory.replace("_", " ").slice(1)}
                    </Badge>
                  </Card.Text>

                  <div className="mb-3">
                    <Rating
                      value={jobseeker.rating}
                      text={`${jobseeker.totalRatings} reviews`}
                    />
                  </div>

                  <Card.Text className="mb-3">
                    <strong>Hourly Rate:</strong> ${jobseeker.hourlyRate}
                  </Card.Text>

                  {jobseeker.isAvailable ? (
                    <Badge bg="success" className="mb-3">
                      Available
                    </Badge>
                  ) : (
                    <Badge bg="secondary" className="mb-3">
                      Currently Unavailable
                    </Badge>
                  )}

                  {currentUser && currentUser.role === "enduser" && (
                    <div className="d-grid gap-2">
                      <Button
                        onClick={bookHandler}
                        variant="primary"
                        disabled={!jobseeker.isAvailable}
                      >
                        Book Now
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>

              <Card className="mb-4">
                <Card.Body>
                  <h4>Contact Information</h4>
                  <ListGroup variant="flush">
                    <ListGroup.Item>
                      <strong>Email:</strong> {jobseeker.user.email}
                    </ListGroup.Item>
                    {jobseeker.user.phone && (
                      <ListGroup.Item>
                        <strong>Phone:</strong> {jobseeker.user.phone}
                      </ListGroup.Item>
                    )}
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>

            <Col md={8}>
              <Tabs defaultActiveKey="profile" className="mb-4">
                <Tab eventKey="profile" title="Profile">
                  <Card>
                    <Card.Body>
                      <h3>About</h3>
                      <p>{jobseeker.bio || "No bio provided"}</p>

                      <h3>Skills</h3>
                      {jobseeker.skills && jobseeker.skills.length > 0 ? (
                        <div className="mb-3">
                          {jobseeker.skills.map((skill, index) => (
                            <Badge
                              key={index}
                              bg="secondary"
                              className="me-2 mb-2"
                              style={{ fontSize: "0.9rem" }}
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p>No skills listed</p>
                      )}

                      <h3>Certifications</h3>
                      {jobseeker.certifications &&
                      jobseeker.certifications.length > 0 ? (
                        <ListGroup className="mb-3">
                          {jobseeker.certifications.map((cert, index) => (
                            <ListGroup.Item key={index}>
                              <strong>{cert.name}</strong> - {cert.issuer}
                              <div className="text-muted">
                                Obtained:{" "}
                                {new Date(
                                  cert.dateObtained
                                ).toLocaleDateString()}
                                {cert.expiryDate &&
                                  ` | Expires: ${new Date(
                                    cert.expiryDate
                                  ).toLocaleDateString()}`}
                              </div>
                              {cert.isVerified && (
                                <Badge bg="success">Verified</Badge>
                              )}
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      ) : (
                        <p>No certifications listed</p>
                      )}
                    </Card.Body>
                  </Card>
                </Tab>

                <Tab eventKey="availability" title="Availability">
                  <Card>
                    <Card.Body>
                      <h3>Provider's Availability</h3>
                      {jobseeker.calendlyLink ? (
                        <>
                          {calendarError && (
                            <Alert variant="warning" className="mb-3">
                              {calendarError}. You can still book using the button below.
                            </Alert>
                          )}

                          <SimplifiedCalendar 
                            calendlyLink={jobseeker.calendlyLink}
                          />

                          <div className="text-center mt-4">
                            <p className="mb-2">
                              Want to book an appointment with this provider?
                            </p>
                            <Button
                              onClick={bookHandler}
                              variant="primary"
                              size="lg"
                              disabled={!jobseeker.isAvailable}
                            >
                              Book This Provider
                            </Button>
                          </div>
                        </>
                      ) : (
                        <Alert variant="info">
                          <p className="mb-0">
                            This provider hasn't set up their scheduling calendar
                            yet. Please use the "Book Now" button to proceed with
                            booking.
                          </p>
                        </Alert>
                      )}
                    </Card.Body>
                  </Card>
                </Tab>

                <Tab eventKey="reviews" title="Reviews">
                  <Card>
                    <Card.Body>
                      <h3>Client Reviews</h3>
                      {/* Reviews would be implemented here */}
                      <p>No reviews available yet.</p>
                    </Card.Body>
                  </Card>
                </Tab>
              </Tabs>
            </Col>
          </Row>
        </>
      ) : (
        <Message>Jobseeker not found</Message>
      )}
    </>
  );
};

export default JobseekerDetailScreen;