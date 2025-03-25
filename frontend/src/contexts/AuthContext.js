import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  // API instance with auth header
  const API = axios.create({
    baseURL: '/api',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add token to request headers if available
  API.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Handle token expiration and errors
  API.interceptors.response.use(
    (response) => response,
    (error) => {
      // Check for specific Calendly connection errors
      if (error.response &&
        error.response.data &&
        error.response.data.code === 'CALENDLY_NEEDS_RECONNECT') {

        // Instead of logging out, store the reconnect needed status
        localStorage.setItem('calendlyNeedsReconnect', 'true');

        // Don't logout - just return the error normally
        console.warn('Calendly needs reconnection, but not logging out');

        // You can also dispatch an event or update state to show a reconnect banner
        const event = new CustomEvent('calendlyNeedsReconnect');
        window.dispatchEvent(event);

        return Promise.reject(error);
      }

      // Only logout on true authentication failures, not on Calendly issues
      if (error.response && error.response.status === 401 &&
        (!error.response.data || !error.response.data.code)) {
        // Token expired or invalid
        logout();
      }
      return Promise.reject(error);
    }
  );


  // Load user from token
  const loadUser = async () => {
    setLoading(true);
    try {
      if (token) {
        const res = await API.get('/users/profile');
        setCurrentUser(res.data.user);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      localStorage.removeItem('token');
      setToken('');
      setCurrentUser(null);
    }
    setLoading(false);
  };

  // Register new user
  const register = async (userData) => {
    const res = await API.post('/users', userData);

    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setCurrentUser(res.data.user);
    }

    return res.data;
  };

  // Login user
  const login = async (email, password, token, userData) => {
    try {
      // If token is provided directly, use it instead of making a login request
      if (token) {
        setToken(token);

        // If userData is also provided, use it
        if (userData) {
          setCurrentUser(userData);
        } else {
          // Otherwise, fetch the user profile
          const res = await API.get('/users/profile');
          setCurrentUser(res.data.user);
        }

        return { token, user: userData || res.data.user };
      }

      // Regular login flow with email/password
      const res = await API.post('/users/login', { email, password });

      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setCurrentUser(res.data.user);
      }

      return res.data;
    } catch (error) {
      // Improve error handling
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCurrentUser(null);
  };

  // Update user profile
  const updateProfile = async (userData) => {
    const res = await API.put('/users/profile', userData);

    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
    }

    setCurrentUser(res.data.user);
    return res.data;
  };

  useEffect(() => {
    loadUser();
  }, [token]);

  const value = {
    currentUser,
    token,
    loading,
    register,
    login,
    logout,
    updateProfile,
    API
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}