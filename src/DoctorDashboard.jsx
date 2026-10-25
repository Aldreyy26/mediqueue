import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, database } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue, update, set, push } from 'firebase/database';
import { 
  FaUserMd, FaSignOutAlt, FaClipboardList, FaCheckCircle, FaTimesCircle, 
  FaStethoscope, FaHeartbeat, FaExclamationTriangle, FaRegCalendarAlt, 
  FaBullhorn, FaPills, FaHistory, FaIdCard, FaUserSlash
} from 'react-icons/fa';
import { encryptData, decryptData } from './encryption';
import './App.css';

function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [usersData, setUsersData] = useState({});
  const [inventory, setInventory] = useState([]);
  const [currentServing, setCurrentServing] = useState("None");
  const [activeTab, setActiveTab] = useState('consultation'); 
  
  const getLocalDate = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() - offset);
    return d.toISOString().split('T')[0];
  };

  const [queueDateFilter, setQueueDateFilter] = useState(getLocalDate());
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultData, setConsultData] = useState({ 
    appId: '', patientId: '', queueNum: '', diagnosis: '', prescription: '', followUpDate: '' 
  });
  const [dispensedMeds, setDispensedMeds] = useState([]);
  
  const [alertBox, setAlertBox] = useState({ show: false, message: '', type: 'info' });
  const navigate = useNavigate();
  const showAlert = (message, type = 'info') => setAlertBox({ show: true, message, type });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        onValue(ref(database, `users/${user.uid}/role`), (snapshot) => {
          if (snapshot.val() !== 'doctor') {
            showAlert("Access Denied. Doctor privileges required.", "error");
            setTimeout(() => navigate('/'), 2000);
          }
        });
      } else navigate('/');
    });

    onValue(ref(database, 'users'), (snapshot) => { if (snapshot.exists()) setUsersData(snapshot.val()); });
    onValue(ref(database, 'liveQueue/current'), (snapshot) => { if (snapshot.exists()) setCurrentServing(snapshot.val()); });
    onValue(ref(database, 'appointments'), (snapshot) => {
      if (snapshot.exists()) {
        const rawAppts = Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })).reverse();
        setAppointments(rawAppts);
      } else {
        setAppointments([]);
      }
    });
    onValue(ref(database, 'inventory'), (snapshot) => {
      if (snapshot.exists()) {
        const list = Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] }));
        setInventory(list);
      } else {
        setInventory([]);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = () => signOut(auth).then(() => navigate('/'));

  const callPatient = (app) => {
    set(ref(database, 'liveQueue/current'), app.queueNumber);
    update(ref(database, `appointments/${app.id}`), { queueStage: 'In Consultation', isSkipped: false });
    push(ref(database, `notifications/${app.patientId}`), { 
      title: "IN CONSULTATION!", 
      message: `Queue ${app.queueNumber}, the Doctor is ready for you in the Consultation Room.`, 
      timestamp: new Date().toLocaleString() 
    });
    showAlert(`Called ${app.queueNumber} (In Consultation)!`, "success");
  };

  const markNoShow = (app) => {
    update(ref(database, `appointments/${app.id}`), { isSkipped: true, queueStage: 'No Show' });
    push(ref(database, `notifications/${app.patientId}`), { 
      title: "Marked as No Show", 
      message: `Queue ${app.queueNumber} was marked as No Show. Please approach the triage desk if you are still at the clinic.`, 
      timestamp: new Date().toLocaleString() 
    });
    showAlert(`${app.queueNumber} marked as No Show.`, "info");
  };

  const getClinicalAlerts = (patientId) => {
    const m = usersData[patientId]?.healthMetrics;
    if (!m) return [];
    const alerts = [];
    if (m.temp && parseFloat(m.temp) >= 37.8) alerts.push({ label: `FEVER (${m.temp}°C)`, color: '#ef4444' });
    if (m.oxygen && parseFloat(m.oxygen) < 95) alerts.push({ label: `LOW SpO2 (${m.oxygen}%)`, color: '#ef4444' });
    if (m.bp) {
      const [sys, dia] = m.bp.split('/').map(Number);
      if (sys >= 130 || dia >= 80) alerts.push({ label: `HIGH BP (${m.bp})`, color: '#f59e0b' });
    }
    if (m.weight && m.height) {
      const bmi = (m.weight / ((m.height / 100) ** 2)).toFixed(1);
      if (bmi < 18.5) alerts.push({ label: `UNDERWEIGHT (BMI ${bmi})`, color: '#3b82f6' });
    }
    return alerts;
  };

  const openConsultation = (app) => {
    setConsultData({ 
      appId: app.id, 
      patientId: app.patientId, 
      queueNum: app.queueNumber, 
      diagnosis: decryptData(app.diagnosis) || '', 
      prescription: decryptData(app.prescription) || '',
      followUpDate: app.followUpDate || ''
    });
    setDispensedMeds([]);
    setShowConsultModal(true);
  };

  const addMedicineToPrescription = (item) => {
    const currentRx = consultData.prescription ? consultData.prescription + '\n' : '';
    setConsultData({
      ...consultData,
      prescription: `${currentRx}• ${item.itemName} (${item.category}) - Dispensed 1 pack/course (Take as directed)`
    });
    setDispensedMeds(prev => [...prev, item]);
  };

  const handleCompleteConsultation = (e) => {
    e.preventDefault();
    const patientName = usersData[consultData.patientId]?.fullName || "Resident";

    // Update Cloud EMR Record
    update(ref(database, `appointments/${consultData.appId}`), { 
      status: "completed",
      queueStage: "Completed",
      diagnosis: encryptData(consultData.diagnosis),
      prescription: encryptData(consultData.prescription),
      followUpDate: consultData.followUpDate || null,
      consultedAt: new Date().toLocaleString()
    }).then(() => {
      // Automatically log dispensed medicines & deduct stock in Inventory
      dispensedMeds.forEach(med => {
        const newStock = Math.max(0, Number(med.stock) - 1);
        update(ref(database, `inventory/${med.id}`), { stock: newStock });
        push(ref(database, 'distributionLogs'), {
          itemName: med.itemName,
          category: med.category,
          patientName: patientName,
          queueNumber: consultData.queueNum,
          quantity: 1,
          date: getLocalDate(),
          timestamp: new Date().toLocaleString()
        });
      });

      push(ref(database, `notifications/${consultData.patientId}`), {
        title: "Cloud EMR Consultation Completed",
        message: `Your consultation is complete. View your Digital Health Passport for your prescription${consultData.followUpDate ? ` and follow-up on ${consultData.followUpDate}` : ''}.`,
        timestamp: new Date().toLocaleString()
      });
      setShowConsultModal(false);
      showAlert("Cloud EMR saved & medicine distribution logged!", "success");
    });
  };

  const activeQueue = appointments
    .filter(app => queueDateFilter === '' || app.appointmentDate === queueDateFilter) 
    .filter(app => app.status === 'pending')
    .sort((a, b) => {
      if (a.isSkipped && !b.isSkipped) return 1;
      if (!a.isSkipped && b.isSkipped) return -1;
      return 0; 
    });

  const completedRecords = appointments.filter(app => app.status === 'completed');
  const patientPastHistory = appointments.filter(app => app.patientId === consultData.patientId && app.status === 'completed' && app.id !== consultData.appId);
  const currentPatientObj = usersData[consultData.patientId] || {};

  const getTabStyle = (t) => activeTab === t ? { background: '#eff6ff', color: '#3b82f6', borderRight: '4px solid #3b82f6', fontWeight: 'bold' } : { color: '#64748b' };

  return (
    <div style={{ display: 'flex', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {alertBox.show && ( <div className="modal-overlay" style={{ zIndex: 9999 }}><div className="modern-register-card" style={{ maxWidth: '350px', textAlign: 'center', padding: '30px', background: '#ffffff' }}><div style={{ fontSize: '50px', marginBottom: '15px', color: alertBox.type === 'success' ? '#10b981' : '#ef4444' }}>{alertBox.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}</div><h3 style={{ color: '#1e293b', marginBottom: '10px' }}>{alertBox.message}</h3><button onClick={() => setAlertBox({ show: false, message: '', type: 'info' })} className="btn-green-full" style={{ background: '#3b82f6', margin: 0 }}>OK</button></div></div> )}
      
      {/* CLOUD ELECTRONIC MEDICAL RECORD (EMR) MODAL */}
      {showConsultModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modern-register-card modern-scrollable-card" style={{ maxWidth: '680px', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowConsultModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}><FaTimesCircle /></button>
            <div style={{ marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaStethoscope color="#3b82f6"/> Cloud Electronic Medical Record (EMR)</h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                Queue: <strong style={{color: '#1e293b'}}>{consultData.queueNum}</strong> | Patient: <strong style={{color: '#1e293b'}}>{currentPatientObj.fullName}</strong> ({currentPatientObj.idType || 'ID'}: {currentPatientObj.idNumber || 'Verified'})
              </p>
              <div style={{ display: 'inline-block', marginTop: '8px', fontSize: '11px', background: '#f0fdf4', color: '#16a34a', padding: '4px 8px', borderRadius: '4px', border: '1px solid #bbf7d0', fontWeight: 'bold' }}>🔒 AES-256 Encrypted Cloud Registry</div>
            </div>

            {/* DIGITAL HEALTH PASSPORT SUMMARY */}
            <div style={{ background: '#eff6ff', padding: '12px 15px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #bfdbfe', fontSize: '12px', color: '#1e3a8a' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}><FaIdCard /> Digital Health Passport Profile:</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div><strong>Allergies:</strong> {currentPatientObj.healthPassport?.allergies || 'None reported'}</div>
                <div><strong>Vaccines:</strong> {currentPatientObj.healthPassport?.immunizations || 'Standard'}</div>
                <div><strong>History:</strong> {currentPatientObj.healthPassport?.medicalHistory || 'None'}</div>
              </div>
            </div>

            {/* RECORDED VITALS */}
            <div style={{ background: '#f0fdf4', padding: '12px 15px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #bbf7d0' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '5px' }}><FaHeartbeat /> Recorded Triage Vital Signs</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
                <div><strong>BP:</strong> {currentPatientObj.healthMetrics?.bp || 'N/A'}</div>
                <div><strong>HR:</strong> {currentPatientObj.healthMetrics?.hr || 'N/A'} bpm</div>
                <div><strong>Temp:</strong> {currentPatientObj.healthMetrics?.temp || 'N/A'} °C</div>
                <div><strong>Oxygen:</strong> {currentPatientObj.healthMetrics?.oxygen || 'N/A'} %</div>
                <div><strong>Weight:</strong> {currentPatientObj.healthMetrics?.weight || 'N/A'} kg</div>
                <div><strong>Height:</strong> {currentPatientObj.healthMetrics?.height || 'N/A'} cm</div>
              </div>
              {currentPatientObj.healthMetrics?.conditions && (
                <div style={{ marginTop: '8px', padding: '6px 10px', background: '#fef2f2', color: '#ef4444', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                  ⚠️ Special Condition Alert: {decryptData(currentPatientObj.healthMetrics.conditions)}
                </div>
              )}
            </div>

            {patientPastHistory.length > 0 && (
              <div style={{ background: '#f8fafc', padding: '10px 15px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}><FaHistory /> Past Visit Logs ({patientPastHistory.length})</h4>
                <div style={{ maxHeight: '75px', overflowY: 'auto', fontSize: '12px', color: '#64748b' }}>
                  {patientPastHistory.map(h => (
                    <div key={h.id} style={{ marginBottom: '4px' }}>
                      <strong>{h.appointmentDate}:</strong> {decryptData(h.diagnosis) || 'Routine Visit'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleCompleteConsultation}>
              <div className="modern-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>CONSULTATION NOTES & CLINICAL DIAGNOSIS *</label>
                <textarea value={consultData.diagnosis} onChange={(e) => setConsultData({...consultData, diagnosis: e.target.value})} className="modern-input" rows="2" required placeholder="Enter clinical findings and diagnosis..."></textarea>
              </div>

              {inventory.filter(i => i.stock > 0).length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '6px' }}><FaPills /> CLICK TO DISPENSE & LINK TO INVENTORY DISTRIBUTION LOG:</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {inventory.filter(i => i.stock > 0).map(item => (
                      <button 
                        type="button" 
                        key={item.id} 
                        onClick={() => addMedicineToPrescription(item)}
                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        + {item.itemName} ({item.stock})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="modern-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>PRESCRIBED MAINTENANCE MEDICINES & INSTRUCTIONS</label>
                <textarea value={consultData.prescription} onChange={(e) => setConsultData({...consultData, prescription: e.target.value})} className="modern-input" rows="2" placeholder="Enter prescribed medicines and dosage..."></textarea>
              </div>

              <div className="modern-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}><FaRegCalendarAlt /> SCHEDULED FOLLOW-UP DATE (OPTIONAL)</label>
                <input type="date" value={consultData.followUpDate} onChange={(e) => setConsultData({...consultData, followUpDate: e.target.value})} className="modern-input" min={getLocalDate()} />
              </div>

              <button type="submit" className="btn-green-full" style={{ background: '#3b82f6' }}>Save Encrypted Cloud EMR & Complete</button>
            </form>
          </div>
        </div>
      )}

      <div style={{ width: '260px', background: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', top: 0, left: 0 }}>
        <div style={{ padding: '30px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#3b82f6', color: 'white', padding: '10px', borderRadius: '10px', fontSize: '20px' }}><FaUserMd /></div>
          <div><h2 style={{ margin: 0, fontSize: '16px', color: '#1e293b', fontWeight: '800' }}>Doctor EMR</h2><p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Old Cabalan Health</p></div>
        </div>
        <ul style={{ listStyle: 'none', padding: '20px 0', margin: 0, flex: 1 }}>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', transition: '0.2s', ...getTabStyle('consultation') }} onClick={() => setActiveTab('consultation')}><FaStethoscope /> Patient Queue Board</li>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', transition: '0.2s', ...getTabStyle('records') }} onClick={() => setActiveTab('records')}><FaClipboardList /> Cloud EMR Registry</li>
        </ul>
        <div onClick={handleLogout} style={{ padding: '20px 25px', borderTop: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontWeight: 'bold', fontSize: '15px' }}><FaSignOutAlt /> Logout</div>
      </div>
      
      <div style={{ flex: 1, marginLeft: '260px', padding: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '24px', fontWeight: '800' }}>{activeTab === 'consultation' ? 'Physician Consultation Queue' : 'Encrypted Cloud EMR Registry'}</h2>
        </div>

        {activeTab === 'consultation' && (
           <div className="dash-card" style={{ padding: '0', overflow: 'hidden' }}>
             <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
               <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Patients Waiting for Consultation</h3>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <FaRegCalendarAlt color="#94a3b8" />
                 <input type="date" value={queueDateFilter} onChange={(e) => setQueueDateFilter(e.target.value)} className="modern-input" style={{ padding: '8px 12px', background: 'white', width: 'auto' }} />
                 <button onClick={() => setQueueDateFilter('')} style={{ background: queueDateFilter === '' ? '#3b82f6' : 'white', color: queueDateFilter === '' ? 'white' : '#64748b', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>All Dates</button>
               </div>
             </div>
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
               <thead>
                 <tr style={{ background: '#ffffff', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>
                   <th style={{ padding: '15px 25px' }}>Queue & Stage</th>
                   <th style={{ padding: '15px 25px' }}>Patient & Triage Alerts</th>
                   <th style={{ padding: '15px 25px' }}>Service & Chief Complaint</th>
                   <th style={{ padding: '15px 25px' }}>Workstation Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {activeQueue.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No patients waiting for consultation on this date.</td></tr> :
                   activeQueue.map((app) => {
                     const clinicalAlerts = getClinicalAlerts(app.patientId);
                     return (
                       <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9', background: app.queueNumber === currentServing ? '#eff6ff' : (app.isSkipped ? '#fef2f2' : 'white') }}>
                         <td style={{ padding: '20px 25px' }}>
                           <strong style={{ color: app.isSkipped ? '#ef4444' : '#3b82f6', fontSize: '20px', display: 'block' }}>{app.queueNumber}</strong>
                           <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{app.appointmentDate}</div>
                           <span style={{ background: app.isSkipped ? '#ef4444' : (app.queueNumber === currentServing ? '#3b82f6' : '#f1f5f9'), color: app.isSkipped || app.queueNumber === currentServing ? 'white' : '#475569', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', display: 'inline-block', marginTop: '4px', fontWeight: 'bold' }}>
                             {app.isSkipped ? 'NO SHOW' : (app.queueStage || 'WAITING')}
                           </span>
                         </td>
                         <td style={{ padding: '20px 25px' }}>
                           <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{usersData[app.patientId]?.fullName || "Unknown"}</div>
                           <div style={{ fontSize: '12px', color: '#64748b' }}>{app.serviceType}</div>
                           <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                             {clinicalAlerts.map((al, idx) => (
                               <span key={idx} style={{ background: `${al.color}15`, color: al.color, border: `1px solid ${al.color}40`, fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>⚡ {al.label}</span>
                             ))}
                             {usersData[app.patientId]?.healthMetrics?.conditions && (
                               <span style={{ fontSize: '10px', color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                 <FaExclamationTriangle /> {decryptData(usersData[app.patientId].healthMetrics.conditions)}
                               </span>
                             )}
                           </div>
                         </td>
                         <td style={{ padding: '20px 25px', fontSize: '13px', color: '#475569' }}>
                           <strong style={{ color: '#00796b', display: 'block', fontSize: '12px' }}>{app.healthService || 'General Consultation'}</strong>
                           {app.notes || 'Routine Check-up'}
                         </td>
                         <td style={{ padding: '20px 25px' }}>
                           <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                             <button onClick={() => callPatient(app)} style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><FaBullhorn /> Call Next</button>
                             <button onClick={() => openConsultation(app)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><FaStethoscope /> Open EMR</button>
                             <button onClick={() => markNoShow(app)} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><FaUserSlash /> No Show</button>
                           </div>
                         </td>
                       </tr>
                     );
                   })
                 }
               </tbody>
             </table>
           </div>
        )}

        {activeTab === 'records' && (
           <div className="dash-card" style={{ padding: '0', overflow: 'hidden' }}>
             <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
               <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Encrypted Cloud EMR Registry</h3>
             </div>
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead><tr style={{ background: '#ffffff', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: '15px 25px' }}>Date & Patient</th><th style={{ padding: '15px 25px' }}>Clinical Diagnosis</th><th style={{ padding: '15px 25px' }}>Prescribed Meds</th><th style={{ padding: '15px 25px' }}>Follow-Up</th></tr></thead>
                <tbody>
                  {completedRecords.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No completed EMR consultations yet.</td></tr> : completedRecords.map((app) => (
                    <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                      <td style={{ padding: '20px 25px' }}><strong style={{ color: '#1e293b', display: 'block', fontSize: '14px' }}>{usersData[app.patientId]?.fullName}</strong><div style={{ fontSize: '11px', color: '#64748b' }}>{app.appointmentDate} | {app.queueNumber}</div></td>
                      <td style={{ padding: '20px 25px', fontSize: '13px', color: '#475569' }}>{decryptData(app.diagnosis) || 'No diagnosis recorded'}</td>
                      <td style={{ padding: '20px 25px', fontSize: '13px', color: '#475569', whiteSpace: 'pre-line' }}>{decryptData(app.prescription) || 'None'}</td>
                      <td style={{ padding: '20px 25px', fontSize: '12px', fontWeight: 'bold', color: '#2563eb' }}>{app.followUpDate || 'As Needed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        )}
      </div>
    </div>
  );
}

export default DoctorDashboard;