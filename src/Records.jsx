import React from 'react';
import { 
  FaArrowLeft, FaFileMedicalAlt, FaUser, FaRegCalendarAlt, 
  FaHeartbeat, FaStethoscope, FaPills, FaIdCard, FaSyringe, FaExclamationTriangle 
} from 'react-icons/fa';
import { decryptData } from './encryption';

function Records({ onBack, userData, appointments }) {
  const completedRecords = appointments.filter(app => app.status === 'completed');
  const patientID = userData?.idNumber || (userData ? `OCH-${userData.id.substring(0, 4).toUpperCase()}` : "OCH-0000");
  
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'none', background: 'transparent' }}>
      
      <div className="record-header-banner">
        <button className="rx-back-btn" onClick={onBack}><FaArrowLeft /></button>
        <div className="record-icon-box" style={{ background: '#dbeafe', color: '#3b82f6' }}><FaIdCard /></div>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>Medical History & Health Passport</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>View your health profile and past clinic visits</p>
        </div>
      </div>
      
      <div style={{ padding: '20px 0' }}>
        <div className="record-patient-box" style={{ flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderBottom: '1px solid #bbf7d0', paddingBottom: '12px' }}>
            <div>
              <h4 style={{ margin: 0, color: '#166534', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaUser style={{ color: '#10b981' }} /> PATIENT INFORMATION
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
                {userData ? userData.fullName : "Loading..."}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{userData?.idType || 'Barangay Health ID'}</span>
              <span style={{ background: '#0bc25c', color: 'white', padding: '4px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' }}>
                {patientID}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'white', padding: '12px 15px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
              <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FaExclamationTriangle /> ALLERGIES
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                {userData?.healthPassport?.allergies || 'None reported'}
              </p>
            </div>
            <div style={{ background: 'white', padding: '12px 15px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
              <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FaSyringe /> IMMUNIZATIONS
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                {userData?.healthPassport?.immunizations || 'Standard Barangay Immunization'}
              </p>
            </div>
            <div style={{ background: 'white', padding: '12px 15px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
              <span style={{ fontSize: '11px', color: '#0bc25c', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FaHeartbeat /> MEDICAL HISTORY
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                {userData?.healthPassport?.medicalHistory || 'None reported'}
              </p>
            </div>
          </div>
        </div>

        <h3 style={{ color: '#1e293b', fontSize: '16px', margin: '25px 0 15px 0' }}>Past Visit Logs</h3>

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
                    <h3>{record.healthService || record.serviceType}</h3>
                    <span className="rx-date"><FaRegCalendarAlt /> {record.appointmentDate}</span>
                  </div>
                </div>
                <span className="rx-badge" style={{ background: '#10b981' }}>Completed</span>
              </div>
              
              <div className="record-detail-group">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FaUser /> Reason for Visit</h4>
                <p>{record.notes ? record.notes : "Routine consultation."}</p>
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed #e2e8f0', margin: '15px 0' }} />

              <div className="record-detail-group">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#3b82f6' }}><FaStethoscope /> Doctor's Diagnosis</h4>
                <p style={{ fontStyle: record.diagnosis ? 'normal' : 'italic' }}>
                  {decryptData(record.diagnosis) || "No diagnosis saved for this record."}
                </p>
              </div>

              <div className="record-detail-group" style={{ marginTop: '15px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#a855f7' }}><FaPills /> Prescription / Recommendations</h4>
                <p style={{ fontStyle: record.prescription ? 'normal' : 'italic', whiteSpace: 'pre-line' }}>
                  {decryptData(record.prescription) || "No prescriptions given."}
                </p>
              </div>

              {record.followUpDate && (
                <div style={{ marginTop: '15px', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', color: '#1e40af', fontWeight: 'bold' }}>
                  📅 Follow-Up Visit: {record.followUpDate}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Records;