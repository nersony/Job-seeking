// frontend/src/screens/ProfileScreen.js
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Form,
  Button,
  Row,
  Col,
  Card,
  ListGroup,
  Badge,
  Tabs, Tab,
  Alert
} from "react-bootstrap";
import { FaCalendarAlt, FaLink } from "react-icons/fa";
import Message from "../components/Message";
import Loader from "../components/Loader";
import AvailabilitySettings from '../components/AvailabilitySettings';
import { useAuth } from "../contexts/AuthContext";

const ProfileScreen = () => {
  const { currentUser, updateProfile, API } = useAuth();
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    address: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
  });

  const [jobseekerData, setJobseekerData] = useState({
    bio: "",
    skills: [],
    hourlyRate: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobseekerProfile, setJobseekerProfile] = useState(null);
  const [skillInput, setSkillInput] = useState("");
  const [certifications, setCertifications] = useState([]);
  const [showCalendlySuccess, setShowCalendlySuccess] = useState(false);
  const [newCertification, setNewCertification] = useState({
    name: "",
    issuer: "",
    dateObtained: "",
    expiryDate: "",
    documentUrl: "",
  });
  // For Calendly connection
  const [calendlyConnected, setCalendlyConnected] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    } else {
      setUserData({
        name: currentUser.name || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        password: "",
        confirmPassword: "",
        address: {
          street: currentUser.address?.street || "",
          city: currentUser.address?.city || "",
          state: currentUser.address?.state || "",
          postalCode: currentUser.address?.postalCode || "",
          country: currentUser.address?.country || "",
        },
      });
      // Check for error in URL params (from Calendly OAuth redirect)
      const urlParams = new URLSearchParams(location.search);
      const errorMessage = urlParams.get('error');

      if (errorMessage) {
        setError(decodeURIComponent(errorMessage));
        // Clear the error from the URL to prevent showing it again on refresh
        navigate(location.pathname, { replace: true });
      }
      // If location has calendarConnected state, show success message
      if (location.state?.calendarConnected) {
        setShowCalendlySuccess(true);
        // Clear the state after showing the message
        navigate(location.pathname, { replace: true });
      }

      // If user is a jobseeker, fetch jobseeker profile
      if (currentUser.role === "jobseeker") {
        const fetchJobseekerProfile = async () => {
          try {
            const res = await API.get("/users/profile");
            if (res.data.user.jobseekerProfile) {
              const profile = res.data.user.jobseekerProfile;
              setJobseekerProfile(profile);
              setJobseekerData({
                bio: profile.bio || "",
                skills: profile.skills || [],
                hourlyRate: profile.hourlyRate || "",
              });
              setCertifications(profile.certifications || []);

              // Check if Calendly is connected
              setCalendlyConnected(
                !!profile.calendlyAccessToken &&
                !!profile.calendlyUri
              );
            }
          } catch (error) {
            console.error("Error fetching jobseeker profile:", error);
            setError("Failed to load jobseeker profile");
          }
        };

        fetchJobseekerProfile();
      }
    }
  }, [currentUser, navigate, API, location]);

  const onUserDataChange = (e) => {
    if (e.target.name.includes(".")) {
      const [parent, child] = e.target.name.split(".");
      setUserData({
        ...userData,
        [parent]: {
          ...userData[parent],
          [child]: e.target.value,
        },
      });
    } else {
      setUserData({ ...userData, [e.target.name]: e.target.value });
    }
  };

  const onJobseekerDataChange = (e) => {
    setJobseekerData({ ...jobseekerData, [e.target.name]: e.target.value });
  };

  const addSkill = () => {
    if (
      skillInput.trim() &&
      !jobseekerData.skills.includes(skillInput.trim())
    ) {
      setJobseekerData({
        ...jobseekerData,
        skills: [...jobseekerData.skills, skillInput.trim()],
      });
      setSkillInput("");
    }
  };

  const removeSkill = (skill) => {
    setJobseekerData({
      ...jobseekerData,
      skills: jobseekerData.skills.filter((s) => s !== skill),
    });
  };

  const onCertificationChange = (e) => {
    setNewCertification({
      ...newCertification,
      [e.target.name]: e.target.value,
    });
  };

  const addCertification = async (e) => {
    e.preventDefault();

    if (
      !newCertification.name ||
      !newCertification.issuer ||
      !newCertification.dateObtained ||
      !newCertification.documentUrl
    ) {
      setError("Please fill all required certification fields");
      return;
    }

    try {
      setLoading(true);
      const res = await API.put("/jobseekers/certifications", newCertification);

      setCertifications([...certifications, res.data.certification]);

      setNewCertification({
        name: "",
        issuer: "",
        dateObtained: "",
        expiryDate: "",
        documentUrl: "",
      });

      setMessage("Certification added successfully");
      setError("");
    } catch (error) {
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : "Failed to add certification"
      );
    } finally {
      setLoading(false);
    }
  };

  const connectCalendly = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/calendly/auth/url?userId=${currentUser._id}`);
      window.location.href = res.data.authUrl;
    } catch (error) {
      console.error('Error getting Calendly auth URL:', error);
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : "Failed to connect Calendly"
      );
      setLoading(false);
    }
  };

  const submitUserProfileHandler = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (userData.password !== userData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      const updatedData = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        address: userData.address,
      };

      if (userData.password) {
        updatedData.password = userData.password;
      }

      // If user is a jobseeker, include jobseeker profile data
      if (currentUser.role === "jobseeker") {
        updatedData.jobseekerProfile = {
          bio: jobseekerData.bio,
          skills: jobseekerData.skills,
          hourlyRate: jobseekerData.hourlyRate
        };
      }

      await updateProfile(updatedData);
      setMessage("Profile updated successfully");
    } catch (error) {
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : "Failed to update profile"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row>
      {showCalendlySuccess && (
        <Col md={12} className="mb-4">
          <Alert
            variant="success"
            onClose={() => setShowCalendlySuccess(false)}
            dismissible
          >
            <Alert.Heading>Calendly Connected Successfully!</Alert.Heading>
            <p>
              Your Calendly account has been successfully connected to your profile.
              You can now manage your availability and allow clients to book appointments directly through your schedule.
            </p>
          </Alert>
        </Col>
      )}

      <Col md={4}>
        <h2>User Profile</h2>
        {message && <Message variant="success">{message}</Message>}
        {error && <Message variant="danger">{error}</Message>}
        {loading && <Loader />}
        <Form onSubmit={submitUserProfileHandler}>
          <Form.Group className="mb-3" controlId="name">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter name"
              name="name"
              value={userData.name}
              onChange={onUserDataChange}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="email">
            <Form.Label>Email Address</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter email"
              name="email"
              value={userData.email}
              onChange={onUserDataChange}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="phone">
            <Form.Label>Phone Number</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter phone number"
              name="phone"
              value={userData.phone}
              onChange={onUserDataChange}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Enter new password"
              name="password"
              value={userData.password}
              onChange={onUserDataChange}
            />
            <Form.Text className="text-muted">
              Leave blank to keep current password
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3" controlId="confirmPassword">
            <Form.Label>Confirm Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Confirm new password"
              name="confirmPassword"
              value={userData.confirmPassword}
              onChange={onUserDataChange}
            />
          </Form.Group>

          <h4 className="mt-4">Address</h4>
          <Form.Group className="mb-3" controlId="street">
            <Form.Label>Street</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter street"
              name="address.street"
              value={userData.address.street}
              onChange={onUserDataChange}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="city">
            <Form.Label>City</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter city"
              name="address.city"
              value={userData.address.city}
              onChange={onUserDataChange}
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="state">
                <Form.Label>State</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter state"
                  name="address.state"
                  value={userData.address.state}
                  onChange={onUserDataChange}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="postalCode">
                <Form.Label>Postal Code</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter postal code"
                  name="address.postalCode"
                  value={userData.address.postalCode}
                  onChange={onUserDataChange}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3" controlId="country">
            <Form.Label>Country</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter country"
              name="address.country"
              value={userData.address.country}
              onChange={onUserDataChange}
            />
          </Form.Group>

          <Button
            type="submit"
            variant="primary"
            className="w-100"
            disabled={loading}
          >
            Update Profile
          </Button>
        </Form>
      </Col>

      {currentUser && currentUser.role === "jobseeker" && (
        <Col md={8}>
          <h2>Job Provider Profile</h2>
          <Card className="mb-4">
            <Card.Body>
              <Tabs defaultActiveKey="availability" className="mb-3">
                {/* Other existing tabs */}
                <Tab eventKey="availability" title="Availability">
                  <AvailabilitySettings />
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Body>
              <h4>Bio and Service Information</h4>
              <Form.Group className="mb-3" controlId="bio">
                <Form.Label>Bio</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Tell clients about yourself and your services"
                  name="bio"
                  value={jobseekerData.bio}
                  onChange={onJobseekerDataChange}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="hourlyRate">
                <Form.Label>Hourly Rate ($)</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="Enter your hourly rate"
                  name="hourlyRate"
                  value={jobseekerData.hourlyRate}
                  onChange={onJobseekerDataChange}
                  min="1"
                  step="0.01"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Skills</Form.Label>
                <div className="d-flex">
                  <Form.Control
                    type="text"
                    placeholder="Add a skill"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addSkill())
                    }
                  />
                  <Button
                    variant="outline-primary"
                    className="ms-2"
                    onClick={addSkill}
                  >
                    Add
                  </Button>
                </div>
                <div className="mt-2">
                  {jobseekerData.skills.map((skill, index) => (
                    <Button
                      key={index}
                      variant="outline-secondary"
                      size="sm"
                      className="me-2 mb-2"
                      onClick={() => removeSkill(skill)}
                    >
                      {skill} &times;
                    </Button>
                  ))}
                </div>
              </Form.Group>

              <Button
                type="button"
                variant="primary"
                onClick={submitUserProfileHandler}
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Profile Information'}
              </Button>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <h4>Certifications</h4>
              <ListGroup className="mb-3">
                {certifications.map((cert, index) => (
                  <ListGroup.Item key={index}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{cert.name}</strong> - {cert.issuer}
                        <div className="text-muted">
                          Obtained:{" "}
                          {new Date(cert.dateObtained).toLocaleDateString()}
                          {cert.expiryDate &&
                            ` | Expires: ${new Date(
                              cert.expiryDate
                            ).toLocaleDateString()}`}
                        </div>
                      </div>
                      <div>
                        {cert.isVerified ? (
                          <Badge bg="success">Verified</Badge>
                        ) : (
                          <Badge bg="warning">Pending Verification</Badge>
                        )}
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
                {certifications.length === 0 && (
                  <ListGroup.Item>No certifications added yet</ListGroup.Item>
                )}
              </ListGroup>

              <h5>Add New Certification</h5>
              <Form onSubmit={addCertification}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="certName">
                      <Form.Label>Certification Name</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter certification name"
                        name="name"
                        value={newCertification.name}
                        onChange={onCertificationChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="certIssuer">
                      <Form.Label>Issuing Organization</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter issuer name"
                        name="issuer"
                        value={newCertification.issuer}
                        onChange={onCertificationChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="certDateObtained">
                      <Form.Label>Date Obtained</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateObtained"
                        value={newCertification.dateObtained}
                        onChange={onCertificationChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="certExpiryDate">
                      <Form.Label>Expiry Date (if applicable)</Form.Label>
                      <Form.Control
                        type="date"
                        name="expiryDate"
                        value={newCertification.expiryDate}
                        onChange={onCertificationChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3" controlId="certDocumentUrl">
                  <Form.Label>Document URL</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter URL to your certification document"
                    name="documentUrl"
                    value={newCertification.documentUrl}
                    onChange={onCertificationChange}
                    required
                  />
                  <Form.Text className="text-muted">
                    Upload your certificate to a file hosting service and paste
                    the link here
                  </Form.Text>
                </Form.Group>

                <Button type="submit" variant="primary" disabled={loading}>
                  Add Certification
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      )}
    </Row>
  );
};

export default ProfileScreen;