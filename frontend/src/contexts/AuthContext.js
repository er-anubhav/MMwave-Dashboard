import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(() => {
    return localStorage.getItem('access_token');
  });
  const [refreshToken, setRefreshToken] = useState(() => {
    return localStorage.getItem('refresh_token');
  });

  // Load user on mount and when tokens change
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await api.get(`/auth/me`);
          setUser(response.data);
        } catch (error) {
          // api interceptor handles refresh/logout
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [accessToken]); // Re-run whenever accessToken changes

  const register = async (email, password, name) => {
    try {
      const response = await api.post(`/auth/register`, {
        email,
        password,
        name
      });

      const { access_token, refresh_token, user } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      setUser(user);

      return { success: true };
    } catch (error) {
      let errorMessage = 'Registration failed';
      const responseData = error.response?.data;
      
      if (typeof responseData?.detail === 'string') {
        errorMessage = responseData.detail;
      } else if (Array.isArray(responseData?.detail)) {
        errorMessage = responseData.detail[0]?.msg || 'Registration failed';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post(`/auth/login`, {
        email,
        password
      });

      const { access_token, refresh_token, user } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      setUser(user);

      return { success: true };
    } catch (error) {
      let errorMessage = 'Login failed';
      const responseData = error.response?.data;
      
      if (typeof responseData?.detail === 'string') {
        errorMessage = responseData.detail;
      } else if (Array.isArray(responseData?.detail)) {
        errorMessage = responseData.detail[0]?.msg || 'Login failed';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
