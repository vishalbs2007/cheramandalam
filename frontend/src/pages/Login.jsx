import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { firebaseAuth, firebaseEnabled } from '../firebase';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const detectBackendAuthProvider = async () => {
    try {
      await api.post('/auth/login', {
        email: 'probe@example.com',
        password: 'invalid-probe-password'
      });
      return 'jwt';
    } catch (error) {
      const backendMessage = String(error.response?.data?.message || '').toLowerCase();
      if (error.response?.status === 400 && backendMessage.includes('use firebase sign-in')) {
        return 'firebase';
      }
      return 'jwt';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const backendAuthProvider = await detectBackendAuthProvider();

      if (backendAuthProvider === 'firebase') {
        if (!firebaseEnabled) {
          throw new Error('Backend requires Firebase auth but frontend Firebase auth is disabled');
        }

        if (!firebaseAuth) {
          throw new Error('Firebase auth is enabled but configuration is incomplete');
        }

        const credentials = await signInWithEmailAndPassword(firebaseAuth, form.email.trim(), form.password);
        const token = await credentials.user.getIdToken();
        const { data } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        login({ token, admin: data.admin, provider: 'firebase' });
      } else {
        if (firebaseEnabled && firebaseAuth?.currentUser) {
          await signOut(firebaseAuth).catch(() => {});
        }

        const { data } = await api.post('/auth/login', {
          email: form.email.trim(),
          password: form.password
        });
        login({ ...data, provider: 'jwt' });
      }

      toast.success('Login successful');
      navigate('/');
    } catch (error) {
      const firebaseError = typeof error.code === 'string'
        ? error.code.replace('auth/', '').replace(/-/g, ' ')
        : '';
      toast.error(error.response?.data?.message || firebaseError || error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
        <h1 className="text-2xl font-extrabold text-slate-800">Finance & Chit Login</h1>
        <p className="text-slate-500 text-sm mt-1">Sign in to continue</p>
        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            required
          />
          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
