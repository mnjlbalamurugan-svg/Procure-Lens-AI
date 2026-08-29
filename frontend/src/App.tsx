import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import NewProject from './pages/NewProject';
import UploadProposals from './pages/UploadProposals';
import Dashboard from './pages/Dashboard';
import Assistant from './pages/Assistant';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/projects/:id/upload" element={<UploadProposals />} />
        <Route path="/projects/:id/dashboard" element={<Dashboard />} />
        <Route path="/projects/:id/assistant" element={<Assistant />} />
      </Routes>
    </Router>
  );
}

export default App;
