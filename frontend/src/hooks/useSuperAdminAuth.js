// Custom hook for super admin authentication.

import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';

export const useSuperAdminAuth = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adminToken, setAdminToken] = useState(() => {
    return localStorage.getItem('super_admin_token');
  });

  // Verify token on mount
  useEffect(() => {
    if (adminToken) {
      verifyToken(adminToken);
    }
  }, []);

  const verifyToken = useCallback(async (token) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/super-admin/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 200) {
        setAuthenticated(true);
        setUser(response.data.user || { name: 'Super Admin', role: 'super_admin' });
        setAdminToken(token);
        localStorage.setItem('super_admin_token', token);
        setError(null);
      }
    } catch (err) {
      setAuthenticated(false);
      setAdminToken(null);
      localStorage.removeItem('super_admin_token');
      setError('Token verification failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      setLoading(true);
      setError(null);

      let response;
      try {
        response = await axios.post(`${API}/super-admin/login`, {
          username,
          password
        });
      } catch (requestError) {
        // Older deployed API instances expose this legacy endpoint as GET.
        // Keep login working while the backend pool rolls forward.
        if ([404, 405].includes(requestError.response?.status)) {
          response = await axios.get(`${API}/super-admin/login`, {
            params: { username, password }
          });
        } else {
          throw requestError;
        }
      }

      if (response.data?.token) {
        const token = response.data.token;
        setAuthenticated(true);
        setUser(response.data.user || { name: username, role: 'super_admin' });
        setAdminToken(token);
        localStorage.setItem('super_admin_token', token);
        return { success: true };
      }
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setAuthenticated(false);
    setAdminToken(null);
    localStorage.removeItem('super_admin_token');
    setError(null);
  }, []);

  return {
    authenticated,
    user,
    loading,
    error,
    token: adminToken,
    login,
    logout,
    verifyToken
  };
};
