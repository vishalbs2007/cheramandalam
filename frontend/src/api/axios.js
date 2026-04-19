import axios from 'axios';
import { signOut } from 'firebase/auth';
import { firebaseAuth, firebaseEnabled } from '../firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

const getAuthProvider = () => localStorage.getItem('authProvider') || '';

api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('token');
  const authProvider = getAuthProvider();

  if (authProvider === 'firebase' && firebaseEnabled && firebaseAuth?.currentUser) {
    token = await firebaseAuth.currentUser.getIdToken();
    localStorage.setItem('token', token);
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      const authProvider = getAuthProvider();

      localStorage.removeItem('token');
      localStorage.removeItem('authProvider');
      localStorage.removeItem('admin');

      if (authProvider === 'firebase' && firebaseEnabled && firebaseAuth?.currentUser) {
        signOut(firebaseAuth).catch(() => {});
      }

      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
