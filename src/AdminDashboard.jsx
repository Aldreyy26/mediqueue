import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, database } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue, set, update, push } from 'firebase/database';
import { 
  FaHome, FaUsers, FaCog, FaSignOutAlt, FaUserShield, FaBullhorn, 
  FaCheckCircle, FaExclamationTriangle, FaTrash, FaClock, FaFilter, 
  FaTimes, FaEye, FaIdBadge, FaChartBar, FaPrint, FaTimesCircle, 
  FaUser, FaEnvelope, FaPhoneAlt, FaMapMarkerAlt, FaStepForward, 
  FaUndo, FaHeartbeat, FaBoxOpen, FaPlus, FaMinus, FaPills, FaStar, 
  FaSave, FaRegCalendarAlt, FaBell, FaColumns, FaList, FaBrain
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './App.css';
import { encryptData, decryptData } from './encryption';

function AdminDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [usersData, setUsersData] = useState({});
  const [currentServing, setCurrentServing] = useState("None");
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [queueViewMode, setQueueViewMode] = useState('list'); // 'list' or 'kanban'
  
  const [recordFilter, setRecordFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All'); 
  const [queueFilter, setQueueFilter] = useState('All'); 
  
  const getLocalDate = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() - offset);
    return d.toISOString().split('T')[0];
  };
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const [queueDateFilter, setQueueDateFilter] = useState(getLocalDate());
  const [reportStartDate, setReportStartDate] = useState(getFirstDayOfMonth());
  const [reportEndDate, setReportEndDate] = useState(getLocalDate());
  
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [distributionLogs, setDistributionLogs] = useState([]);
  
  const [highlightedAppId, setHighlightedAppId] = useState(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeModalData, setTimeModalData] = useState({ appId: '', patientId: '', queueNum: '' });
  const [selectedTime, setSelectedTime] = useState('');
  
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsData, setVitalsData] = useState({ patientId: '', name: '', bp: '', hr: '', weight: '', height: '', temp: '', oxygen: '', conditions: '' });
  
  const [inventory, setInventory] = useState([]);
  const [lowStockCount, setLowStockCount] = useState(0); 
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryItem, setInventoryItem] = useState({ id: '', itemName: '', category: 'Medicine', stock: '', threshold: '20' });
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockUpdate, setStockUpdate] = useState({ id: '', itemName: '', currentStock: 0, amount: '', type: 'add', recipient: '' });
  
  const [clinicStatus, setClinicStatus] = useState('Open');
  const [closedReason, setClosedReason] = useState(''); 
  
  const [alertBox, setAlertBox] = useState({ show: false, message: '', type: 'info' });
  const [confirmBox, setConfirmBox] = useState({ show: false, message: '', onConfirm: null });
  const navigate = useNavigate();
  const showAlert = (message, type = 'info') => setAlertBox({ show: true, message, type });
  const showConfirm = (message, onConfirm) => setConfirmBox({ show: true, message, onConfirm });

  useEffect(() => {
    onValue(ref(database, `notifications/admin`), (snapshot) => {
      if (snapshot.exists()) setAdminNotifications(Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })).reverse());
      else setAdminNotifications([]);
    });
    onValue(ref(database, 'distributionLogs'), (snapshot) => {
      if (snapshot.exists()) setDistributionLogs(Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })).reverse());
      else setDistributionLogs([]);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        onValue(ref(database, `users/${user.uid}/role`), (snapshot) => {
          if (snapshot.val() !== 'admin') {
            showAlert("Access Denied.", "error");
            setTimeout(() => navigate('/'), 2000);
          }
        });
      } else navigate('/');
    });
    onValue(ref(database, 'users'), (snapshot) => { if (snapshot.exists()) setUsersData(snapshot.val()); });
    onValue(ref(database, 'liveQueue/current'), (snapshot) => { if (snapshot.exists()) setCurrentServing(snapshot.val()); });
    onValue(ref(database, 'appointments'), (snapshot) => {
      if (snapshot.exists()) setAppointments(Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })).reverse());
      else setAppointments([]);
    });
    onValue(ref(database, 'inventory'), (snapshot) => {
      if (snapshot.exists()) {
        const list = Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] }));
        setInventory(list);
        setLowStockCount(list.filter(i => i.stock <= i.threshold).length); 
      } else {
        setInventory([]);
        setLowStockCount(0);
      }
    });
    onValue(ref(database, 'settings'), (snapshot) => {
      if (snapshot.exists()) {
        setClinicStatus(snapshot.val().status || 'Open');
        setClosedReason(snapshot.val().closedReason || '');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const formatTimeToAMPM = (timeStr) => {
    if (!timeStr) return "Anytime / Walk-in";
    if (timeStr.length === 5) { 
      const [h, m] = timeStr.split(':');
      let hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${hour}:${m} ${ampm}`;
    }
    return timeStr;
  };
  
  const formatTimeBooked = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const callPatient = (queueNum, patientId, appId) => {
    set(ref(database, 'liveQueue/current'), queueNum);
    if (appId) update(ref(database, `appointments/${appId}`), { queueStage: 'In Consultation', isSkipped: false });
    push(ref(database, `notifications/${patientId}`), { title: "IT'S YOUR TURN!", message: `Queue ${queueNum} is now being served (In Consultation).`, timestamp: new Date().toLocaleString() });
    showAlert(`Called ${queueNum} (In Consultation)!`, "success");
  };

  const skipPatient = (appId, patientId, queueNum) => {
    showConfirm(`Mark Queue ${queueNum} as No Show / Skip?`, () => {
      update(ref(database, `appointments/${appId}`), { isSkipped: true, queueStage: 'No Show', skippedAt: new Date().getTime() });
      push(ref(database, `notifications/${patientId}`), { title: "You Missed Your Turn (No Show)", message: `Queue ${queueNum} was marked as No Show.`, timestamp: new Date().toLocaleString() });
      showAlert(`${queueNum} marked as No Show.`, "success");
    });
  };

  const recallPatient = (appId, queueNum) => {
    update(ref(database, `appointments/${appId}`), { isSkipped: false, queueStage: 'Waiting' });
    showAlert(`${queueNum} returned to active Waiting queue.`, "success");
  };

  const openTimeModal = (appId, patientId, queueNum) => {
    setTimeModalData({ appId, patientId, queueNum });
    setSelectedTime(''); 
    setShowTimeModal(true);
  };

  const handleSaveTime = () => {
    if (!selectedTime) return;
    const [h, m] = selectedTime.split(':');
    let hr = parseInt(h, 10);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const formatted = `${hr % 12 || 12}:${m} ${ampm}`;
    update(ref(database, `appointments/${timeModalData.appId}`), { assignedTime: formatted });
    push(ref(database, `notifications/${timeModalData.patientId}`), { title: "Time Assigned", message: `Scheduled at: ${formatted}.`, timestamp: new Date().toLocaleString() });
    setShowTimeModal(false);
    showAlert("Time set.", "success");
  };

  const openVitalsModal = (patientId, name) => {
    const currentVitals = usersData[patientId]?.healthMetrics || { bp: '', hr: '', weight: '', height: '', temp: '', oxygen: '', conditions: '' };
    setVitalsData({ 
      patientId, name, bp: currentVitals.bp, hr: currentVitals.hr, weight: currentVitals.weight, 
      height: currentVitals.height, temp: currentVitals.temp || '', oxygen: currentVitals.oxygen || '', 
      conditions: decryptData(currentVitals.conditions || '') 
    });
    setShowVitalsModal(true);
  };

  const saveVitals = () => {
    update(ref(database, `users/${vitalsData.patientId}/healthMetrics`), {
      bp: vitalsData.bp, hr: vitalsData.hr, weight: vitalsData.weight, height: vitalsData.height, 
      temp: vitalsData.temp, oxygen: vitalsData.oxygen, conditions: encryptData(vitalsData.conditions), 
      lastUpdated: new Date().toLocaleDateString()
    }).then(() => { setShowVitalsModal(false); showAlert("Health metrics updated and secured!", "success"); });
  };

  const handleSaveInventoryItem = (e) => {
    e.preventDefault();
    if (inventoryItem.id) {
      update(ref(database, `inventory/${inventoryItem.id}`), { itemName: inventoryItem.itemName, category: inventoryItem.category, stock: Number(inventoryItem.stock), threshold: Number(inventoryItem.threshold) });
      showAlert("Item updated successfully!", "success");
    } else {
      push(ref(database, 'inventory'), { itemName: inventoryItem.itemName, category: inventoryItem.category, stock: Number(inventoryItem.stock), threshold: Number(inventoryItem.threshold) });
      showAlert("New item added to inventory!", "success");
    }
    setShowInventoryModal(false);
  };

  const handleUpdateStock = (e) => {
    e.preventDefault();
    let newStock = stockUpdate.type === 'add' ? Number(stockUpdate.currentStock) + Number(stockUpdate.amount) : Number(stockUpdate.currentStock) - Number(stockUpdate.amount);
    if (newStock < 0) newStock = 0;
    update(ref(database, `inventory/${stockUpdate.id}`), { stock: newStock }).then(() => {
      if (stockUpdate.type === 'deduct') {
        push(ref(database, 'distributionLogs'), {
          itemName: stockUpdate.itemName,
          category: 'Dispensed Supply',
          patientName: stockUpdate.recipient || 'Walk-in Resident',
          queueNumber: 'Pharmacy',
          quantity: Number(stockUpdate.amount),
          date: getLocalDate(),
          timestamp: new Date().toLocaleString()
        });
      }
      setShowStockModal(false);
      showAlert(`Stock updated & logged!`, "success");
    });
  };

  const deleteInventoryItem = (id, name) => {
    showConfirm(`Are you sure you want to delete ${name} from inventory?`, () => {
      set(ref(database, `inventory/${id}`), null);
      showAlert("Item permanently deleted.", "success");
    });
  };

  const handleSaveSettings = () => {
    update(ref(database, 'settings'), { status: clinicStatus, closedReason: clinicStatus === 'Closed' ? closedReason : '' })
    .then(() => showAlert("Settings updated!", "success"));
  };

  const handleClearQueue = () => {
    showConfirm("Are you sure you want to clear the daily queue?", () => {
      set(ref(database, 'liveQueue/current'), "None");
      showAlert("Queue cleared successfully.", "success");
    });
  };

  const handleLogout = () => signOut(auth).then(() => navigate('/'));

  const openPatientProfile = (patientId) => {
    const patientInfo = usersData[patientId];
    if (patientInfo) {
      setSelectedPatient(patientInfo);
      setShowPatientModal(true);
    } else showAlert("Patient information not found.", "error");
  };

  const handleNotificationClick = (dateStr, appId) => {
    if(dateStr) setQueueDateFilter(dateStr);
    setActiveTab('dashboard');
    if(appId) {
      setHighlightedAppId(appId);
      setTimeout(() => {
        const targetRow = document.getElementById(`row-${appId}`);
        if(targetRow) targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
      setTimeout(() => setHighlightedAppId(null), 3500);
    }
  };

  const getTabStyle = (t) => activeTab === t ? { background: '#f0fdf4', color: '#0bc25c', borderRight: '4px solid #0bc25c', fontWeight: 'bold' } : { color: '#64748b' };
  
  const filteredRecords = recordFilter === 'All' ? appointments.filter(app => app.status === 'completed') : appointments.filter(app => app.status === 'completed' && app.serviceType === recordFilter);
  
  const reportAppointments = appointments.filter(app => {
    if (app.status !== 'completed') return false;
    const appDate = new Date(app.appointmentDate);
    const startDate = new Date(reportStartDate);
    const endDate = new Date(reportEndDate);
    return appDate >= startDate && appDate <= endDate;
  });

  const dateAppointments = appointments.filter(app => app.appointmentDate === queueDateFilter || queueDateFilter === '');

  const activeQueue = dateAppointments
    .filter(app => app.status === 'pending' || (app.status === 'cancelled' && !app.adminAcknowledgedCancel))
    .filter(app => queueFilter === 'All' || app.serviceType === queueFilter)
    .sort((a, b) => {
      if (a.isSkipped && !b.isSkipped) return 1;
      if (!a.isSkipped && b.isSkipped) return -1;
      return 0; 
    });

  // KANBAN BOARD COLUMNS
  const kanbanCallNext = dateAppointments.filter(a => a.status === 'pending' && !a.isSkipped && a.queueNumber !== currentServing && a.queueStage !== 'In Consultation');
  const kanbanInConsult = dateAppointments.filter(a => a.status === 'pending' && !a.isSkipped && (a.queueNumber === currentServing || a.queueStage === 'In Consultation'));
  const kanbanCompleted = dateAppointments.filter(a => a.status === 'completed');
  const kanbanNoShow = dateAppointments.filter(a => a.status === 'pending' && a.isSkipped);
    
  const patientList = Object.keys(usersData).filter(uid => usersData[uid].role !== 'admin' && usersData[uid].role !== 'doctor').map(uid => ({ id: uid, ...usersData[uid] }));
  
  const processServiceData = () => {
    const counts = { 'Non-Senior/Non-PWD': 0, 'Senior Citizen': 0, 'Pregnant': 0, 'PWD': 0 };
    reportAppointments.forEach(app => { if (counts[app.serviceType] !== undefined) counts[app.serviceType]++; });
    return Object.keys(counts).map(key => ({ name: key, total: counts[key] }));
  };
  
  const processStatusData = () => {
    const pending = appointments.filter(app => app.status === 'pending').length;
    const completed = appointments.filter(app => app.status === 'completed').length;
    return [ { name: 'Pending', value: pending, color: '#f59e0b' }, { name: 'Completed', value: completed, color: '#10b981' } ];
  };
  
  const processPurokData = () => {
    const counts = {};
    for (let i = 1; i <= 15; i++) counts[`Purok ${i}`] = 0;
    reportAppointments.forEach(app => {
      const patientPurok = usersData[app.patientId]?.purok;
      if (patientPurok && counts[patientPurok] !== undefined) counts[patientPurok]++;
    });
    return Object.keys(counts).map(key => ({ purok: key, cases: counts[key], predictedNextMonth: Math.ceil(counts[key] * 1.25) }));
  };

  // PREDICTIVE COMMUNITY HEALTH ANALYTICS SUMMARY
  const purokStats = processPurokData();
  const topHotspot = [...purokStats].sort((a, b) => b.cases - a.cases)[0] || { purok: 'Purok 1', cases: 0 };
  const predictedNextMonthVolume = Math.max(15, Math.ceil(appointments.length * 1.28));

  const computeLiveBMI = (w, h) => {
    if (!w || !h) return { val: '--', label: '', color: '#94a3b8' };
    const heightM = h / 100;
    const bmi = (w / (heightM * heightM)).toFixed(1);
    if(bmi < 18.5) return { val: bmi, label: "Underweight", color: "#3b82f6" };
    if(bmi < 24.9) return { val: bmi, label: "Normal", color: "#16a34a" };
    if(bmi < 29.9) return { val: bmi, label: "Overweight", color: "#f59e0b" };
    return { val: bmi, label: "Obese", color: "#ef4444" };
  };
  const liveAdminBmi = computeLiveBMI(vitalsData.weight, vitalsData.height);

  return (
    <div style={{ display: 'flex', background: '#f4fbfa', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {alertBox.show && ( <div className="modal-overlay hide-on-print" style={{ zIndex: 9999 }}><div className="modern-register-card" style={{ maxWidth: '350px', textAlign: 'center', padding: '30px', background: '#ffffff' }}><div style={{ fontSize: '50px', marginBottom: '15px', color: alertBox.type === 'success' ? '#10b981' : '#ef4444' }}>{alertBox.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}</div><h3 style={{ color: '#1e293b', marginBottom: '10px' }}>{alertBox.message}</h3><button onClick={() => setAlertBox({ show: false, message: '', type: 'info' })} className="btn-green-full" style={{ margin: 0 }}>OK</button></div></div> )}
      {confirmBox.show && ( <div className="modal-overlay hide-on-print" style={{ zIndex: 9999 }}><div className="modern-register-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px', background: '#ffffff' }}><div style={{ fontSize: '50px', color: '#ef4444', marginBottom: '15px' }}><FaExclamationTriangle /></div><h3 style={{ color: '#1e293b', marginBottom: '10px' }}>{confirmBox.message}</h3><div style={{ display: 'flex', gap: '10px' }}><button onClick={() => setConfirmBox({ show: false, message: '', onConfirm: null })} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button><button onClick={() => { confirmBox.onConfirm(); setConfirmBox({ show: false, message: '', onConfirm: null }); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#0bc25c', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Yes</button></div></div></div> )}
      
      {showVitalsModal && (
        <div className="modal-overlay hide-on-print" style={{ zIndex: 1000 }}>
          <div className="modern-register-card" style={{ maxWidth: '400px', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowVitalsModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}><FaTimes /></button>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}><div style={{ background: '#fef2f2', color: '#ef4444', width: '50px', height: '50px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', margin: '0 auto 10px auto' }}><FaHeartbeat /></div><h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '20px', fontWeight: '800' }}>Update Cloud EMR Vitals</h2><p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Patient: <strong style={{color: '#1e293b'}}>{vitalsData.name}</strong></p></div>
            <div className="form-content">
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${liveAdminBmi.color}` }}>
                <div><span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>AUTO COMPUTED BMI</span><div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>{liveAdminBmi.val}</div></div>
                {liveAdminBmi.label && (<span style={{ background: `${liveAdminBmi.color}20`, color: liveAdminBmi.color, padding: '4px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold' }}>{liveAdminBmi.label}</span>)}
              </div>
              <div className="modern-group" style={{ marginBottom: '15px' }}><label style={{ fontSize: '12px', fontWeight: 'bold' }}>BLOOD PRESSURE</label><input type="text" value={vitalsData.bp} onChange={(e) => setVitalsData({...vitalsData, bp: e.target.value})} className="modern-input" /></div>
              <div className="modern-group" style={{ marginBottom: '15px' }}><label style={{ fontSize: '12px', fontWeight: 'bold' }}>HEART RATE (bpm)</label><input type="text" value={vitalsData.hr} onChange={(e) => setVitalsData({...vitalsData, hr: e.target.value})} className="modern-input" /></div>
              <div style={{ display:'flex', gap:'10px', marginBottom: '15px' }}>
                <div className="modern-group" style={{ flex: 1, marginBottom: 0 }}><label style={{ fontSize: '12px', fontWeight: 'bold' }}>WEIGHT (kg)</label><input type="number" value={vitalsData.weight} onChange={(e) => setVitalsData({...vitalsData, weight: e.target.value})} className="modern-input" /></div>
                <div className="modern-group" style={{ flex: 1, marginBottom: 0 }}><label style={{ fontSize: '12px', fontWeight: 'bold' }}>HEIGHT (cm)</label><input type="number" value={vitalsData.height} onChange={(e) => setVitalsData({...vitalsData, height: e.target.value})} className="modern-input" /></div>
              </div>
              <div style={{ display:'flex', gap:'10px', marginBottom: '15px' }}>
                <div className="modern-group" style={{ flex: 1, marginBottom: 0 }}><label style={{ fontSize: '12px', fontWeight: 'bold' }}>TEMP (°C)</label><input type="number" step="0.1" value={vitalsData.temp} onChange={(e) => setVitalsData({...vitalsData, temp: e.target.value})} className="modern-input" placeholder="e.g. 36.5" /></div>
                <div className="modern-group" style={{ flex: 1, marginBottom: 0 }}><label style={{ fontSize: '12px', fontWeight: 'bold' }}>OXYGEN (%)</label><input type="number" value={vitalsData.oxygen} onChange={(e) => setVitalsData({...vitalsData, oxygen: e.target.value})} className="modern-input" placeholder="e.g. 98" /></div>
              </div>
              <div className="modern-group" style={{ marginBottom: '25px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#ef4444' }}>SPECIAL CONDITIONS / ALERTS (ENCRYPTED)</label>
                <input type="text" value={vitalsData.conditions} onChange={(e) => setVitalsData({...vitalsData, conditions: e.target.value})} className="modern-input" placeholder="e.g. Malnourished, Contagious (TB), Asthma..." style={{ border: '1px solid #fecaca', background: '#fef2f2' }} />
              </div>
              <button onClick={saveVitals} className="btn-green-full" style={{ background: '#0bc25c' }}>Save Encrypted Patient Data</button>
            </div>
          </div>
        </div>
      )}
      
      {showTimeModal && (
        <div className="modal-overlay hide-on-print" style={{ zIndex: 1000 }}>
          <div className="modern-register-card" style={{ maxWidth: '400px', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowTimeModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}><FaTimes /></button>
            <h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '22px', fontWeight: '800', textAlign: 'center' }}>Assign Time</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px', textAlign: 'center' }}>Queue: {timeModalData.queueNum}</p>
            <div className="modern-group" style={{ marginBottom: '20px' }}><input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="modern-input" required /></div>
            <button onClick={handleSaveTime} className="btn-green-full" style={{ background: '#3b82f6' }}>Confirm</button>
          </div>
        </div>
      )}

      {showInventoryModal && (
        <div className="modal-overlay hide-on-print" style={{ zIndex: 1000 }}>
          <div className="modern-register-card" style={{ maxWidth: '400px', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowInventoryModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}><FaTimes /></button>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}><div style={{ background: '#eff6ff', color: '#3b82f6', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', margin: '0 auto 15px auto' }}><FaPills /></div><h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '22px', fontWeight: '800' }}>{inventoryItem.id ? 'Edit Item' : 'Add New Item'}</h2><p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Manage government-allocated supplies.</p></div>
            <form onSubmit={handleSaveInventoryItem} className="form-content">
              <div className="modern-group" style={{ marginBottom: '15px' }}><label style={{ color: '#475569', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>ITEM NAME</label><input type="text" placeholder="e.g. Losartan 50mg / Paracetamol" value={inventoryItem.itemName} onChange={(e) => setInventoryItem({...inventoryItem, itemName: e.target.value})} className="modern-input" required /></div>
              <div className="modern-group" style={{ marginBottom: '15px' }}><label style={{ color: '#475569', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>CATEGORY</label><select value={inventoryItem.category} onChange={(e) => setInventoryItem({...inventoryItem, category: e.target.value})} className="modern-input" required><option value="Medicine">Maintenance / Medicine</option><option value="Vitamins">Vitamins & Nutrition</option><option value="Vaccine">Vaccine / Immunization</option><option value="Medical Supply">Medical Supply</option></select></div>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}><div className="modern-group" style={{ flex: 1, marginBottom: 0 }}><label style={{ color: '#475569', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>INITIAL STOCK</label><input type="number" min="0" value={inventoryItem.stock} onChange={(e) => setInventoryItem({...inventoryItem, stock: e.target.value})} className="modern-input" required /></div><div className="modern-group" style={{ flex: 1, marginBottom: 0 }}><label style={{ color: '#475569', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>LOW ALERT AT</label><input type="number" min="1" value={inventoryItem.threshold} onChange={(e) => setInventoryItem({...inventoryItem, threshold: e.target.value})} className="modern-input" required /></div></div>
              <button type="submit" className="btn-green-full" style={{ background: '#3b82f6' }}>Save Item</button>
            </form>
          </div>
        </div>
      )}

      {showStockModal && (
        <div className="modal-overlay hide-on-print" style={{ zIndex: 1000 }}>
          <div className="modern-register-card" style={{ maxWidth: '400px', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowStockModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}><FaTimes /></button>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}><div style={{ background: stockUpdate.type === 'add' ? '#dcfce7' : '#fef2f2', color: stockUpdate.type === 'add' ? '#16a34a' : '#ef4444', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', margin: '0 auto 15px auto' }}>{stockUpdate.type === 'add' ? <FaPlus /> : <FaMinus />}</div><h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '22px', fontWeight: '800' }}>{stockUpdate.type === 'add' ? 'Add Stock' : 'Dispense / Deduct Stock'}</h2><p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Item: <strong style={{color: '#1e293b'}}>{stockUpdate.itemName}</strong></p></div>
            <form onSubmit={handleUpdateStock} className="form-content">
              <div className="modern-group" style={{ marginBottom: '15px' }}><label style={{ color: '#475569', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>AMOUNT TO {stockUpdate.type === 'add' ? 'ADD' : 'DISPENSE'}</label><input type="number" min="1" placeholder="0" value={stockUpdate.amount} onChange={(e) => setStockUpdate({...stockUpdate, amount: e.target.value})} className="modern-input" required /></div>
              {stockUpdate.type === 'deduct' && (
                <div className="modern-group" style={{ marginBottom: '20px' }}><label style={{ color: '#475569', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>PATIENT RECIPIENT (FOR DISTRIBUTION LOG)</label><input type="text" placeholder="e.g. Juan Dela Cruz" value={stockUpdate.recipient} onChange={(e) => setStockUpdate({...stockUpdate, recipient: e.target.value})} className="modern-input" required /></div>
              )}
              <button type="submit" className="btn-green-full" style={{ background: stockUpdate.type === 'add' ? '#0bc25c' : '#ef4444' }}>Confirm Update</button>
            </form>
          </div>
        </div>
      )}

      {showPatientModal && selectedPatient && (
        <div className="modal-overlay hide-on-print" style={{ zIndex: 1000 }}>
          <div className="modern-register-card" style={{ maxWidth: '620px', padding: '35px', position: 'relative' }}>
            <button onClick={() => setShowPatientModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}><FaTimes /></button>
            <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', marginTop: '10px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', minWidth: '150px' }}>
                <div style={{ width: '110px', height: '110px', margin: '0 auto 12px auto' }}>{selectedPatient.profilePicture ? <img src={selectedPatient.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f0fdf4' }} /> : <div style={{ background: '#f8fafc', width: '100%', height: '100%', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '45px', color: '#cbd5e1', border: '4px solid #e2e8f0' }}><FaIdBadge /></div>}</div>
                <h3 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '17px' }}>{selectedPatient.fullName}</h3>
                <span style={{ background: '#f0fdf4', color: '#0bc25c', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #bbf7d0', display: 'inline-block' }}>
                  {selectedPatient.idType || 'Barangay ID'}: {selectedPatient.idNumber || 'Verified'}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: '#1e293b', fontSize: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaUser style={{ color: '#0bc25c' }}/> Digital Barangay Health Profile</h3>
                <p style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#334155' }}><FaEnvelope style={{color: '#94a3b8'}}/> <strong>Email:</strong> {selectedPatient.email}</p>
                <p style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#334155' }}><FaPhoneAlt style={{color: '#94a3b8'}}/> <strong>Contact:</strong> {selectedPatient.contact}</p>
                <p style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#334155' }}><FaMapMarkerAlt style={{color: '#94a3b8'}}/> <strong>Purok:</strong> {selectedPatient.purok || 'Not Specified'}</p>
                <p style={{ fontSize: '13px', margin: '0 0 12px 0', color: '#334155' }}><FaHome style={{color: '#94a3b8'}}/> <strong>Address:</strong> {selectedPatient.address}</p>
                <div style={{ background: '#f0fdf4', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '12px' }}>
                  <div><strong>Allergies:</strong> {selectedPatient.healthPassport?.allergies || 'None reported'}</div>
                  <div><strong>Immunizations:</strong> {selectedPatient.healthPassport?.immunizations || 'Standard'}</div>
                  <div><strong>Medical History:</strong> {selectedPatient.healthPassport?.medicalHistory || 'None'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="hide-on-print" style={{ width: '260px', background: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', top: 0, left: 0 }}>
        <div style={{ padding: '30px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#0bc25c', color: 'white', padding: '10px', borderRadius: '10px', fontSize: '20px' }}><FaUserShield /></div>
          <div><h2 style={{ margin: 0, fontSize: '15px', color: '#1e293b', fontWeight: '800' }}>Staff & Nurse</h2><p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Workstation Panel</p></div>
        </div>
        <ul style={{ listStyle: 'none', padding: '20px 0', margin: 0, flex: 1 }}>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', transition: '0.2s', ...getTabStyle('dashboard') }} onClick={() => setActiveTab('dashboard')}><FaHome /> Queue Board</li>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', transition: '0.2s', ...getTabStyle('vitals') }} onClick={() => setActiveTab('vitals')}><FaHeartbeat /> Cloud EMR & Vitals</li>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', transition: '0.2s', ...getTabStyle('records') }} onClick={() => setActiveTab('records')}><FaUsers /> Patient Visit Logs</li>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '15px', transition: '0.2s', ...getTabStyle('inventory') }} onClick={() => setActiveTab('inventory')}>
            <div style={{display:'flex', alignItems:'center', gap:'12px'}}><FaBoxOpen /> Meds & Vaccines</div>
            {lowStockCount > 0 && <span style={{background:'#ef4444', color:'white', fontSize:'10px', padding:'2px 6px', borderRadius:'10px', fontWeight:'bold'}}>{lowStockCount}</span>}
          </li>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '15px', transition: '0.2s', ...getTabStyle('notifications') }} onClick={() => setActiveTab('notifications')}>
            <div style={{display:'flex', alignItems:'center', gap:'12px'}}><FaBell /> Notifications</div>
            {adminNotifications.length > 0 && <span style={{background:'#ef4444', color:'white', fontSize:'10px', padding:'2px 6px', borderRadius:'10px', fontWeight:'bold'}}>{adminNotifications.length}</span>}
          </li>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', transition: '0.2s', ...getTabStyle('feedback') }} onClick={() => setActiveTab('feedback')}><FaStar /> Patient Feedback</li>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', transition: '0.2s', ...getTabStyle('analytics') }} onClick={() => setActiveTab('analytics')}><FaChartBar /> Predictive Analytics</li>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', transition: '0.2s', ...getTabStyle('settings') }} onClick={() => setActiveTab('settings')}><FaCog /> Settings</li>
        </ul>
        <div onClick={handleLogout} style={{ padding: '20px 25px', borderTop: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontWeight: 'bold', fontSize: '15px' }}><FaSignOutAlt /> Logout</div>
      </div>

      <div className="printable-area" style={{ flex: 1, marginLeft: '260px', padding: '40px' }}>
        <div className="hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '24px', fontWeight: '800', textTransform: 'capitalize' }}>
            {activeTab === 'dashboard' ? 'Centralized Patient Queue Board' : activeTab === 'analytics' ? 'Predictive Community Health Analytics' : `${activeTab} Management`}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
                <button onClick={() => setQueueViewMode('list')} style={{ background: queueViewMode === 'list' ? 'white' : 'transparent', color: '#1e293b', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><FaList /> List View</button>
                <button onClick={() => setQueueViewMode('kanban')} style={{ background: queueViewMode === 'kanban' ? 'white' : 'transparent', color: '#0bc25c', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}><FaColumns /> Kanban Board</button>
              </div>
            )}
            {activeTab === 'analytics' && <button onClick={() => window.print()} className="btn-green-full" style={{ width: 'auto', padding: '12px 25px', margin:0 }}><FaPrint /> Print Report</button>}
            {activeTab === 'inventory' && <button onClick={() => { setInventoryItem({ id: '', itemName: '', category: 'Medicine', stock: '', threshold: '20' }); setShowInventoryModal(true); }} className="btn-green-full" style={{ width: 'auto', padding: '12px 25px', background: '#3b82f6', margin:0 }}><FaPlus /> Add Supply</button>}
            {activeTab === 'settings' && <button onClick={handleSaveSettings} className="btn-green-full" style={{ width: 'auto', padding: '10px 20px', margin:0 }}><FaSave/> Save Settings</button>}
          </div>
        </div>

        {activeTab === 'notifications' && (
          <div className="dash-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#1e293b' }}>Admin Notifications</h3>
              {adminNotifications.length > 0 && (
                <button onClick={() => { set(ref(database, 'notifications/admin'), null); showAlert("All notifications cleared.", "success"); }} style={{background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px'}}>Clear All</button>
              )}
            </div>
            <div>
              {adminNotifications.length === 0 ? <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No new notifications.</p> :
                adminNotifications.map(notif => (
                  <div key={notif.id} onClick={() => handleNotificationClick(notif.date, notif.appId)} style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '15px', cursor: 'pointer', alignItems: 'center' }}>
                    <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '15px', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaRegCalendarAlt /></div>
                    <div><h4 style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#1e293b' }}>{notif.title}</h4><p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>{notif.message}</p><span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>{notif.timestamp}</span></div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            <div className="dash-hero hide-on-print" style={{ marginBottom: '25px', textAlign: 'center', padding: '35px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: 'rgba(255,255,255,0.9)', fontSize: '15px', textTransform: 'uppercase' }}>Currently Serving (In Consultation)</h3>
              <div style={{ fontSize: '72px', fontWeight: '900', lineHeight: '1' }}>{currentServing}</div>
            </div>

            {/* VISUAL KANBAN BOARD VIEW */}
            {queueViewMode === 'kanban' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
                {/* COLUMN 1: CALL NEXT / WAITING */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '15px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#d97706', fontSize: '13px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                    <span>🟡 Call Next (Waiting)</span><span>{kanbanCallNext.length}</span>
                  </h4>
                  {kanbanCallNext.map(app => (
                    <div key={app.id} style={{ background: 'white', padding: '12px', borderRadius: '10px', marginBottom: '10px', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                      <strong style={{ fontSize: '16px', color: '#1e293b' }}>{app.queueNumber}</strong>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>{usersData[app.patientId]?.fullName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>{app.healthService || app.serviceType}</div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => callPatient(app.queueNumber, app.patientId, app.id)} style={{ flex: 1, background: '#0bc25c', color: 'white', border: 'none', padding: '5px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Call Next</button>
                        <button onClick={() => skipPatient(app.id, app.patientId, app.queueNumber)} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>No Show</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* COLUMN 2: IN CONSULTATION */}
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '15px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#2563eb', fontSize: '13px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                    <span>🔵 In Consultation</span><span>{kanbanInConsult.length}</span>
                  </h4>
                  {kanbanInConsult.map(app => (
                    <div key={app.id} style={{ background: 'white', padding: '12px', borderRadius: '10px', marginBottom: '10px', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                      <strong style={{ fontSize: '16px', color: '#2563eb' }}>{app.queueNumber}</strong>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>{usersData[app.patientId]?.fullName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>With Physician / EMR Open</div>
                    </div>
                  ))}
                </div>

                {/* COLUMN 3: COMPLETED */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '15px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#16a34a', fontSize: '13px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                    <span>🟢 Completed</span><span>{kanbanCompleted.length}</span>
                  </h4>
                  {kanbanCompleted.map(app => (
                    <div key={app.id} style={{ background: 'white', padding: '12px', borderRadius: '10px', marginBottom: '10px', borderLeft: '4px solid #16a34a', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                      <strong style={{ fontSize: '15px', color: '#16a34a' }}>{app.queueNumber}</strong>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>{usersData[app.patientId]?.fullName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Cloud EMR Saved</div>
                    </div>
                  ))}
                </div>

                {/* COLUMN 4: NO SHOW */}
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '14px', padding: '15px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#ef4444', fontSize: '13px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                    <span>🔴 No Show</span><span>{kanbanNoShow.length}</span>
                  </h4>
                  {kanbanNoShow.map(app => (
                    <div key={app.id} style={{ background: 'white', padding: '12px', borderRadius: '10px', marginBottom: '10px', borderLeft: '4px solid #ef4444', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                      <strong style={{ fontSize: '15px', color: '#ef4444' }}>{app.queueNumber}</strong>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>{usersData[app.patientId]?.fullName}</div>
                      <button onClick={() => recallPatient(app.id, app.queueNumber)} style={{ marginTop: '6px', width: '100%', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Return to Queue</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* STANDARD LIST VIEW */
              <div className="dash-card hide-on-print" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Live Patient Queue</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaRegCalendarAlt color="#94a3b8" />
                      <input type="date" value={queueDateFilter} onChange={(e) => setQueueDateFilter(e.target.value)} className="modern-input" style={{ padding: '8px 12px', background: 'white' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaFilter color="#94a3b8" />
                      <select value={queueFilter} onChange={(e) => setQueueFilter(e.target.value)} className="modern-input" style={{ padding: '8px 12px', background: 'white' }}>
                        <option value="All">All Categories</option>
                        <option value="Non-Senior/Non-PWD">Non-Senior / Non-PWD</option>
                        <option value="Senior Citizen">Senior Citizen</option>
                        <option value="Pregnant">Pregnant</option>
                        <option value="PWD">PWD</option>
                      </select>
                    </div>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#ffffff', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '15px 25px' }}>Queue, Date & Stage</th>
                      <th style={{ padding: '15px 25px' }}>Patient & Service Details</th>
                      <th style={{ padding: '15px 25px' }}>Queue Board Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeQueue.length === 0 ? <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No patients in queue for this date.</td></tr> :
                      activeQueue.map((app) => (
                        app.status === 'cancelled' ? (
                          <tr id={`row-${app.id}`} key={app.id} style={{ borderBottom: '1px solid #f1f5f9', background: highlightedAppId === app.id ? '#dcfce7' : '#fef2f2' }}>
                            <td style={{ padding: '20px 25px' }}><strong style={{ color: '#ef4444', fontSize: '20px', display: 'block' }}>{app.queueNumber}</strong><span style={{ background: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>CANCELLED</span><div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Date: {app.appointmentDate}</div></td>
                            <td style={{ padding: '20px 25px' }}><div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{usersData[app.patientId]?.fullName || "Unknown"}</div><div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold', marginTop: '5px' }}>Reason: {app.cancelReason}</div></td>
                            <td style={{ padding: '20px 25px' }}><button onClick={() => update(ref(database, `appointments/${app.id}`), { adminAcknowledgedCancel: true })} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Dismiss Alert</button></td>
                          </tr>
                        ) : (
                          <tr id={`row-${app.id}`} key={app.id} style={{ borderBottom: '1px solid #f1f5f9', background: highlightedAppId === app.id ? '#dcfce7' : (app.isSkipped ? '#fef2f2' : 'white') }}>
                            <td style={{ padding: '20px 25px' }}>
                              <strong style={{ color: app.isSkipped ? '#ef4444' : '#0bc25c', fontSize: '20px', display: 'block' }}>{app.queueNumber}</strong>
                              <span style={{ background: app.isSkipped ? '#ef4444' : (app.queueNumber === currentServing ? '#3b82f6' : '#f0fdf4'), color: app.isSkipped || app.queueNumber === currentServing ? 'white' : '#166534', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                {app.isSkipped ? 'NO SHOW' : (app.queueNumber === currentServing ? 'IN CONSULTATION' : 'WAITING')}
                              </span>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Date: {app.appointmentDate} | {formatTimeToAMPM(app.preferredTime)}</div>
                            </td>
                            <td style={{ padding: '20px 25px' }}>
                              <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{usersData[app.patientId]?.fullName || "Unknown"}</div>
                              <div style={{ fontSize: '12px', color: '#00796b', fontWeight: 'bold' }}>{app.healthService || app.serviceType} ({app.serviceType})</div>
                              {app.notes && <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>{app.notes}</div>}
                              {usersData[app.patientId]?.healthMetrics?.conditions && (
                                <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold', marginTop: '6px', background: '#fef2f2', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', border: '1px solid #fecaca' }}>
                                  <FaExclamationTriangle style={{marginRight: '3px'}}/> {decryptData(usersData[app.patientId].healthMetrics.conditions)}
                                </div>
                              )}
                              <button onClick={() => openPatientProfile(app.patientId)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '0', marginTop: '6px', fontWeight: 'bold' }}><FaEye /> View Digital Passport</button>
                            </td>
                            <td style={{ padding: '20px 25px' }}>
                              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                {app.isSkipped ? (
                                  <button onClick={() => recallPatient(app.id, app.queueNumber)} style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}><FaUndo /> Return</button>
                                ) : (
                                  <>
                                    <button onClick={() => openTimeModal(app.id, app.patientId, app.queueNumber)} style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}><FaClock /> Time</button>
                                    <button onClick={() => callPatient(app.queueNumber, app.patientId, app.id)} style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}><FaBullhorn /> Call Next</button>
                                    <button onClick={() => skipPatient(app.id, app.patientId, app.queueNumber)} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}><FaStepForward /> No Show</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'vitals' && (
          <div className="dash-card hide-on-print" style={{ padding: '0', overflow: 'hidden' }}>
             <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}><h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Cloud EMR Patient Registry & Triage Vitals</h3></div>
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead><tr style={{ background: '#ffffff', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: '15px 25px' }}>Patient & Barangay ID</th><th style={{ padding: '15px 25px' }}>Last Updated</th><th style={{ padding: '15px 25px' }}>Action</th></tr></thead>
                <tbody>
                  {patientList.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                      <td style={{ padding: '20px 25px' }}>
                        <strong style={{ color: '#1e293b', display: 'block', fontSize: '15px' }}>{user.fullName}</strong>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{user.idType || 'Barangay ID'}: {user.idNumber || 'Registered'} | {user.purok}</span>
                      </td>
                      <td style={{ padding: '20px 25px' }}>{user.healthMetrics?.lastUpdated ? <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '14px' }}>{user.healthMetrics.lastUpdated}</span> : <span style={{ color: '#94a3b8', fontSize: '13px' }}>No records yet</span>}</td>
                      <td style={{ padding: '20px 25px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => openVitalsModal(user.id, user.fullName)} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '8px 15px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><FaHeartbeat /> Record Vitals</button>
                          <button onClick={() => openPatientProfile(user.id)} style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '8px 15px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><FaEye /> Health Passport</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        )}

        {activeTab === 'inventory' && (
          <>
            <div className="dash-card hide-on-print" style={{ padding: '0', overflow: 'hidden', marginBottom: '25px' }}>
               <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}><h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Medicine & Vaccine Inventory Tracker</h3></div>
               <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead><tr style={{ background: '#ffffff', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: '15px 25px' }}>Item Details</th><th style={{ padding: '15px 25px' }}>Stock Level</th><th style={{ padding: '15px 25px' }}>Status</th><th style={{ padding: '15px 25px' }}>Manage Stock</th></tr></thead>
                  <tbody>
                    {inventory.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No items in inventory.</td></tr> : inventory.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                        <td style={{ padding: '20px 25px' }}><strong style={{ color: '#1e293b', display: 'block', fontSize: '15px' }}>{item.itemName}</strong><div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}><FaBoxOpen /> {item.category}</div></td>
                        <td style={{ padding: '20px 25px' }}><span style={{ fontSize: '20px', fontWeight: '800', color: item.stock <= item.threshold ? '#ef4444' : '#1e293b' }}>{item.stock}</span><span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '5px' }}>units</span></td>
                        <td style={{ padding: '20px 25px' }}>{item.stock <= 0 ? <span style={{ background: '#fef2f2', color: '#ef4444', padding: '4px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #fecaca' }}>OUT OF STOCK</span> : item.stock <= item.threshold ? <span style={{ background: '#fffbeb', color: '#d97706', padding: '4px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #fde68a' }}>LOW STOCK</span> : <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #bbf7d0' }}>IN STOCK</span>}</td>
                        <td style={{ padding: '20px 25px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => { setStockUpdate({ id: item.id, itemName: item.itemName, currentStock: item.stock, amount: '', type: 'add', recipient: '' }); setShowStockModal(true); }} style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', width: '35px', height: '35px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Add Stock"><FaPlus /></button>
                            <button onClick={() => { setStockUpdate({ id: item.id, itemName: item.itemName, currentStock: item.stock, amount: '', type: 'deduct', recipient: '' }); setShowStockModal(true); }} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', width: '35px', height: '35px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Dispense to Patient"><FaMinus /></button>
                            <button onClick={() => { setInventoryItem(item); setShowInventoryModal(true); }} style={{ background: 'white', color: '#64748b', border: '1px solid #cbd5e1', padding: '0 15px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Edit</button>
                            <button onClick={() => deleteInventoryItem(item.id, item.itemName)} style={{ background: 'white', color: '#ef4444', border: '1px solid #fecaca', width: '35px', height: '35px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Delete Item"><FaTrash /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>

            {/* LINKED PATIENT MEDICINE DISTRIBUTION LOGS */}
            <div className="dash-card hide-on-print" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Patient Medicine & Vaccine Distribution Logs</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead><tr style={{ background: '#ffffff', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: '15px 25px' }}>Timestamp</th><th style={{ padding: '15px 25px' }}>Dispensed Item</th><th style={{ padding: '15px 25px' }}>Patient Recipient</th><th style={{ padding: '15px 25px' }}>Qty</th></tr></thead>
                <tbody>
                  {distributionLogs.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No medicine distribution logs recorded yet.</td></tr> : distributionLogs.slice(0, 15).map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', background: 'white', fontSize: '13px' }}>
                      <td style={{ padding: '15px 25px', color: '#64748b' }}>{log.timestamp}</td>
                      <td style={{ padding: '15px 25px', fontWeight: 'bold', color: '#1e293b' }}>{log.itemName}</td>
                      <td style={{ padding: '15px 25px', color: '#334155' }}>{log.patientName} ({log.queueNumber})</td>
                      <td style={{ padding: '15px 25px', fontWeight: 'bold', color: '#0bc25c' }}>{log.quantity} unit(s)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'records' && (
          <div className="dash-card hide-on-print" style={{ padding: '0', overflow: 'hidden' }}>
             <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Cloud EMR History Log</h3>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FaFilter color="#94a3b8" /><select value={recordFilter} onChange={(e) => setRecordFilter(e.target.value)} className="modern-input" style={{ padding: '8px 12px', background: 'white' }}><option value="All">All Categories</option><option value="Non-Senior/Non-PWD">Non-Senior / Non-PWD</option><option value="Senior Citizen">Senior Citizen</option><option value="Pregnant">Pregnant</option><option value="PWD">PWD</option></select></div>
             </div>
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead><tr style={{ background: '#ffffff', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: '15px 25px' }}>Date & Time Booked</th><th style={{ padding: '15px 25px' }}>Patient Details</th><th style={{ padding: '15px 25px' }}>Service & Follow-Up</th><th style={{ padding: '15px 25px' }}>Status</th></tr></thead>
                <tbody>
                  {filteredRecords.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No records found.</td></tr> : filteredRecords.map((app) => (
                    <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                      <td style={{ padding: '20px 25px' }}><div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{app.appointmentDate}</div><div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Time: {formatTimeBooked(app.createdAt)}</div></td>
                      <td style={{ padding: '20px 25px' }}>
                        <strong style={{ color: '#1e293b', display: 'block', fontSize: '14px' }}>{usersData[app.patientId]?.fullName || "Unknown"}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b', margin: '4px 0' }}>Queue: {app.queueNumber}</div>
                        {usersData[app.patientId]?.healthMetrics?.conditions && (
                           <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 'bold', marginTop: '6px', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', border: '1px solid #fecaca' }}>
                              <FaExclamationTriangle style={{marginRight: '3px'}}/> {decryptData(usersData[app.patientId].healthMetrics.conditions)}
                           </div>
                        )}
                        <button onClick={() => openPatientProfile(app.patientId)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '0', fontWeight: 'bold', marginTop: '6px' }}><FaEye /> View Passport</button>
                      </td>
                      <td style={{ padding: '20px 25px' }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#00796b' }}>{app.healthService || app.serviceType}</div>
                        {app.notes && <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>{app.notes}</div>}
                        {app.followUpDate && <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 'bold', marginTop: '4px' }}>Follow-Up: {app.followUpDate}</div>}
                      </td>
                      <td style={{ padding: '20px 25px' }}><span style={{ background: '#dcfce7', color: '#16a34a', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>Completed</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        )}

        {activeTab === 'feedback' && (() => {
          const feedbackList = appointments.filter(app => app.feedbackSubmitted && app.rating > 0);
          const filteredFeedback = ratingFilter === 'All' ? feedbackList : feedbackList.filter(app => app.rating === parseInt(ratingFilter));
          const averageRating = feedbackList.length > 0 ? (feedbackList.reduce((acc, curr) => acc + curr.rating, 0) / feedbackList.length).toFixed(1) : 0;
          return (
            <div className="dash-card hide-on-print" style={{ padding: '0', overflow: 'hidden' }}>
               <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                 <div><h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Recent Patient Feedback</h3><p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#64748b' }}>Reviews and ratings from completed appointments. (Anonymous)</p></div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fffbeb', padding: '8px 15px', borderRadius: '8px', border: '1px solid #fde68a' }}><FaStar color="#f59e0b" size={20} /><div><span style={{ display: 'block', fontSize: '16px', fontWeight: '900', color: '#d97706', lineHeight: '1' }}>{averageRating}</span><span style={{ fontSize: '10px', color: '#d97706', textTransform: 'uppercase', fontWeight: 'bold' }}>Avg Rating ({feedbackList.length})</span></div></div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FaFilter color="#94a3b8" /><select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="modern-input" style={{ padding: '8px 12px', background: 'white', minWidth: '130px' }}><option value="All">All Ratings</option><option value="5">5 Stars</option><option value="4">4 Stars</option><option value="3">3 Stars</option><option value="2">2 Stars</option><option value="1">1 Star</option></select></div>
                 </div>
               </div>
               <div style={{ padding: '25px' }}>
                  {filteredFeedback.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '50px 0' }}><FaStar style={{ fontSize: '40px', marginBottom: '15px', color: '#e2e8f0' }} /><h3 style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>No feedback found for this filter.</h3></div>
                  ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                          {filteredFeedback.map(app => (
                              <div key={app.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                      <div><strong style={{ color: '#1e293b', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}><FaUserShield style={{ color: '#0bc25c' }} /> Anonymous Resident</strong><span style={{ fontSize: '11px', color: '#94a3b8' }}>Identity hidden for privacy</span></div>
                                      <div style={{ display: 'flex', color: '#f59e0b', gap: '2px' }}>{[...Array(5)].map((_, i) => <FaStar key={i} color={i < app.rating ? '#f59e0b' : '#e2e8f0'} />)}</div>
                                  </div>
                                  <div style={{ display: 'inline-block', background: '#f0fdf4', color: '#0bc25c', fontSize: '10px', padding: '4px 10px', borderRadius: '15px', fontWeight: 'bold', marginBottom: '15px' }}>{app.healthService || app.serviceType} | {app.appointmentDate}</div>
                                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #cbd5e1' }}><p style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic', margin: 0 }}>"{app.feedbackComment || "User submitted a star rating without a written comment."}"</p></div>
                              </div>
                          ))}
                      </div>
                  )}
               </div>
            </div>
          );
        })()}

        {activeTab === 'analytics' && (
          <div>
            <div className="print-header" style={{ display: 'none', textAlign: 'center', marginBottom: '30px' }}>
              <h2 style={{ margin: 0 }}>Barangay Old Cabalan Health Center</h2>
              <p style={{ margin: '5px 0' }}>MediQueue: Predictive Community Health Analytics & Smart Records Report</p>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Generated on: {new Date().toLocaleDateString()}</p>
              <hr style={{ border: '1px solid #e2e8f0', margin: '20px 0' }} />
            </div>

            {/* PREDICTIVE COMMUNITY HEALTH ANALYTICS CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '20px' }}>
              <div className="dash-card" style={{ marginBottom: 0, borderLeft: '5px solid #a855f7' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#7e22ce', display: 'flex', alignItems: 'center', gap: '6px' }}><FaBrain /> AI 30-DAY DEMAND FORECAST</span>
                <h2 style={{ margin: '8px 0 4px 0', fontSize: '26px', color: '#1e293b' }}>~{predictedNextMonthVolume} Patients</h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Projected next-month consultation volume (+28% seasonal trend)</p>
              </div>
              <div className="dash-card" style={{ marginBottom: 0, borderLeft: '5px solid #ef4444' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}><FaExclamationTriangle /> PREDICTIVE HOTSPOT WATCH</span>
                <h2 style={{ margin: '8px 0 4px 0', fontSize: '26px', color: '#1e293b' }}>{topHotspot.purok}</h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Highest case cluster ({topHotspot.cases} recorded visits). Priority for BHW field visit.</p>
              </div>
              <div className="dash-card" style={{ marginBottom: 0, borderLeft: '5px solid #0bc25c' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}><FaPills /> MEDICINE RESTOCK FORECAST</span>
                <h2 style={{ margin: '8px 0 4px 0', fontSize: '26px', color: '#1e293b' }}>{lowStockCount > 0 ? `${lowStockCount} Low Items` : 'Optimal Stock'}</h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Predicted high demand for Hypertension & Pediatric Vitamins</p>
              </div>
            </div>
            
            <div className="hide-on-print" style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <strong style={{ color: '#1e293b' }}>Filter Report Data:</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>START DATE:</label>
                <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="modern-input" style={{ padding: '8px 12px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>END DATE:</label>
                <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="modern-input" style={{ padding: '8px 12px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div className="dash-card" style={{ flex: 2, minWidth: '400px', pageBreakInside: 'avoid' }}>
                <h3 style={{ color: '#1e293b', marginBottom: '25px', fontSize: '18px' }}>Appointments Per Priority Category</h3>
                <ResponsiveContainer width="100%" height={300}><BarChart data={processServiceData()} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{fontSize: 12}} /><YAxis allowDecimals={false} /><ChartTooltip cursor={{fill: '#f8fafc'}} /><Legend /><Bar dataKey="total" name="Total Patients" fill="#0bc25c" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
              </div>
              <div className="dash-card" style={{ flex: 1, minWidth: '300px', pageBreakInside: 'avoid' }}>
                <h3 style={{ color: '#1e293b', marginBottom: '25px', textAlign: 'center', fontSize: '18px' }}>Consultation Status</h3>
                <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={processStatusData()} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>{processStatusData().map((entry, index) => <Cell key={`cell-${index}`} fill={['#f59e0b', '#10b981'][index % 2]} />)}</Pie><ChartTooltip /><Legend /></PieChart></ResponsiveContainer>
              </div>
            </div>
            
            <div className="dash-card" style={{ width: '100%', marginBottom: '20px', pageBreakInside: 'avoid' }}>
              <h3 style={{ color: '#1e293b', marginBottom: '5px', fontSize: '18px' }}>Predictive Community Health Hotspot & Purok Forecast</h3>
              <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '25px' }}>Current recorded cases vs. AI-Projected Next Month Demand by Purok.</p>
              <ResponsiveContainer width="100%" height={300}><BarChart data={purokStats} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="purok" tick={{fontSize: 12}} /><YAxis allowDecimals={false} /><ChartTooltip cursor={{fill: '#fef2f2'}} /><Legend /><Bar dataKey="cases" name="Current Recorded Cases" fill="#ef4444" radius={[6, 6, 0, 0]} /><Bar dataKey="predictedNextMonth" name="AI Projected Next Month" fill="#a855f7" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
            </div>

            <div className="dash-card" style={{ padding: '0', overflow: 'hidden', pageBreakInside: 'avoid' }}>
              <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Detailed Cloud EMR Medical Log</h3>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#64748b' }}>Showing data from {reportStartDate} to {reportEndDate}</p>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#ffffff', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '15px 25px' }}>Date</th>
                    <th style={{ padding: '15px 25px' }}>Patient Name</th>
                    <th style={{ padding: '15px 25px' }}>Service</th>
                    <th style={{ padding: '15px 25px' }}>Doctor's Diagnosis (Decrypted)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportAppointments.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No completed appointments in this date range.</td></tr>
                  ) : (
                    reportAppointments.map((app) => (
                      <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                        <td style={{ padding: '15px 25px', fontSize: '13px', color: '#1e293b', fontWeight: 'bold' }}>{app.appointmentDate}</td>
                        <td style={{ padding: '15px 25px', fontSize: '13px', color: '#475569' }}>{usersData[app.patientId]?.fullName || "Unknown"}</td>
                        <td style={{ padding: '15px 25px', fontSize: '13px', color: '#475569' }}>{app.healthService || app.serviceType}</td>
                        <td style={{ padding: '15px 25px', fontSize: '13px', color: '#475569', fontStyle: app.diagnosis ? 'normal' : 'italic' }}>{decryptData(app.diagnosis) || "No diagnosis saved."}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="hide-on-print">
            <div className="dash-card" style={{ marginBottom: '20px', padding: '30px' }}>
              <h3 style={{ color: '#1e293b', margin: '0 0 20px 0', fontSize: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>General Configuration</h3>
              <div className="modern-group">
                <label style={{ color: '#475569', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>CLINIC STATUS</label>
                <select value={clinicStatus} onChange={(e)=>setClinicStatus(e.target.value)} className="modern-input">
                  <option value="Open">Open (Accepting Appointments)</option>
                  <option value="Closed">Closed / Halted</option>
                </select>
              </div>
              {clinicStatus === 'Closed' && (
                <div className="modern-group" style={{ marginTop: '15px' }}>
                  <label style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>REASON FOR CLOSING</label>
                  <input type="text" value={closedReason} onChange={(e)=>setClosedReason(e.target.value)} placeholder="e.g., National Holiday, Emergency, Custom Reason..." className="modern-input" style={{ border: '1px solid #fecaca' }} />
                </div>
              )}
            </div>
            <div className="dash-card" style={{ borderLeft: '5px solid #3b82f6', padding: '30px' }}>
              <h3 style={{ color: '#3b82f6', margin: '0 0 15px 0', fontSize: '18px' }}>System Actions</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: '#eff6ff', padding: '20px', borderRadius: '8px' }}>
                <div style={{ flex: 1 }}><h4 style={{ color: '#1e293b', margin: '0 0 5px 0' }}>Clear Daily Queue</h4><p style={{ color: '#64748b', margin: 0, fontSize: '13px' }}>Clear the currently serving number to prepare for a new day.</p></div>  
                <button onClick={handleClearQueue} className="btn-green-full" style={{ width: 'auto', background: '#ef4444', padding: '12px 25px', margin:0 }}><FaTrash /> Clear Queue</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;