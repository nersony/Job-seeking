import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Form, Button, Row, Col } from 'react-bootstrap';
import Message from '../components/Message';
import Loader from '../components/Loader';
import FormContainer from '../components/FormContainer';
import { useAuth } from '../contexts/AuthContext';

const RegisterScreen = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'enduser',
    serviceCategory: '',
    hourlyRate: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, register } = useAuth();
  
  const redirect = location.search ? location.search.split('=')[1] : '/';

  const { 
    name, 
    email, 
    password, 
    confirmPassword,
    phone,
    role,
    serviceCategory,
    hourlyRate
  } = formData;

  useEffect(() => {
    if (currentUser) {
      navigate(redirect);
    }
  }, [currentUser, navigate, redirect]);

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      
      const userData = {
        name,
        email,
        password,
        phone,
        role
      };

      // Add jobseeker-specific fields if registering as a jobseeker
      if (role === 'jobseeker') {
        if (!serviceCategory) {
          setError('Please select a service category');
          setLoading(false);
          return;
        }
        
        if (!hourlyRate || hourlyRate <= 0) {
          setError('Please enter a valid hourly rate');
          setLoading(false);
          return;
        }
        
        userData.serviceCategory = serviceCategory;
        userData.hourlyRate = hourlyRate;
      }

      await register(userData);
      navigate(redirect);
    } catch (error) {
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : 'An error occurred during registration'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <h1>Register</h1>
      {error && <Message variant="danger">{error}</Message>}
      {loading && <Loader />}
      <Form onSubmit={submitHandler}>
        <Form.Group className="mb-3" controlId="name">
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter name"
            name="name"
            value={name}
            onChange={onChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="email">
          <Form.Label>Email Address</Form.Label>
          <Form.Control
            type="email"
            placeholder="Enter email"
            name="email"
            value={email}
            onChange={onChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="phone">
          <Form.Label>Phone Number</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter phone number"
            name="phone"
            value={phone}
            onChange={onChange}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            placeholder="Enter password"
            name="password"
            value={password}
            onChange={onChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="confirmPassword">
          <Form.Label>Confirm Password</Form.Label>
          <Form.Control
            type="password"
            placeholder="Confirm password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={onChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="role">
          <Form.Label>Register as</Form.Label>
          <Form.Select 
            name="role" 
            value={role} 
            onChange={onChange}
          >
            <option value="enduser">Service Seeker</option>
            <option value="jobseeker">Service Provider</option>
          </Form.Select>
        </Form.Group>

        {role === 'jobseeker' && (
          <>
            <Form.Group className="mb-3" controlId="serviceCategory">
              <Form.Label>Service Category</Form.Label>
              <Form.Select
                name="serviceCategory"
                value={serviceCategory}
                onChange={onChange}
                required={role === 'jobseeker'}
              >
                <option value="">Select a service category</option>
                <option value="caregiving">Caregiving</option>
                <option value="counselling">Counselling</option>
                <option value="infant_care">Infant Care</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="hourlyRate">
              <Form.Label>Hourly Rate ($)</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter your hourly rate"
                name="hourlyRate"
                value={hourlyRate}
                onChange={onChange}
                min="1"
                step="0.01"
                required={role === 'jobseeker'}
              />
            </Form.Group>
          </>
        )}

        <Button variant="primary" type="submit" className="w-100" disabled={loading}>
          Register
        </Button>
      </Form>

      <Row className="py-3">
        <Col>
          Already have an account?{' '}
          <Link to={redirect ? `/login?redirect=${redirect}` : '/login'}>
            Login
          </Link>
        </Col>
      </Row>
    </FormContainer>
  );
};

export default RegisterScreen;