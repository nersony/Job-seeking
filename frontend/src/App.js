import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Header from './components/Header';
import Footer from './components/Footer';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ProfileScreen from './screens/ProfileScreen';
import JobseekerListScreen from './screens/JobseekerListScreen';
import JobseekerDetailScreen from './screens/JobseekerDetailScreen';
import BookingScreen from './screens/BookingScreen';
import BookingListScreen from './screens/BookingListScreen';
import BookingDetailScreen from './screens/BookingDetailScreen';
import DisputeScreen from './screens/DisputeScreen';
import AdminDashboard from './screens/AdminDashboard';
import CalendlyCallbackScreen from './screens/CalendlyCallbackScreen';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import JobseekerRoute from './components/JobseekerRoute';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Header />
        <main className="main-content">
          <Container>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/login" element={<LoginScreen />} />
              <Route path="/register" element={<RegisterScreen />} />
              <Route path="/calendly-callback" element={<CalendlyCallbackScreen />} />
              
              {/* Private Routes */}
              <Route 
                path="/profile" 
                element={
                  <PrivateRoute>
                    <ProfileScreen />
                  </PrivateRoute>
                } 
              />
              <Route path="/jobseekers" element={<JobseekerListScreen />} />
              <Route path="/jobseekers/:id" element={<JobseekerDetailScreen />} />
              
              <Route 
                path="/book/:id" 
                element={
                  <PrivateRoute>
                    <BookingScreen />
                  </PrivateRoute>
                } 
              />
              
              <Route 
                path="/bookings" 
                element={
                  <PrivateRoute>
                    <BookingListScreen />
                  </PrivateRoute>
                } 
              />
              
              <Route 
                path="/bookings/:id" 
                element={
                  <PrivateRoute>
                    <BookingDetailScreen />
                  </PrivateRoute>
                } 
              />
              
              <Route 
                path="/disputes" 
                element={
                  <PrivateRoute>
                    <DisputeScreen />
                  </PrivateRoute>
                } 
              />
              
              {/* Admin Routes */}
              <Route 
                path="/admin/*" 
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } 
              />
            </Routes>
          </Container>
        </main>
        <Footer />
      </Router>
    </AuthProvider>
  );
};

export default App;