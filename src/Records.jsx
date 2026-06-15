import React from 'react';
import { FaArrowLeft, FaFileMedicalAlt, FaUser, FaRegCalendarAlt, FaHeartbeat } from 'react-icons/fa';

function Records({ onBack, userData, appointments }) {
  const completedRecords = appointments.filter(app => app.status === 'completed');
  const patientID = userData ? `OCH-${userData.id.substring(0, 4).toUpperCase()}` : "OCH-0000";
  
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'none', background: 'transparent' }}>
      
      <div className="record-header-banner">
        <button className="rx-back-btn" onClick={onBack}><FaArrowLeft /></button>
        <div className="record-icon-box" style={{ background: '#dbeafe', color: '#3b82f6' }}><FaFileMedicalAlt /></div>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>History</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>View your complete health history</p>
        </div>
      </div>
      
      <div style={{ padding: '20px 0' }}>
        <div className="record-patient-box">
          <div className="record-patient-item">
            <h4><FaUser style={{ color: '#10b981', marginRight: '5px' }} /> Patient Information</h4>
            <div style={{ display: 'flex', gap: '80px', marginTop: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Full Name</span>
                <p>{userData ? userData.fullName : "Loading..."}</p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Patient ID</span>
                <p>{patientID}</p>
              </div>
            </div>
          </div>
        </div>

        {completedRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <FaFileMedicalAlt style={{ fontSize: '40px', color: '#cbd5e1', marginBottom: '15px' }} />
            <h3 style={{ color: '#1e293b', margin: '0 0 10px 0' }}>No History Yet</h3>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>You don't have any completed records at this time.</p>
          </div>
        ) : (
          completedRecords.map((record) => (
            <div key={record.id} className="record-card">
              <div className="record-card-header">
                <div className="record-service-title">
                  <div className="record-icon-box"><FaHeartbeat /></div>
                  <div>
                    <h3>{record.serviceType}</h3>
                    <span className="rx-date"><FaRegCalendarAlt /> {record.appointmentDate}</span>
                  </div>
                </div>
                <span className="rx-badge" style={{ background: '#10b981' }}>Complete</span>
              </div>
              
              <div className="record-detail-group">
                <h4>Assisted By</h4>
                <p>Health Center Staff / Duty Nurse</p> 
              </div>
              <div className="record-detail-group">
                <h4>Reason for Visit</h4>
                <p>{record.notes ? record.notes : "No additional details provided."}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Records;