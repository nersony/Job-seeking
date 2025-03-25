// frontend/src/components/CalendlyAvailabilityFilter.js
import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { FaCalendarAlt, FaClock, FaSearch } from 'react-icons/fa';

const CalendlyAvailabilityFilter = ({ onFilterApplied, loading }) => {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [error, setError] = useState('');

  const validateInputs = () => {
    if (!startDate || !startTime || !endDate || !endTime) {
      setError('Please select both start and end date/time');
      return false;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    const now = new Date();

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      setError('Invalid date/time format');
      return false;
    }

    if (startDateTime < now) {
      setError('Start date/time must be in the future');
      return false;
    }

    if (endDateTime <= startDateTime) {
      setError('End time must be after start time');
      return false;
    }

    // Calculate duration in minutes
    const durationMinutes = (endDateTime - startDateTime) / (1000 * 60);

    if (durationMinutes < 30) {
      setError('Minimum booking duration is 30 minutes');
      return false;
    }

    if (durationMinutes > 480) { // 8 hours
      setError('Maximum booking duration is 8 hours');
      return false;
    }

    setError('');
    return true;
  };

  const handleApplyFilter = (e) => {
    e.preventDefault();
  
    if (!validateInputs()) {
      return;
    }
  
    // Format in ISO 8601 format for API
    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(`${endDate}T${endTime}:00`);
  
    console.log('Filter start date/time:', startDateTime.toISOString());
    console.log('Filter end date/time:', endDateTime.toISOString());
  
    const filters = {
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      serviceCategory: serviceCategory || undefined
    };
  
    console.log('Applying filters:', filters);
    onFilterApplied(filters);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setServiceCategory('');
    setError('');
    
    onFilterApplied(null);
  };

  // Set minimum date to today for the datepickers
  const today = new Date().toISOString().split('T')[0];

  // Auto-fill end date when start date is selected
  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    if (!endDate) {
      setEndDate(e.target.value);
    }
  };

  // Auto-fill end time as start time + 1 hour when start time is selected
  const handleStartTimeChange = (e) => {
    const time = e.target.value;
    setStartTime(time);
    
    if (!endTime) {
      // Add 1 hour to start time
      const [hours, minutes] = time.split(':').map(Number);
      let endHours = hours + 1;
      
      // Handle overflow (e.g., 23:00 + 1 hour)
      if (endHours > 23) {
        endHours = 23;
        // If it's already 23:30 or later, don't auto-set end time
        if (hours === 23 && minutes >= 30) {
          return;
        }
      }
      
      const formattedEndTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      setEndTime(formattedEndTime);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header className="bg-primary text-white">
        <div className="d-flex align-items-center">
          <FaCalendarAlt className="me-2" />
          <h5 className="mb-0">Find Available Professionals by Time</h5>
        </div>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleApplyFilter}>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Row className="mb-3">
            <Form.Group as={Col} md={6} controlId="serviceCategory">
              <Form.Label>Service Type</Form.Label>
              <Form.Select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
              >
                <option value="">All Services</option>
                <option value="caregiving">Caregiving</option>
                <option value="counselling">Counselling</option>
                <option value="infant_care">Infant Care</option>
              </Form.Select>
            </Form.Group>
          </Row>
          
          <Row className="mb-3">
            <Form.Group as={Col} md={6} controlId="startDate">
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                min={today}
                required
              />
            </Form.Group>
            <Form.Group as={Col} md={6} controlId="startTime">
              <Form.Label>Start Time</Form.Label>
              <Form.Control
                type="time"
                value={startTime}
                onChange={handleStartTimeChange}
                required
              />
            </Form.Group>
          </Row>
          
          <Row className="mb-3">
            <Form.Group as={Col} md={6} controlId="endDate">
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || today}
                required
              />
            </Form.Group>
            <Form.Group as={Col} md={6} controlId="endTime">
              <Form.Label>End Time</Form.Label>
              <Form.Control
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </Form.Group>
          </Row>
          
          <div className="d-flex justify-content-between">
            <Button variant="outline-secondary" onClick={handleClearFilter} disabled={loading}>
              Clear
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              <FaSearch className="me-2" />
              {loading ? 'Searching...' : 'Find Available Providers'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default CalendlyAvailabilityFilter;