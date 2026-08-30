import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import NewProject from './pages/NewProject';
import UploadProposals from './pages/UploadProposals';
import Dashboard from './pages/Dashboard';
import Assistant from './pages/Assistant';
import LoginPage from './pages/LoginPage';
import api from './services/api';
import './App.css';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('procure_token');
    if (!token) {
      setAuthenticated(false);
      setChecking(false);
      return;
    }
    
    // Validate token with backend
    api.get('/api/auth/me')
      .then(() => {
        setAuthenticated(true);
      })
      .catch((err) => {
        console.error('Session validation failed:', err);
        localStorage.removeItem('procure_token');
        setAuthenticated(false);
      })
      .finally(() => {
        setChecking(false);
      });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-semibold tracking-wide uppercase">Validating Session...</span>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route path="/" element={<AuthGuard><LandingPage /></AuthGuard>} />
        <Route path="/projects/new" element={<AuthGuard><NewProject /></AuthGuard>} />
        <Route path="/projects/:id/upload" element={<AuthGuard><UploadProposals /></AuthGuard>} />
        <Route path="/projects/:id/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
        <Route path="/projects/:id/assistant" element={<AuthGuard><Assistant /></AuthGuard>} />
      </Routes>
    </Router>
  );
}

export default App;
