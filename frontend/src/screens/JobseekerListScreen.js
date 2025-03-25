// frontend/src/screens/JobseekerListScreen.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Row, Col, Form, Button, Card, Badge } from 'react-bootstrap';
import JobseekerCard from '../components/JobseekerCard';
import CalendlyAvailabilityFilter from '../components/CalendlyAvailabilityFilter';
import Message from '../components/Message';
import Loader from '../components/Loader';
import { useAuth } from '../contexts/AuthContext';

const JobseekerListScreen = () => {
  const [jobseekers, setJobseekers] = useState([]);
  const [filteredJobseekers, setFilteredJobseekers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    serviceCategory: '',
    minRating: '',
    maxRate: ''
  });
  const [activeFilters, setActiveFilters] = useState([]);
  const [availabilityFilter, setAvailabilityFilter] = useState(null);

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
      setFilteredJobseekers(res.data.jobseekers);
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

  const applyStandardFilters = (jobseekerList) => {
    let result = [...jobseekerList];
    const newActiveFilters = [];

    // Service category filter
    if (filters.serviceCategory) {
      result = result.filter(jobseeker =>
        jobseeker.serviceCategory === filters.serviceCategory
      );
      newActiveFilters.push(`Service: ${filters.serviceCategory.replace('_', ' ')}`);
    }

    // Rating filter
    if (filters.minRating) {
      result = result.filter(jobseeker =>
        jobseeker.rating >= parseFloat(filters.minRating)
      );
      newActiveFilters.push(`Rating: ${filters.minRating}+`);
    }

    // Price filter
    if (filters.maxRate) {
      result = result.filter(jobseeker =>
        jobseeker.hourlyRate <= parseFloat(filters.maxRate)
      );
      newActiveFilters.push(`Rate: $${filters.maxRate} or less`);
    }

    return { filteredList: result, newFilters: newActiveFilters };
  };

  // Apply regular filters whenever they change
  useEffect(() => {
    if (!loading) {
      // Don't override availability filters
      if (availabilityFilter) {
        // If we have an availability filter active, we need to reapply standard filters
        // to the already availability-filtered list
        const { filteredList, newFilters } = applyStandardFilters(filteredJobseekers);
        setFilteredJobseekers(filteredList);

        // Make sure we keep the availability filter in the active filters
        const availStartTime = new Date(availabilityFilter.startDateTime).toLocaleString();
        const availEndTime = new Date(availabilityFilter.endDateTime).toLocaleString();

        setActiveFilters([
          ...newFilters,
          `Available: ${availStartTime} - ${availEndTime}`
        ]);
      } else {
        // Normal filter application when no availability filter
        const { filteredList, newFilters } = applyStandardFilters(jobseekers);
        setFilteredJobseekers(filteredList);
        setActiveFilters(newFilters);
      }
    }
  }, [filters, loading]);

  // Handle availability filter
  const handleAvailabilityFilterApplied = async (availabilityFilters) => {
    // If null is passed, clear availability filters
    if (!availabilityFilters) {
      setAvailabilityFilter(null);
      const { filteredList, newFilters } = applyStandardFilters(jobseekers);
      setFilteredJobseekers(filteredList);
      setActiveFilters(newFilters);
      return;
    }

    try {
      setFilterLoading(true);

      // Ensure dates are properly formatted for the API
      const queryParams = new URLSearchParams({
        startTime: availabilityFilters.startDateTime,
        endTime: availabilityFilters.endDateTime
      });

      // Add service category if specified
      if (availabilityFilters.serviceCategory) {
        queryParams.append('serviceCategory', availabilityFilters.serviceCategory);
      }

      console.log('Querying API with params:', queryParams.toString());

      const res = await API.get(`/calendly/available-jobseekers?${queryParams}`);
      console.log('Available jobseekers response:', res.data);

      // Apply standard filters to the available jobseekers
      const { filteredList, newFilters } = applyStandardFilters(res.data.jobseekers || []);

      setFilteredJobseekers(filteredList);
      setAvailabilityFilter(availabilityFilters);

      // Format dates for display
      const startDateTime = new Date(availabilityFilters.startDateTime);
      const endDateTime = new Date(availabilityFilters.endDateTime);

      // Create a readable time range for display
      const timeRange = `${startDateTime.toLocaleDateString()} ${startDateTime.toLocaleTimeString()} - ${startDateTime.toDateString() === endDateTime.toDateString()
          ? endDateTime.toLocaleTimeString()
          : `${endDateTime.toLocaleDateString()} ${endDateTime.toLocaleTimeString()}`
        }`;

      // Update active filters
      setActiveFilters([
        ...newFilters,
        `Available: ${timeRange}`
      ]);
    } catch (error) {
      console.error('Error checking availability:', error);
      setError(
        error.response && error.response.data.message
          ? error.response.data.message
          : 'Failed to check availability'
      );

      // Reset to all jobseekers on error
      const { filteredList, newFilters } = applyStandardFilters(jobseekers);
      setFilteredJobseekers(filteredList);
      setActiveFilters(newFilters);
    } finally {
      setFilterLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      serviceCategory: '',
      minRating: '',
      maxRate: ''
    });
    setAvailabilityFilter(null);
    setFilteredJobseekers(jobseekers);
    setActiveFilters([]);
  };

  // Remove a specific filter
  const removeFilter = (filterToRemove) => {
    if (filterToRemove.startsWith('Service:')) {
      setFilters(prev => ({ ...prev, serviceCategory: '' }));
    } else if (filterToRemove.startsWith('Rating:')) {
      setFilters(prev => ({ ...prev, minRating: '' }));
    } else if (filterToRemove.startsWith('Rate:')) {
      setFilters(prev => ({ ...prev, maxRate: '' }));
    } else if (filterToRemove.startsWith('Available:')) {
      setAvailabilityFilter(null);
      const { filteredList, newFilters } = applyStandardFilters(jobseekers);
      setFilteredJobseekers(filteredList);
      setActiveFilters(newFilters);
    }
  };

  return (
    <>
      <h1>Find Service Providers</h1>

      <CalendlyAvailabilityFilter
        onFilterApplied={handleAvailabilityFilterApplied}
        loading={filterLoading}
      />

      {activeFilters.length > 0 && (
        <div className="mb-3">
          <h5>Active Filters:</h5>
          <div>
            {activeFilters.map((filter, index) => (
              <Badge
                key={index}
                bg="primary"
                className="me-2 mb-2 p-2"
                style={{ fontSize: '0.9rem' }}
              >
                {filter}{' '}
                <span
                  style={{ cursor: 'pointer' }}
                  onClick={() => removeFilter(filter)}
                >
                  &times;
                </span>
              </Badge>
            ))}
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={clearFilters}
              className="mb-2"
            >
              Clear All Filters
            </Button>
          </div>
        </div>
      )}

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
                <Message>
                  {availabilityFilter
                    ? 'No service providers available for the selected time slot. Please try a different time.'
                    : 'No service providers found matching your criteria'
                  }
                </Message>
              ) : (
                <Row>
                  {filteredJobseekers.map((jobseeker) => (
                    <Col key={jobseeker._id} md={6} lg={4} className="mb-4">
                      <JobseekerCard
                        jobseeker={jobseeker}
                        availabilityFilter={availabilityFilter}
                      />
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