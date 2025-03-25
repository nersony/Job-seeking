import React from 'react';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { currentUser, logout } = useAuth();

  return (
    <header>
      <Navbar bg="primary" variant="dark" expand="lg" collapseOnSelect>
        <Container>
          <LinkContainer to="/">
            <Navbar.Brand>Caregiving Platform</Navbar.Brand>
          </LinkContainer>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <LinkContainer to="/jobseekers">
                <Nav.Link>Find Caregivers</Nav.Link>
              </LinkContainer>
              
              {currentUser ? (
                <>
                  {/* Show dashboard link for jobseekers */}
                  {currentUser.role === 'jobseeker' && (
                    <LinkContainer to="/dashboard">
                      <Nav.Link>Dashboard</Nav.Link>
                    </LinkContainer>
                  )}
                  
                  <LinkContainer to="/bookings">
                    <Nav.Link>Bookings</Nav.Link>
                  </LinkContainer>
                  
                  <NavDropdown title={currentUser.name || 'User'} id="username">
                    {currentUser.role === 'jobseeker' ? (
                      <LinkContainer to="/dashboard">
                        <NavDropdown.Item>Dashboard</NavDropdown.Item>
                      </LinkContainer>
                    ) : null}
                    
                    <LinkContainer to="/profile">
                      <NavDropdown.Item>Profile</NavDropdown.Item>
                    </LinkContainer>
                    
                    {currentUser.role === 'admin' && (
                      <LinkContainer to="/admin">
                        <NavDropdown.Item>Admin Dashboard</NavDropdown.Item>
                      </LinkContainer>
                    )}
                    
                    <NavDropdown.Item onClick={logout}>
                      Logout
                    </NavDropdown.Item>
                  </NavDropdown>
                </>
              ) : (
                <LinkContainer to="/login">
                  <Nav.Link>
                    <i className="fas fa-user"></i> Sign In
                  </Nav.Link>
                </LinkContainer>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
};

export default Header;