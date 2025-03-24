import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaUserNurse, FaUserMd, FaBaby } from 'react-icons/fa';

const HomeScreen = () => {
  return (
    <Container>
      <Row className="align-items-center my-5">
        <Col md={6}>
          <h1>Find Trusted Caregivers and Counselors</h1>
          <p className="lead">
            Connect with certified professionals to meet your caregiving, counseling, 
            and infant care needs.
          </p>
          <Link to="/jobseekers">
            <Button variant="primary" size="lg">Find Professionals</Button>
          </Link>
        </Col>
        <Col md={6}>
          <img
            src="/images/caregiving-hero.jpg"
            alt="Caregiving"
            className="img-fluid rounded"
          />
        </Col>
      </Row>

      <h2 className="text-center my-5">Our Services</h2>
      <Row>
        <Col md={4}>
          <Card className="service-card mb-4">
            <Card.Body className="text-center">
              <FaUserNurse size={50} className="mb-3 text-primary" />
              <Card.Title>Caregiving</Card.Title>
              <Card.Text>
                Professional caregivers for elderly, disabled, or those recovering from illness or surgery.
              </Card.Text>
              <Link to="/jobseekers?serviceCategory=caregiving">
                <Button variant="outline-primary">Find Caregivers</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="service-card mb-4">
            <Card.Body className="text-center">
              <FaUserMd size={50} className="mb-3 text-primary" />
              <Card.Title>Counselling</Card.Title>
              <Card.Text>
                Certified counselors to provide support for mental health, relationships, and personal growth.
              </Card.Text>
              <Link to="/jobseekers?serviceCategory=counselling">
                <Button variant="outline-primary">Find Counselors</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="service-card mb-4">
            <Card.Body className="text-center">
              <FaBaby size={50} className="mb-3 text-primary" />
              <Card.Title>Infant Care</Card.Title>
              <Card.Text>
                Experienced specialists in infant care, development, and early childhood education.
              </Card.Text>
              <Link to="/jobseekers?serviceCategory=infant_care">
                <Button variant="outline-primary">Find Infant Care Specialists</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="my-5">
        <Col md={12}>
          <Card className="bg-light">
            <Card.Body className="text-center p-5">
              <h3>Are you a caregiver, counselor, or infant care specialist?</h3>
              <p className="lead">
                Join our platform to connect with clients and grow your business.
              </p>
              <Link to="/register">
                <Button variant="primary">Join as a Provider</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default HomeScreen;