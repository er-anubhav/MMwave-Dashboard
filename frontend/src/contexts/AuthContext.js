import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(() => {
    const token = localStorage.getItem('access_token');
    console.log('AuthContext: Initializing accessToken from localStorage:', token ? 'EXISTS' : 'NOT_FOUND');
    return token;
  });
  const [refreshToken, setRefreshToken] = useState(() => {
    const token = localStorage.getItem('refresh_token');
    console.log('AuthContext: Initializing refreshToken from localStorage:', token ? 'EXISTS' : 'NOT_FOUND');
    return token;
  });

  // Setup axios interceptor for adding auth header
  useEffect(() => {
    console.log('Setting up axios interceptor with accessToken:', accessToken ? 'YES' : 'NO');
    
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        if (accessToken && config.url?.startsWith(API)) {
          config.headers.Authorization = `Bearer ${accessToken}`;
          console.log('Adding auth header to request:', config.url);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and we have a refresh token, try to refresh
        if (error.response?.status === 401 && refreshToken && !originalRequest._retry) {
          console.log('Got 401 response. Attempting token refresh...');
          originalRequest._retry = true;

          try {
            const response = await axios.post(`${API}/auth/refresh`, {
              refresh_token: refreshToken
            });

            const newAccessToken = response.data.access_token;
            console.log('Token refresh successful');
            setAccessToken(newAccessToken);
            localStorage.setItem('access_token', newAccessToken);

            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            console.log('Token refresh failed. Logging out...');
            // Refresh failed, logout user
            logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [accessToken, refreshToken]);

  // Load user on mount and when tokens change
  useEffect(() => {
    const loadUser = async () => {
      console.log('loadUser effect running. accessToken:', accessToken ? 'EXISTS' : 'NOT_FOUND');
      
      if (accessToken) {
        try {
          console.log('Fetching user info with token...');
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          console.log('User data loaded successfully:', response.data);
          setUser(response.data);
        } catch (error) {
          console.error('Failed to load user:', error.response?.status, error.message);
          
          // If token is invalid, clear it
          if (error.response?.status === 401) {
            console.log('Token invalid (401). Attempting to refresh...');
            // Token might be expired, try refresh on next API call via interceptor
          }
        }
      } else {
        console.log('No accessToken available, user remains logged out');
      }
      setLoading(false);
    };

    loadUser();
  }, [accessToken]); // Re-run whenever accessToken changes

  const register = async (email, password, name) => {
    console.log('Register attempt for:', email, name);
    try {
      const response = await axios.post(`${API}/auth/register`, {
        email,
        password,
        name
      });

      const { access_token, refresh_token, user } = response.data;

      console.log('Registration successful. Storing tokens...');
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      console.log('Tokens stored in localStorage');

      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      setUser(user);
      console.log('Auth state updated with user:', user);

      return { success: true };
    } catch (error) {
      let errorMessage = 'Registration failed';
      const responseData = error.response?.data;
      
      if (typeof responseData?.detail === 'string') {
        errorMessage = responseData.detail;
      } else if (Array.isArray(responseData?.detail)) {
        errorMessage = responseData.detail[0]?.msg || 'Registration failed';
      }
      
      console.error('Registration error:', errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const login = async (email, password) => {
    console.log('Login attempt for:', email);
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password
      });

      const { access_token, refresh_token, user } = response.data;

      console.log('Login successful. Storing tokens...');
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      console.log('Tokens stored in localStorage');

      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      setUser(user);
      console.log('Auth state updated with user:', user);

      return { success: true };
    } catch (error) {
      let errorMessage = 'Login failed';
      const responseData = error.response?.data;
      
      if (typeof responseData?.detail === 'string') {
        errorMessage = responseData.detail;
      } else if (Array.isArray(responseData?.detail)) {
        errorMessage = responseData.detail[0]?.msg || 'Login failed';
      }
      
      console.error('Login error:', errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = () => {
    console.log('Logout: Clearing tokens and user data');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    console.log('Logout complete');
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
