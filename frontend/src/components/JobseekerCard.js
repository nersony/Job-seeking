import React from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Rating from './Rating';

const JobseekerCard = ({ jobseeker }) => {
  return (
    <Card className="service-card mb-4">
      <Card.Body>
        <Card.Title>{jobseeker.user.name}</Card.Title>
        <Badge bg="primary" className="mb-2">
          {jobseeker.serviceCategory.replace('_', ' ')}
        </Badge>
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
        <Link to={`/jobseekers/${jobseeker._id}`}>
          <Button variant="outline-primary">View Profile</Button>
        </Link>
      </Card.Body>
    </Card>
  );
};

export default JobseekerCard;