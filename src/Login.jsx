import React, { useState } from 'react';
import { FaSignInAlt, FaUserPlus, FaNotesMedical, FaRobot, FaIdCard, FaChartLine } from 'react-icons/fa';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm'; 
import './App.css';

function Login() {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <div className="landing-wrapper">
      <div className="landing-container">
        
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
            <span className="badge">BRGY. OLD CABALAN HEALTH CENTER</span>
            <h1 style={{ fontSize: '40px', lineHeight: '1.2' }}>
              <span>MediQueue:</span> Mobile-Based Health Management System
            </h1>
            <p style={{ fontWeight: '600', color: '#00796b', marginBottom: '12px', fontSize: '15px' }}>
              With Predictive Community Health Analytics and Smart Records Management
            </p>
            <p>
              Experience next-generation barangay healthcare with AI OCR ID Scanning, AI-Assisted Wait Time Forecasting, Virtual Waiting Room alerts, Encrypted Cloud EMR, and our 24/7 "Ka-Health" Conversational AI Assistant.
            </p>
            
            <div className="button-group">
              <button className="btn-primary" onClick={() => setActiveModal('login')}>
                <FaSignInAlt /> Login to Account
              </button>
              
              <button className="btn-outline" onClick={() => setActiveModal('register')}>
                <FaUserPlus /> Smart OCR Registration
              </button>
            </div>
          </div>

          {/* VISUAL CARD WITH 5 OFFICIAL SERVICES */}
          <div className="hero-image-card">
            <div style={{fontSize: '45px', marginBottom: '10px'}}>🏥</div>
            <h2 style={{color: '#1e293b', fontSize: '20px'}}>Old Cabalan Health Center</h2>
            <p style={{color: '#64748b', fontSize: '13px', marginBottom: '18px'}}>Smart Appointment Services</p>
            
            <div className="service-item" style={{ padding: '12px 14px', fontSize: '14px' }}>
              <FaNotesMedical color="#00796b"/> <span>General Consultation</span>
            </div>
            <div className="service-item" style={{ padding: '12px 14px', fontSize: '14px' }}>
              <FaNotesMedical color="#00796b"/> <span>Maternal & Child Care (Pre/Postnatal)</span>
            </div>
            <div className="service-item" style={{ padding: '12px 14px', fontSize: '14px' }}>
              <FaNotesMedical color="#00796b"/> <span>Immunization / Vaccination</span>
            </div>
            <div className="service-item" style={{ padding: '12px 14px', fontSize: '14px' }}>
              <FaNotesMedical color="#00796b"/> <span>Senior Citizen & Maintenance Meds</span>
            </div>
            <div className="service-item" style={{ padding: '12px 14px', fontSize: '14px' }}>
              <FaNotesMedical color="#00796b"/> <span>Dental Services</span>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS SECTION */}
        <div className="how-it-works">
          <p style={{color: '#64748b', fontWeight: 'bold'}}>CORE MODULES & EMERGING TECH</p>
          <h2 style={{color: '#1e293b'}}>Smart Healthcare Workflow</h2>
          
          <div className="steps-container">
            <div className="step-box active">
              <h3 style={{color: '#00796b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px'}}><FaIdCard /> 1. AI OCR Onboarding</h3>
              <p style={{color: '#64748b', fontSize: '14px'}}>Scan your Barangay ID or PhilHealth ID using our AI OCR Medical Card Scanner to auto-fill your Digital Health Passport.</p>
            </div>
            <div className="step-box active">
              <h3 style={{color: '#00796b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px'}}><FaRobot /> 2. "Ka-Health" AI & Smart Booking</h3>
              <p style={{color: '#64748b', fontSize: '14px'}}>Consult our 24/7 bilingual chatbot and book real-time slots based on Doctor, Midwife, and Dentist shift schedules.</p>
            </div>
            <div className="step-box active">
              <h3 style={{color: '#00796b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px'}}><FaChartLine /> 3. Predictive Queue Tracker</h3>
              <p style={{color: '#64748b', fontSize: '14px'}}>Wait comfortably at home with AI Wait Time Forecasting and receive automatic alerts when you are 2 numbers away.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;