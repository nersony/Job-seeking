// frontend/src/components/JobseekerCard.js
import React from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaCalendarCheck } from 'react-icons/fa';
import Rating from './Rating';

const JobseekerCard = ({ jobseeker, availabilityFilter }) => {
  // Format a booking link with pre-filled date and time if available
  const getBookingLink = () => {
    if (availabilityFilter) {
      return `/book/${jobseeker._id}?startTime=${encodeURIComponent(availabilityFilter.startDateTime)}&endTime=${encodeURIComponent(availabilityFilter.endDateTime)}`;
    }
    return `/book/${jobseeker._id}`;
  };

  return (
    <Card className="service-card mb-4">
      <Card.Body>
        <Card.Title>{jobseeker.user.name}</Card.Title>
        <Badge bg="primary" className="mb-2">
          {jobseeker.serviceCategory.replace('_', ' ')}
        </Badge>
        
        {jobseeker.calendlyUri && (
          <Badge bg="success" className="ms-2 mb-2">
            <FaCalendarCheck className="me-1" /> Calendar Booking
          </Badge>
        )}
        
        <div className="mb-2">
          <Rating value={jobseeker.rating} text={`${jobseeker.totalRatings} reviews`} />
        </div>
        <Card.Text>
          <strong>Hourly Rate:</strong> ${jobseeker.hourlyRate}
        </Card.Text>
        {jobseeker.bio && (
          <Card.Text>
            {jobseeker.bio.length > 100
              ? `${jobseeker.bio.substring(0, 100)}...`
              : jobseeker.bio}
          </Card.Text>
        )}
        
        <div className="d-flex">
          <Link to={`/jobseekers/${jobseeker._id}`} className="me-2">
            <Button variant="outline-primary">View Profile</Button>
          </Link>
          
          {availabilityFilter && (
            <Link to={getBookingLink()}>
              <Button variant="success">
                <FaCalendarCheck className="me-1" /> Book Now
              </Button>
            </Link>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default JobseekerCard;