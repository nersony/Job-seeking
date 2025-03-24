import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Row, Col, Form, Button, Card } from 'react-bootstrap';
import JobseekerCard from '../components/JobseekerCard';
import Message from '../components/Message';
import Loader from '../components/Loader';
import { useAuth } from '../contexts/AuthContext';

const JobseekerListScreen = () => {
  const [jobseekers, setJobseekers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    serviceCategory: '',
    minRating: '',
    maxRate: ''
  });

  const { API } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const categoryParam = queryParams.get('serviceCategory');

  useEffect(() => {
    if (categoryParam) {
      setFilters(prev => ({ ...prev, serviceCategory: categoryParam }));
    }
    
    fetchJobseekers();
  }, [categoryParam]);

  const fetchJobseekers = async () => {
    try {
      setLoading(true);
      
      let queryString = '';
      if (filters.serviceCategory) {
        queryString += `serviceCategory=${filters.serviceCategory}&`;
      }
      
      const res = await API.get(`/jobseekers${queryString ? `?${queryString}` : ''}`);
      setJobseekers(res.data.jobseekers);
      setError('');
    } catch (error) {
      console.error('Error fetching jobseekers:', error);
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : 'Failed to load jobseekers'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    fetchJobseekers();
  };

  const clearFilters = () => {
    setFilters({
      serviceCategory: '',
      minRating: '',
      maxRate: ''
    });
    fetchJobseekers();
  };

  const filteredJobseekers = jobseekers.filter(jobseeker => {
    let match = true;
    
    if (filters.minRating && jobseeker.rating < parseFloat(filters.minRating)) {
      match = false;
    }
    
    if (filters.maxRate && jobseeker.hourlyRate > parseFloat(filters.maxRate)) {
      match = false;
    }
    
    return match;
  });

  return (
    <>
      <h1>Find Service Providers</h1>
      <Row className="mb-4">
        <Col md={3}>
          <Card>
            <Card.Body>
              <h4>Filters</h4>
              <Form>
                <Form.Group className="mb-3" controlId="serviceCategory">
                  <Form.Label>Service Type</Form.Label>
                  <Form.Select
                    name="serviceCategory"
                    value={filters.serviceCategory}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Services</option>
                    <option value="caregiving">Caregiving</option>
                    <option value="counselling">Counselling</option>
                    <option value="infant_care">Infant Care</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3" controlId="minRating">
                  <Form.Label>Minimum Rating</Form.Label>
                  <Form.Select
                    name="minRating"
                    value={filters.minRating}
                    onChange={handleFilterChange}
                  >
                    <option value="">Any Rating</option>
                    <option value="4">4+ Stars</option>
                    <option value="3">3+ Stars</option>
                    <option value="2">2+ Stars</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3" controlId="maxRate">
                  <Form.Label>Maximum Hourly Rate ($)</Form.Label>
                  <Form.Control
                    type="number"
                    name="maxRate"
                    value={filters.maxRate}
                    onChange={handleFilterChange}
                    placeholder="Any price"
                    min="0"
                  />
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button variant="primary" onClick={applyFilters}>
                    Apply Filters
                  </Button>
                  <Button variant="outline-secondary" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col md={9}>
          {loading ? (
            <Loader />
          ) : error ? (
            <Message variant="danger">{error}</Message>
          ) : (
            <>
              <Row>
                <Col>
                  <h2>
                    {filters.serviceCategory
                      ? `${filters.serviceCategory.replace('_', ' ').charAt(0).toUpperCase() + filters.serviceCategory.replace('_', ' ').slice(1)} Services`
                      : 'All Services'}
                  </h2>
                  <p>{filteredJobseekers.length} providers found</p>
                </Col>
              </Row>
              {filteredJobseekers.length === 0 ? (
                <Message>No service providers found matching your criteria</Message>
              ) : (
                <Row>
                  {filteredJobseekers.map((jobseeker) => (
                    <Col key={jobseeker._id} md={6} lg={4} className="mb-4">
                      <JobseekerCard jobseeker={jobseeker} />
                    </Col>
                  ))}
                </Row>
              )}
            </>
          )}
        </Col>
      </Row>
    </>
  );
};

export default JobseekerListScreen;