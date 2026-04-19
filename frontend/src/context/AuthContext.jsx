import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { signOut } from 'firebase/auth';
import api from '../api/axios';
import { firebaseAuth, firebaseEnabled } from '../firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authProvider, setAuthProvider] = useState(localStorage.getItem('authProvider') || '');
  const [admin, setAdmin] = useState(() => {
    const data = localStorage.getItem('admin');
    return data ? JSON.parse(data) : null;
  });
  const [loading, setLoading] = useState(true);

  const login = ({ token: authToken, admin: authAdmin = null, provider = 'jwt' }) => {
    setToken(authToken);
    setAuthProvider(provider);
    localStorage.setItem('token', authToken);
    localStorage.setItem('authProvider', provider);

    if (authAdmin) {
      setAdmin(authAdmin);
      localStorage.setItem('admin', JSON.stringify(authAdmin));
      return;
    }

    setAdmin(null);
    localStorage.removeItem('admin');
  };

  const logout = () => {
    const currentProvider = authProvider || localStorage.getItem('authProvider') || '';

    setToken(null);
    setAuthProvider('');
    setAdmin(null);
    localStorage.removeItem('token');
    localStorage.removeItem('authProvider');
    localStorage.removeItem('admin');

    if (currentProvider === 'firebase' && firebaseEnabled && firebaseAuth?.currentUser) {
      signOut(firebaseAuth).catch(() => {});
    }
  };

  useEffect(() => {
    let active = true;

    const verify = async () => {
      let activeToken = token;
      let activeProvider = authProvider || localStorage.getItem('authProvider') || '';

      if (!activeProvider && activeToken) {
        activeProvider = 'jwt';
        if (active) {
          setAuthProvider(activeProvider);
          localStorage.setItem('authProvider', activeProvider);
        }
      }

      if (!activeToken && activeProvider === 'firebase' && firebaseEnabled && firebaseAuth?.currentUser) {
        try {
          activeToken = await firebaseAuth.currentUser.getIdToken();
          if (!active) return;
          setToken(activeToken);
          localStorage.setItem('token', activeToken);
        } catch (error) {
          activeToken = null;
        }
      }

      if (!activeToken) {
        if (active) setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${activeToken}` }
        });

        if (!active) return;
        setAdmin(data.admin);
        localStorage.setItem('admin', JSON.stringify(data.admin));
      } catch (error) {
        if (!active) return;
        logout();
      } finally {
        if (active) setLoading(false);
      }
    };

    verify();

    return () => {
      active = false;
    };
  }, [token, authProvider]);

  const value = useMemo(
    () => ({ token, admin, loading, authProvider, login, logout, isAuthenticated: Boolean(token) }),
    [token, admin, loading, authProvider]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
