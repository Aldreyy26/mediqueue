import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard'; 
import DoctorDashboard from './DoctorDashboard'; // BAGONG IMPORT
import InstallApp from './InstallApp'; 

function App() {
  return (
    <Router>
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
        <InstallApp />
      </div>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/doctor" element={<DoctorDashboard />} /> {/* BAGONG ROUTE */}
      </Routes>
    </Router>
  );
}

export default App;