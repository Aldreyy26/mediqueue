import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard'; 
import InstallApp from './InstallApp'; // IMPORT ANG INSTALL BUTTON DITO

function App() {
  return (
    <Router>
      {/* 
        FLOATING INSTALL BUTTON 
        Lalabas ito sa ibabang kanan ng screen kapag pwede nang i-install ang app.
        Mawawala rin ito nang kusa kapag na-install na!
      */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
        <InstallApp />
      </div>

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;