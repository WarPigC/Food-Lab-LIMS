import React, { createContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import API_URL from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReAuthOpen, setIsReAuthOpen] = useState(false);

  const isReAuthOpenRef = useRef(false);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Check for token expiration on page load / hydration
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          setUser(null);
        } else {
          // Hydrate from localStorage for simplicity
          const storedUser = JSON.parse(localStorage.getItem('user'));
          setUser(storedUser);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      } catch (e) {
        localStorage.removeItem('token');
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  // Axios Response Interceptor to catch 401 token expiration
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Guard 3: Never intercept renew-session calls itself
        if (error.config?.url?.includes('/api/auth/renew-session')) {
          return Promise.reject(error);
        }

        // Only handle HTTP 401
        if (error.response?.status !== 401) {
          return Promise.reject(error);
        }

        // Guard 1: Only handle specific token expiration error, not missing token or role failure
        const message = error.response?.data?.message;
        if (message !== 'Not authorized, token expired') {
          return Promise.reject(error);
        }

        // Guard 4: Do not trigger if there is no active token in localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          return Promise.reject(error);
        }

        // Guard 2: If the re-auth modal is already open, do not open another one
        if (isReAuthOpenRef.current) {
          return Promise.reject(error);
        }

        // Open re-auth modal
        isReAuthOpenRef.current = true;
        setIsReAuthOpen(true);

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const openReAuthModal = () => {
    isReAuthOpenRef.current = true;
    setIsReAuthOpen(true);
  };

  const closeReAuthModal = () => {
    isReAuthOpenRef.current = false;
    setIsReAuthOpen(false);
  };

  const renewSession = async (password) => {
    const currentUser = userRef.current || JSON.parse(localStorage.getItem('user') || 'null');
    const email = currentUser?.email;
    if (!email) {
      throw new Error('User email not found. Please log in again.');
    }

    const res = await axios.post(`${API_URL}/api/auth/renew-session`, { email, password });
    const newToken = res.data.token;

    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    const userData = {
      _id: res.data._id,
      name: res.data.name,
      email: res.data.email,
      role: res.data.role,
      department: res.data.department,
      branch: res.data.branch,
      requiresPasswordChange: res.data.requiresPasswordChange,
      lastBackupAt: res.data.lastBackupAt || null,
    };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    closeReAuthModal();
    return res.data;
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    localStorage.setItem('token', res.data.token);
    const userData = {
      _id: res.data._id,
      name: res.data.name,
      email: res.data.email,
      role: res.data.role,
      department: res.data.department,
      branch: res.data.branch,
      requiresPasswordChange: res.data.requiresPasswordChange,
      lastBackupAt: res.data.lastBackupAt || null,
    };
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    closeReAuthModal();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        loading,
        isReAuthOpen,
        openReAuthModal,
        closeReAuthModal,
        renewSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
