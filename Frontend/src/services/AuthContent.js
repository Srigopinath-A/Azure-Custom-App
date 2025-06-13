import React, { createContext, useState, useContext, useEffect } from 'react';
import { checkSession, logout as apiLogout } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for an existing session ONLY ONCE on startup.
    const verifySession = async () => {
      try {
        await checkSession();
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    verifySession();
  }, []);

  const login = () => setIsAuthenticated(true);

  const logout = async () => {
    setIsAuthenticated(false);
    try { await apiLogout(); } catch (e) { /* ignore */ }
  };

  const value = { isAuthenticated, isLoading, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);