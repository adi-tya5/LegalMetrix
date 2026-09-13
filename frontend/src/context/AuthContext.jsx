import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiRequest } from '../api/client';

const AuthContext = createContext(null);

export const DEMO_CREDENTIALS = {
  USER: { username: 'owner_rajesh', password: 'Password123!', name: 'Rajesh Kumar (Owner)', role: 'USER' },
  LMO: { username: 'lmo_vijay', password: 'Password123!', name: 'Inspector Vijay Salve (LMO)', role: 'LMO' },
  GATC: { username: 'gatc_anil', password: 'Password123!', name: 'Anil Verma (GATC)', role: 'GATC' },
  ADMIN: { username: 'admin_sunil', password: 'Password123!', name: 'Sunil Deshmukh (Admin)', role: 'ADMIN' },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('legalmetrix_token'));
  const [role, setRole] = useState(localStorage.getItem('legalmetrix_role'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const userData = await apiRequest('/auth/me');
      setUser(userData);
      setRole(userData.role);
      localStorage.setItem('legalmetrix_role', userData.role);
    } catch (err) {
      console.error('Failed to fetch user session:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [token]);

  const login = async (username, password) => {
    setIsLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem('legalmetrix_token', data.access_token);
      localStorage.setItem('legalmetrix_role', data.role);
      setToken(data.access_token);
      setRole(data.role);
      await fetchCurrentUser();
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('legalmetrix_token');
    localStorage.removeItem('legalmetrix_role');
    setToken(null);
    setRole(null);
    setUser(null);
  };

  const switchRole = async (targetRole) => {
    const creds = DEMO_CREDENTIALS[targetRole];
    if (!creds) return;
    return await login(creds.username, creds.password);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      role,
      isAuthenticated: !!token,
      isLoading,
      login,
      logout,
      switchRole,
      DEMO_CREDENTIALS
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
