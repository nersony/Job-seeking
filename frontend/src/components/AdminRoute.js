import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute = ({ children }) => {
  const { currentUser } = useAuth();

  return currentUser && currentUser.role === 'admin' ? (
    children
  ) : (
    <Navigate to="/login" />
  );
};

export default AdminRoute;