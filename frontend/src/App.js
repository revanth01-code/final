import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Login from './components/Auth/Login';
// registration disabled in demo
import AmbulanceInterface from './components/Ambulance/AmbulanceInterface';
import HospitalDashboard from './components/Hospital/HospitalDashboard';
import ControlRoomDashboard from './components/ControlRoom/ControlRoomDashboard';
import Navbar from './components/Common/Navbar';
import './App.css';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to a default page if role not allowed
    return <Navigate to="/" replace />;
  }

  return children;
}

// Main App Routes
function AppRoutes() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const getHomeRoute = () => {
    if (!isAuthenticated) return '/login';
    switch (user.role) {
      case 'paramedic':
        return '/ambulance';
      case 'hospital-staff':
        return '/hospital';
      case 'control-room':
        return '/control-room';
      default:
        return '/login';
    }
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to={getHomeRoute()} replace /> : <Login />
        }
      />

      <Route
        path="/ambulance"
        element={
          <ProtectedRoute allowedRoles={['paramedic']}>
            <Navbar />
            <AmbulanceInterface />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hospital"
        element={
          <ProtectedRoute allowedRoles={['hospital-staff']}>
            <Navbar />
            <HospitalDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/control-room"
        element={
          <ProtectedRoute allowedRoles={['control-room']}>
            <Navbar />
            <ControlRoomDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to={getHomeRoute()} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <div className="app-container">
            <AppRoutes />
          </div>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;