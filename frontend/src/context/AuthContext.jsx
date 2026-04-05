import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [admin, setAdmin] = useState(() => {
    const data = localStorage.getItem('admin');
    return data ? JSON.parse(data) : null;
  });
  const [loading, setLoading] = useState(true);

  const login = ({ token: authToken, admin: authAdmin }) => {
    setToken(authToken);
    setAdmin(authAdmin);
    localStorage.setItem('token', authToken);
    localStorage.setItem('admin', JSON.stringify(authAdmin));
  };

  const logout = () => {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
  };

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        setAdmin(data.admin);
      } catch (error) {
        logout();
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  const value = useMemo(
    () => ({ token, admin, loading, login, logout, isAuthenticated: Boolean(token) }),
    [token, admin, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
