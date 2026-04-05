import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import { useAuth } from './context/AuthContext';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const Loans = lazy(() => import('./pages/Loans'));
const LoanDetail = lazy(() => import('./pages/LoanDetail'));
const RD = lazy(() => import('./pages/RD'));
const FD = lazy(() => import('./pages/FD'));
const ChitFunds = lazy(() => import('./pages/ChitFunds'));
const Reports = lazy(() => import('./pages/Reports'));

const AppShell = ({ children }) => {
  return (
    <div className="md:flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell>
                <Dashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <AppShell>
                <Customers />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute>
              <AppShell>
                <CustomerDetail />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/loans"
          element={
            <ProtectedRoute>
              <AppShell>
                <Loans />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/loans/:id"
          element={
            <ProtectedRoute>
              <AppShell>
                <LoanDetail />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rd"
          element={
            <ProtectedRoute>
              <AppShell>
                <RD />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/fd"
          element={
            <ProtectedRoute>
              <AppShell>
                <FD />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/chits"
          element={
            <ProtectedRoute>
              <AppShell>
                <ChitFunds />
              </AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <AppShell>
                <Reports />
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default App;
