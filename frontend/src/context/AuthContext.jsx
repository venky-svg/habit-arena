import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../utils/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('habit_arena_token');
      if (token) {
        try {
          const profile = await api.get('/auth/profile');
          setUser(profile);
        } catch (err) {
          console.error('Session restore failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (emailOrUsername, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { emailOrUsername, password });
      localStorage.setItem('habit_arena_token', response.token);
      setUser(response.user);
      return response.user;
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (username, email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/signup', { username, email, password });
      localStorage.setItem('habit_arena_token', response.token);
      setUser(response.user);
      return response.user;
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('habit_arena_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const profile = await api.get('/auth/profile');
      setUser(profile);
      return profile;
    } catch (err) {
      console.error('Failed to refresh user stats:', err);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const response = await api.put('/auth/profile', updates);
      setUser(response.user);
      return response.user;
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
