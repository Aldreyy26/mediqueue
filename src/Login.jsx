import React, { useState } from 'react';
import { FaSignInAlt, FaUserPlus, FaNotesMedical } from 'react-icons/fa';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm'; 
import './App.css';

function Login() {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <div className="landing-wrapper">
      <div className="landing-container">
        
        {/* LOGIC PARA SA MODALS */}
        {activeModal === 'login' && (
          <LoginForm 
            onClose={() => setActiveModal(null)} 
            onSwitchToRegister={() => setActiveModal('register')} 
          />
        )}
        {activeModal === 'register' && (
          <RegisterForm 
            onClose={() => setActiveModal(null)} 
            onSwitchToLogin={() => setActiveModal('login')} 
          />
        )}

        {/* HERO SECTION */}
        <div className="hero-section">
          <div className="hero-content">
            <span className="badge">OFFICIAL HEALTH CENTER PORTAL</span>
            <h1>Welcome to <br/><span>MediQueue System</span></h1>
            <p>
              Your digital portal for the Old Cabalan Health Center. 
              Designed to make queuing and booking your medical appointments faster, more efficient, and transparent.
            </p>
            <div className="button-group">
              
              {/* BUTTONS NA NAGBUBUKAS NG MODALS */}
              <button className="btn-primary" onClick={() => setActiveModal('login')}>
                <FaSignInAlt /> Login to Account
              </button>
              
              <button className="btn-outline" onClick={() => setActiveModal('register')}>
                <FaUserPlus /> Create Account
              </button>
            </div>
          </div>

          {/* VISUAL CARD */}
          <div className="hero-image-card">
            <div style={{fontSize: '50px', marginBottom: '15px'}}>🏥</div>
            <h2 style={{color: '#1e293b'}}>Old Cabalan Center</h2>
            <p style={{color: '#64748b', fontSize: '14px', marginBottom: '20px'}}>Available Services</p>
            
            <div className="service-item">
              <FaNotesMedical color="#00796b"/> <span>General Consultation</span>
            </div>
            <div className="service-item">
              <FaNotesMedical color="#00796b"/> <span>Immunization / Vaccination</span>
            </div>
            <div className="service-item">
              <FaNotesMedical color="#00796b"/> <span>Maternal Care</span>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS SECTION */}
        <div className="how-it-works">
          <p style={{color: '#64748b', fontWeight: 'bold'}}>HOW IT WORKS</p>
          <h2 style={{color: '#1e293b'}}>Simple steps to access our services</h2>
          
          <div className="steps-container">
            <div className="step-box active">
              <h3 style={{color: '#00796b', marginBottom: '10px'}}>1. Register</h3>
              <p style={{color: '#64748b', fontSize: '14px'}}>Create an account using your email and personal details.</p>
            </div>
            <div className="step-box">
              <h3 style={{color: '#1e293b', marginBottom: '10px'}}>2. Book Appointment</h3>
              <p style={{color: '#64748b', fontSize: '14px'}}>Select your required service and generate your digital queue number.</p>
            </div>
            <div className="step-box">
              <h3 style={{color: '#1e293b', marginBottom: '10px'}}>3. Monitor & Go</h3>
              <p style={{color: '#64748b', fontSize: '14px'}}>Monitor the live queue on your dashboard and proceed to the center when your number is called.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;