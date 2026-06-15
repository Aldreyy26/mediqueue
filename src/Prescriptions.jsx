import React, { useEffect, useState } from 'react';
import { FaArrowLeft, FaCapsules, FaFilePrescription, FaRegCalendarAlt, FaDownload } from 'react-icons/fa';
import { ref, onValue } from 'firebase/database';
import { auth, database } from './firebase';

function Prescriptions({ onBack }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Kukunin nito ang tunay na data galing sa Firebase
    const user = auth.currentUser;
    if (user) {
      const rxRef = ref(database, `prescriptions/${user.uid}`);
      onValue(rxRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const rxList = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
          setRecords(rxList);
        } else {
          setRecords([]);
        }
        setLoading(false);
      });
    }
  }, []);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'none', background: 'transparent' }}>
      
      <div className="rx-header-banner hide-on-print">
        <button className="rx-back-btn" onClick={onBack}><FaArrowLeft /></button>
        <div className="rx-icon-box"><FaCapsules /></div>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>Medication History</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>View your dispensed medicines</p>
        </div>
      </div>
      
      <div style={{ padding: '20px 0' }}>
        {loading ? (
           <p style={{ textAlign: 'center', color: '#64748b', marginTop: '20px' }}>Loading prescriptions...</p>
        ) : records.length === 0 ? (
           <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
             <FaCapsules style={{ fontSize: '40px', color: '#cbd5e1', marginBottom: '15px' }} />
             <h3 style={{ color: '#1e293b', margin: '0 0 10px 0' }}>No Prescriptions Yet</h3>
             <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>You don't have any dispensed medications on record.</p>
           </div>
        ) : records.map((record, index) => (
          <div key={record.id} className="rx-card printable-area">
            
            <div className="rx-card-header">
              <div>
                <h3 className="rx-card-title"><FaFilePrescription style={{ color: '#a855f7' }}/> Record #{records.length - index}</h3>
                <span className="rx-date"><FaRegCalendarAlt /> {record.date}</span>
              </div>
              <span className="rx-badge" style={{ background: record.status === 'Active' ? '#a855f7' : '#94a3b8' }}>
                {record.status || 'Issued'}
              </span>
            </div>
            <hr className="rx-divider" />
            
            <div className="rx-info-box">
              <div className="rx-info-item">
                <h4>Assisted By</h4>
                <p>{record.assistedBy}</p>
              </div>
              <div className="rx-info-item" style={{ textAlign: 'right' }}>
                <h4>Assessment</h4>
                <p>{record.assessment}</p>
              </div>
            </div>
            
            <div className="rx-med-list">
              <h4><FaCapsules /> Dispensed Medications</h4>
              {record.medications && record.medications.map((med, idx) => (
                <div key={idx} className="rx-med-item" style={{ position: 'relative' }}>
                  <h3>{med.name}</h3>
                  <p className="rx-med-detail"><strong>Dosage:</strong> {med.dosage}</p>
                  <p className="rx-med-detail"><strong>Instructions:</strong> {med.instructions}</p>
                  <p className="rx-med-detail" style={{ color: '#ef4444', fontWeight: 'bold' }}><strong>Duration:</strong> {med.duration}</p>
                </div>
              ))}
            </div>
            <hr className="rx-divider" />
            
            <div className="rx-footer">
              <div>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 5px 0' }}>Health Worker Name</p>
                <h2 className="rx-worker-name">{record.assistedBy}</h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Old Cabalan Health Center</p>
              </div>
            </div>
            
            <button className="btn-purple-full hide-on-print" onClick={() => window.print()} style={{ marginTop: '20px' }}>
              <FaDownload /> Download Record
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Prescriptions;