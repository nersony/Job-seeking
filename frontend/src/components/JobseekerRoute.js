import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const JobseekerRoute = ({ children }) => {
  const { currentUser } = useAuth();

  return currentUser && currentUser.role === 'jobseeker' ? (
    children
  ) : (
    <Navigate to="/login" />
  );
};

export default JobseekerRoute;