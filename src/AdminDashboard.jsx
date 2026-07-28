import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, database } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue, set, update, push, get } from 'firebase/database';
import { 
  FaHome, FaUsers, FaCog, FaSignOutAlt, FaUserShield, FaBullhorn, 
  FaCheckCircle, FaExclamationTriangle, FaTrash, FaClock, FaFilter, 
  FaTimes, FaEye, FaIdBadge, FaChartBar, FaPrint, FaInfoCircle, 
  FaTimesCircle, FaUser, FaEnvelope, FaPhoneAlt, FaMapMarkerAlt,
  FaStepForward, FaUndo, FaHeartbeat, FaBoxOpen, FaPlus, FaMinus, FaPills, FaStar, FaSave, FaRegCalendarAlt, FaBell
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './App.css';

function AdminDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [usersData, setUsersData] = useState({});
  const [currentServing, setCurrentServing] = useState("None");
  const [activeTab, setActiveTab] = useState('dashboard'); 
  
  const [recordFilter, setRecordFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All'); 
  const [queueFilter, setQueueFilter] = useState('All'); 
  
  const getLocalDate = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    d.setMinutes(d.getMinutes() - offset);
    return d.toISOString().split('T')[0];
  };
  const [queueDateFilter, setQueueDateFilter] = useState(getLocalDate());
  
  const [adminNotifications, setAdminNotifications] = useState([]);
  
  // State para sa pag-highlight ng row
  const [highlightedAppId, setHighlightedAppId] = useState(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeModalData, setTimeModalData] = useState({ appId: '', patientId: '', queueNum: '' });
  const [selectedTime, setSelectedTime] = useState('');
  
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsData, setVitalsData] = useState({ patientId: '', name: '', bp: '', hr: '', weight: '', height: '' });
  
  const [inventory, setInventory] = useState([]);
  const [lowStockCount, setLowStockCount] = useState(0); 
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryItem, setInventoryItem] = useState({ id: '', itemName: '', category: 'Medicine', stock: '', threshold: '20' });
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockUpdate, setStockUpdate] = useState({ id: '', itemName: '', currentStock: 0, amount: '', type: 'add' });
  
  const [clinicStatus, setClinicStatus] = useState('Open');
  const [closedReason, setClosedReason] = useState(''); 
  
  const [alertBox, setAlertBox] = useState({ show: false, message: '', type: 'info' });
  const [confirmBox, setConfirmBox] = useState({ show: false, message: '', onConfirm: null });
  const navigate = useNavigate();
  const showAlert = (message, type = 'info') => setAlertBox({ show: true, message, type });
  const showConfirm = (message, onConfirm) => setConfirmBox({ show: true, message, onConfirm });

  // Pakinggan ang Admin Notifications
  useEffect(() => {
     onValue(ref(database, `notifications/admin`), (snapshot) => {
        if (snapshot.exists()) {
           setAdminNotifications(Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })).reverse());
        } else {
           setAdminNotifications([]);
        }
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
      if (snapshot.exists()) {
          const rawAppts = Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })).reverse();
          setAppointments(rawAppts);
      }
      else {
          setAppointments([]);
      }
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
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const callPatient = (queueNum, patientId) => {
    set(ref(database, 'liveQueue/current'), queueNum);
    push(ref(database, `notifications/${patientId}`), { title: "IT'S YOUR TURN!", message: `Queue ${queueNum} is now being served.`, timestamp: new Date().toLocaleString() });
    showAlert(`Called ${queueNum}!`, "success");
  };

  const skipPatient = (appId, patientId, queueNum) => {
    showConfirm(`SKIP Queue ${queueNum}?`, () => {
      update(ref(database, `appointments/${appId}`), { isSkipped: true, skippedAt: new Date().getTime() });
      push(ref(database, `notifications/${patientId}`), { title: "You Missed Your Turn", message: `Queue ${queueNum} was skipped.`, timestamp: new Date().toLocaleString() });
      showAlert(`${queueNum} Skipped.`, "success");
    });
  };

  const recallPatient = (appId, queueNum) => {
    update(ref(database, `appointments/${appId}`), { isSkipped: false });
    showAlert(`${queueNum} returned to active.`, "success");
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
    const currentVitals = usersData[patientId]?.healthMetrics || { bp: '', hr: '', weight: '', height: '' };
    setVitalsData({ patientId, name, bp: currentVitals.bp, hr: currentVitals.hr, weight: currentVitals.weight, height: currentVitals.height });
    setShowVitalsModal(true);
  };

  const saveVitals = () => {
    update(ref(database, `users/${vitalsData.patientId}/healthMetrics`), {
      bp: vitalsData.bp, hr: vitalsData.hr, weight: vitalsData.weight, height: vitalsData.height, lastUpdated: new Date().toLocaleDateString()
    }).then(() => { setShowVitalsModal(false); showAlert("Vitals updated!", "success"); });
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
      setShowStockModal(false);
      showAlert(`Stock successfully updated!`, "success");
    });
  };

  const deleteInventoryItem = (id, name) => {
    showConfirm(`Are you sure you want to delete ${name} from inventory?`, () => {
      set(ref(database, `inventory/${id}`), null);
      showAlert("Item permanently deleted.", "success");
    });
  };

  const markCompleted = (appId) => {
    showConfirm("Check-up complete?", () => {
      update(ref(database, `appointments/${appId}`), { status: "completed" });
      showAlert("Completed.", "success");
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

  const handleLogout = () => {
    signOut(auth).then(() => navigate('/'));
  };

  const openPatientProfile = (patientId) => {
    const patientInfo = usersData[patientId];
    if (patientInfo) {
      setSelectedPatient(patientInfo);
      setShowPatientModal(true);
    } else {
      showAlert("Patient information not found.", "error");
    }
  };

  const handleNotificationClick = (dateStr, appId) => {
    if(dateStr) {
      setQueueDateFilter(dateStr);
    }
    setActiveTab('dashboard');
    if(appId) {
      setHighlightedAppId(appId);
      
      setTimeout(() => {
        const targetRow = document.getElementById(`row-${appId}`);
        if(targetRow) {
          targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      setTimeout(() => {
        setHighlightedAppId(null);
      }, 3500);
    }
  };

  const getTabStyle = (t) => activeTab === t ? { background: '#f0fdf4', color: '#0bc25c', borderRight: '4px solid #0bc25c', fontWeight: 'bold' } : { color: '#64748b' };
  
  const filteredRecords = recordFilter === 'All' ? appointments.filter(app => app.status === 'completed') : appointments.filter(app => app.status === 'completed' && app.serviceType === recordFilter);
  
  const activeQueue = appointments
    .filter(app => app.appointmentDate === queueDateFilter || queueDateFilter === '') 
    .filter(app => app.status === 'pending' || (app.status === 'cancelled' && !app.adminAcknowledgedCancel))
    .filter(app => queueFilter === 'All' || app.serviceType === queueFilter)
    .sort((a, b) => {
      if (a.isSkipped && !b.isSkipped) return 1;
      if (!a.isSkipped && b.isSkipped) return -1;
      return 0; 
    });
  const patientList = Object.keys(usersData).filter(uid => usersData[uid].role !== 'admin').map(uid => ({ id: uid, ...usersData[uid] }));
  
  const processServiceData = () => {
    const counts = { 'Non-Senior/Non-PWD': 0, 'Senior Citizen': 0, 'Pregnant': 0, 'PWD': 0 };
    appointments.forEach(app => { if (counts[app.serviceType] !== undefined) counts[app.serviceType]++; });
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
    appointments.forEach(app => {
      const patientPurok = usersData[app.patientId]?.purok;
      if (patientPurok && counts[patientPurok] !== undefined) counts[patientPurok]++;
    });
    return Object.keys(counts).map(key => ({ purok: key, cases: counts[key] }));
  };

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
            <div style={{ textAlign: 'center', marginBottom: '20px' }}><div style={{ background: '#fef2f2', color: '#ef4444', width: '50px', height: '50px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', margin: '0 auto 10px auto' }}><FaHeartbeat /></div><h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '20px', fontWeight: '800' }}>Update Health Metrics</h2><p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Patient: <strong style={{color: '#1e293b'}}>{vitalsData.name}</strong></p></div>
            <div className="form-content">
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${liveAdminBmi.color}` }}>
                <div><span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>AUTO COMPUTED BMI</span><div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>{liveAdminBmi.val}</div></div>
                {liveAdminBmi.label && (<span style={{ background: `${liveAdminBmi.color}20`, color: liveAdminBmi.color, padding: '4px 10px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold' }}>{liveAdminBmi.label}</span>)}
              </div>
              <div className="modern-group" style={{ marginBottom: '15px' }}><label style={{ fontSize: '12px', fontWeight: 'bold' }}>BLOOD PRESSURE</label><input type="text" value={vitalsData.bp} onChange={(e) => setVitalsData({...vitalsData, bp: e.target.value})} className="modern-input" /></div>
              <div className="modern-group" style={{ marginBottom: '15px' }}><label style={{ fontSize: '12px', fontWeight: 'bold' }}>HEART RATE (bpm)</label><input type="text" value={vitalsData.hr} onChange={(e) => setVitalsData({...vitalsData, hr: e.target.value})} className="modern-input" /></div>
              <div style={{ display:'flex', gap:'10px', marginBottom: '25px' }}>
                  <div className="modern-group" style={{ flex: 1, marginBottom: 0 }}><label style={{ fontSize: '12px', fontWeight: 'bold' }}>WEIGHT (kg)</label><input type="number" value={vitalsData.weight} onChange={(e) => setVitalsData({...vitalsData, weight: e.target.value})} className="modern-input" /></div>
                  <div className="modern-group" style={{ flex: 1, marginBottom: 0 }}><label style={{ fontSize: '12px', fontWeight: 'bold' }}>HEIGHT (cm)</label><input type="number" value={vitalsData.height} onChange={(e) => setVitalsData({...vitalsData, height: e.target.value})} className="modern-input" /></div>
              </div>
              <button onClick={saveVitals} className="btn-green-full" style={{ background: '#ef4444' }}>Save Vitals</button>
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
            <div style={{ textAlign: 'center', marginBottom: '25px' }}><div style={{ background: '#eff6ff', color: '#3b82f6', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', margin: '0 auto 15px auto' }}><FaPills /></div><h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '22px', fontWeight: '800' }}>{inventoryItem.id ? 'Edit Item' : 'Add New Item'}</h2><p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Manage health center supplies.</p></div>
            <form onSubmit={handleSaveInventoryItem} className="form-content">
              <div className="modern-group" style={{ marginBottom: '15px' }}><label style={{ color: '#475569', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>ITEM NAME</label><input type="text" placeholder="e.g. Paracetamol 500mg" value={inventoryItem.itemName} onChange={(e) => setInventoryItem({...inventoryItem, itemName: e.target.value})} className="modern-input" required /></div>
              <div className="modern-group" style={{ marginBottom: '15px' }}><label style={{ color: '#475569', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>CATEGORY</label><select value={inventoryItem.category} onChange={(e) => setInventoryItem({...inventoryItem, category: e.target.value})} className="modern-input" required><option value="Medicine">Medicine</option><option value="Vitamins">Vitamins</option><option value="Medical Supply">Medical Supply</option><option value="Vaccine">Vaccine</option></select></div>
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
            <div style={{ textAlign: 'center', marginBottom: '25px' }}><div style={{ background: stockUpdate.type === 'add' ? '#dcfce7' : '#fef2f2', color: stockUpdate.type === 'add' ? '#16a34a' : '#ef4444', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', margin: '0 auto 15px auto' }}>{stockUpdate.type === 'add' ? <FaPlus /> : <FaMinus />}</div><h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '22px', fontWeight: '800' }}>{stockUpdate.type === 'add' ? 'Add Stock' : 'Deduct Stock'}</h2><p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Item: <strong style={{color: '#1e293b'}}>{stockUpdate.itemName}</strong></p></div>
            <form onSubmit={handleUpdateStock} className="form-content">
              <div className="modern-group" style={{ marginBottom: '25px' }}><label style={{ color: '#475569', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>AMOUNT TO {stockUpdate.type === 'add' ? 'ADD' : 'DEDUCT'}</label><input type="number" min="1" placeholder="0" value={stockUpdate.amount} onChange={(e) => setStockUpdate({...stockUpdate, amount: e.target.value})} className="modern-input" required /></div>
              <button type="submit" className="btn-green-full" style={{ background: stockUpdate.type === 'add' ? '#0bc25c' : '#ef4444' }}>Confirm Update</button>
            </form>
          </div>
        </div>
      )}
      {showPatientModal && selectedPatient && (
        <div className="modal-overlay hide-on-print" style={{ zIndex: 1000 }}>
          <div className="modern-register-card" style={{ maxWidth: '600px', padding: '40px', position: 'relative' }}>
            <button onClick={() => setShowPatientModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}><FaTimes /></button>
            <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', marginTop: '10px' }}>
              <div style={{ textAlign: 'center', minWidth: '150px' }}>
                <div style={{ width: '120px', height: '120px', margin: '0 auto 15px auto' }}>{selectedPatient.profilePicture ? <img src={selectedPatient.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f0fdf4' }} /> : <div style={{ background: '#f8fafc', width: '100%', height: '100%', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '50px', color: '#cbd5e1', border: '4px solid #e2e8f0' }}><FaIdBadge /></div>}</div>
                <h3 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '18px' }}>{selectedPatient.fullName}</h3>
                <span style={{ background: '#f0fdf4', color: '#0bc25c', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #bbf7d0' }}>Registered Patient</span>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: '#1e293b', fontSize: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><FaUser style={{ color: '#0bc25c' }}/> Patient Information</h3>
                <div style={{ marginBottom: '15px' }}><p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Email Address</p><p style={{ color: '#334155', fontWeight: '600', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><FaEnvelope style={{color: '#cbd5e1'}}/> {selectedPatient.email}</p></div>
                <div style={{ marginBottom: '15px' }}><p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Contact Number</p><p style={{ color: '#334155', fontWeight: '600', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><FaPhoneAlt style={{color: '#cbd5e1'}}/> {selectedPatient.contact}</p></div>
                <div style={{ marginBottom: '15px' }}><p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Purok / Zone</p><p style={{ color: '#334155', fontWeight: '600', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><FaMapMarkerAlt style={{color: '#cbd5e1'}}/> {selectedPatient.purok ? `Purok ${selectedPatient.purok}` : 'Not Specified'}</p></div>
                <div><p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Complete Address</p><p style={{ color: '#334155', fontWeight: '600', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><FaHome style={{color: '#cbd5e1', flexShrink: 0}}/> {selectedPatient.address}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="hide-on-print" style={{ width: '260px', background: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', top: 0, left: 0 }}>
        <div style={{ padding: '30px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#0bc25c', color: 'white', padding: '10px', borderRadius: '10px', fontSize: '20px' }}><FaUserShield /></div>
          <div><h2 style={{ margin: 0, fontSize: '16px', color: '#1e293b', fontWeight: '800' }}>Admin Panel</h2><p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Old Cabalan Health</p></div>
        </div>
        <ul style={{ listStyle: 'none', padding: '20px 0', margin: 0, flex: 1 }}>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', transition: '0.2s', ...getTabStyle('dashboard') }} onClick={() => setActiveTab('dashboard')}><FaHome /> Dashboard</li>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', transition: '0.2s', ...getTabStyle('vitals') }} onClick={() => setActiveTab('vitals')}><FaHeartbeat /> Vital Signs</li>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', transition: '0.2s', ...getTabStyle('records') }} onClick={() => setActiveTab('records')}><FaUsers /> Patient Records</li>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '15px', transition: '0.2s', ...getTabStyle('inventory') }} onClick={() => setActiveTab('inventory')}>
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}><FaBoxOpen /> Inventory</div>
              {lowStockCount > 0 && <span style={{background:'#ef4444', color:'white', fontSize:'10px', padding:'2px 6px', borderRadius:'10px', fontWeight:'bold'}}>{lowStockCount}</span>}
          </li>
          {/* NOTIFICATIONS TAB */}
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '15px', transition: '0.2s', ...getTabStyle('notifications') }} onClick={() => setActiveTab('notifications')}>
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}><FaBell /> Notifications</div>
              {adminNotifications.length > 0 && <span style={{background:'#ef4444', color:'white', fontSize:'10px', padding:'2px 6px', borderRadius:'10px', fontWeight:'bold'}}>{adminNotifications.length}</span>}
          </li>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', transition: '0.2s', ...getTabStyle('feedback') }} onClick={() => setActiveTab('feedback')}><FaStar /> Patient Feedback</li>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', transition: '0.2s', ...getTabStyle('analytics') }} onClick={() => setActiveTab('analytics')}><FaChartBar /> Reports & Analytics</li>
          <li style={{ padding: '15px 25px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', transition: '0.2s', ...getTabStyle('settings') }} onClick={() => setActiveTab('settings')}><FaCog /> Settings</li>
        </ul>
        <div onClick={handleLogout} style={{ padding: '20px 25px', borderTop: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', fontWeight: 'bold', fontSize: '15px' }}><FaSignOutAlt /> Logout</div>
      </div>
      <div className="printable-area" style={{ flex: 1, marginLeft: '260px', padding: '40px' }}>
        
        <div className="hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '24px', fontWeight: '800', textTransform: 'capitalize' }}>{activeTab === 'dashboard' ? 'Queue' : activeTab} Management</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {activeTab === 'analytics' && <button onClick={() => window.print()} className="btn-green-full" style={{ width: 'auto', padding: '12px 25px', margin:0 }}><FaPrint /> Print Report</button>}
            {activeTab === 'inventory' && <button onClick={() => { setInventoryItem({ id: '', itemName: '', category: 'Medicine', stock: '', threshold: '20' }); setShowInventoryModal(true); }} className="btn-green-full" style={{ width: 'auto', padding: '12px 25px', background: '#3b82f6', margin:0 }}><FaPlus /> Add New Item</button>}
            {activeTab === 'settings' && <button onClick={handleSaveSettings} className="btn-green-full" style={{ width: 'auto', padding: '10px 20px', margin:0 }}><FaSave/> Save Settings</button>}
          </div>
        </div>
        {/* ADMIN NOTIFICATIONS VIEW TABS */}
        {activeTab === 'notifications' && (
          <div className="dash-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Admin Notifications</h3>
              {adminNotifications.length > 0 && (
                <button onClick={() => {
                  set(ref(database, 'notifications/admin'), null);
                  showAlert("All notifications cleared.", "success");
                }} style={{background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px'}}>
                  Clear All
                </button>
              )}
            </div>
            <div>
              {adminNotifications.length === 0 ? (
                 <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No new notifications.</p>
              ) : (
                 adminNotifications.map(notif => (
                   <div key={notif.id} 
                        onClick={() => handleNotificationClick(notif.date, notif.appId)}
                        style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '15px', cursor: 'pointer', transition: '0.2s', alignItems: 'center' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                   >
                     <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '15px', borderRadius: '50%', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaRegCalendarAlt /></div>
                     <div>
                       <h4 style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#1e293b' }}>{notif.title}</h4>
                       <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>{notif.message}</p>
                       <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>{notif.timestamp}</span>
                     </div>
                   </div>
                 ))
              )}
            </div>
          </div>
        )}
        {activeTab === 'dashboard' && (
          <>
            <div className="dash-hero" style={{ marginBottom: '30px', textAlign: 'center', padding: '40px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: 'rgba(255,255,255,0.9)', fontSize: '16px', textTransform: 'uppercase' }}>Currently Serving</h3>
              <div style={{ fontSize: '80px', fontWeight: '900', lineHeight: '1' }}>{currentServing}</div>
            </div>
            <div className="dash-card" style={{ padding: '0', overflow: 'hidden' }}>
              
              <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Live Patient Queue</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaRegCalendarAlt color="#94a3b8" />
                      <input type="date" value={queueDateFilter} onChange={(e) => setQueueDateFilter(e.target.value)} className="modern-input" style={{ padding: '8px 12px', background: 'white' }} />
                    </div>
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
                    <th style={{ padding: '15px 25px' }}>Queue, Date & Time</th>
                    <th style={{ padding: '15px 25px' }}>Patient Details</th>
                    <th style={{ padding: '15px 25px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeQueue.length === 0 ? <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No patients in queue for this date.</td></tr> :
                    activeQueue.map((app) => (
                      app.status === 'cancelled' ? (
                        <tr id={`row-${app.id}`} key={app.id} style={{ borderBottom: '1px solid #f1f5f9', background: highlightedAppId === app.id ? '#dcfce7' : '#fef2f2', transition: 'background-color 0.5s ease' }}>
                          <td style={{ padding: '20px 25px' }}>
                            <strong style={{ color: '#ef4444', fontSize: '20px', display: 'block' }}>{app.queueNumber}</strong>
                            <span style={{ background: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>CANCELLED</span>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Date: {app.appointmentDate}</div>
                          </td>
                          <td style={{ padding: '20px 25px' }}>
                            <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{usersData[app.patientId]?.fullName || "Unknown"}</div>
                            <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold', marginTop: '5px' }}>Reason: {app.cancelReason}</div>
                          </td>
                          <td style={{ padding: '20px 25px' }}>
                            <button onClick={() => update(ref(database, `appointments/${app.id}`), { adminAcknowledgedCancel: true })} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Dismiss Alert</button>
                          </td>
                        </tr>
                      ) : (
                        <tr id={`row-${app.id}`} key={app.id} style={{ borderBottom: '1px solid #f1f5f9', background: highlightedAppId === app.id ? '#dcfce7' : (app.isSkipped ? '#fef2f2' : 'white'), transition: 'background-color 0.5s ease' }}>
                          <td style={{ padding: '20px 25px' }}>
                            <strong style={{ color: app.isSkipped ? '#ef4444' : '#0bc25c', fontSize: '20px', display: 'block' }}>{app.queueNumber}</strong>
                            {app.isSkipped && <span style={{ background: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>SKIPPED</span>}
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Date: {app.appointmentDate}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Requested: {formatTimeToAMPM(app.preferredTime)}</div>
                          </td>
                          <td style={{ padding: '20px 25px' }}>
                            <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{usersData[app.patientId]?.fullName || "Unknown"}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{app.serviceType}</div>
                            {app.notes && <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>Reason: {app.notes}</div>}
                            <button onClick={() => openPatientProfile(app.patientId)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '0', marginTop: '6px', fontWeight: 'bold' }}><FaEye /> View Profile</button>
                          </td>
                          <td style={{ padding: '20px 25px' }}>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              {app.isSkipped ? (
                                <button onClick={() => recallPatient(app.id, app.queueNumber)} style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}><FaUndo /> Return</button>
                              ) : (
                                <>
                                  <button onClick={() => openTimeModal(app.id, app.patientId, app.queueNumber)} style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}><FaClock /> Time</button>
                                  <button onClick={() => callPatient(app.queueNumber, app.patientId)} style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}><FaBullhorn /> Call</button>
                                  <button onClick={() => skipPatient(app.id, app.patientId, app.queueNumber)} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}><FaStepForward /> Skip</button>
                                </>
                              )}
                              <button onClick={() => markCompleted(app.id)} style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}><FaCheckCircle /> Done</button>
                            </div>
                          </td>
                        </tr>
                      )
                    ))
                  }
                </tbody>
              </table>
            </div>
          </>
        )}
        {activeTab === 'vitals' && (
          <div className="dash-card" style={{ padding: '0', overflow: 'hidden' }}>
             <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}><h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Registered Patients Vitals</h3></div>
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead><tr style={{ background: '#ffffff', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: '15px 25px' }}>Patient Name</th><th style={{ padding: '15px 25px' }}>Last Updated</th><th style={{ padding: '15px 25px' }}>Action</th></tr></thead>
                <tbody>
                  {patientList.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                      <td style={{ padding: '20px 25px' }}><strong style={{ color: '#1e293b', display: 'block', fontSize: '15px' }}>{user.fullName}</strong></td>
                      <td style={{ padding: '20px 25px' }}>{user.healthMetrics?.lastUpdated ? <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '14px' }}>{user.healthMetrics.lastUpdated}</span> : <span style={{ color: '#94a3b8', fontSize: '13px' }}>No records yet</span>}</td>
                      <td style={{ padding: '20px 25px' }}><button onClick={() => openVitalsModal(user.id, user.fullName)} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '8px 15px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><FaHeartbeat /> Update Vitals</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        )}
        {activeTab === 'inventory' && (
          <div className="dash-card" style={{ padding: '0', overflow: 'hidden' }}>
             <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}><h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Health Center Supplies</h3></div>
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
                          <button onClick={() => { setStockUpdate({ id: item.id, itemName: item.itemName, currentStock: item.stock, amount: '', type: 'add' }); setShowStockModal(true); }} style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', width: '35px', height: '35px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Add Stock"><FaPlus /></button>
                          <button onClick={() => { setStockUpdate({ id: item.id, itemName: item.itemName, currentStock: item.stock, amount: '', type: 'deduct' }); setShowStockModal(true); }} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', width: '35px', height: '35px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Deduct Stock"><FaMinus /></button>
                          <button onClick={() => { setInventoryItem(item); setShowInventoryModal(true); }} style={{ background: 'white', color: '#64748b', border: '1px solid #cbd5e1', padding: '0 15px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => deleteInventoryItem(item.id, item.itemName)} style={{ background: 'white', color: '#ef4444', border: '1px solid #fecaca', width: '35px', height: '35px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Delete Item"><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        )}
        {activeTab === 'records' && (
          <div className="dash-card" style={{ padding: '0', overflow: 'hidden' }}>
             <div style={{ padding: '20px 25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Clinic History Log</h3>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FaFilter color="#94a3b8" /><select value={recordFilter} onChange={(e) => setRecordFilter(e.target.value)} className="modern-input" style={{ padding: '8px 12px', background: 'white' }}><option value="All">All Services</option><option value="Non-Senior/Non-PWD">Non-Senior / Non-PWD</option><option value="Senior Citizen">Senior Citizen</option><option value="Pregnant">Pregnant</option><option value="PWD">PWD</option></select></div>
             </div>
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead><tr style={{ background: '#ffffff', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: '15px 25px' }}>Date & Time Booked</th><th style={{ padding: '15px 25px' }}>Patient Details</th><th style={{ padding: '15px 25px' }}>Service & Reason</th><th style={{ padding: '15px 25px' }}>Status</th></tr></thead>
                <tbody>
                  {filteredRecords.length === 0 ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No records found.</td></tr> : filteredRecords.map((app) => (
                    <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                      <td style={{ padding: '20px 25px' }}><div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{app.appointmentDate}</div><div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Time: {formatTimeBooked(app.createdAt)}</div></td>
                      <td style={{ padding: '20px 25px' }}><strong style={{ color: '#1e293b', display: 'block', fontSize: '14px' }}>{usersData[app.patientId]?.fullName || "Unknown"}</strong><div style={{ fontSize: '12px', color: '#64748b', margin: '4px 0' }}>Queue: {app.queueNumber}</div><button onClick={() => openPatientProfile(app.patientId)} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '0', fontWeight: 'bold' }}><FaEye /> View Info</button></td>
                      <td style={{ padding: '20px 25px' }}><div style={{ fontWeight: '700', fontSize: '14px', color: '#334155' }}>{app.serviceType}</div>{app.notes && <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>Reason: {app.notes}</div>}</td>
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
            <div className="dash-card" style={{ padding: '0', overflow: 'hidden' }}>
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
                                  <div style={{ display: 'inline-block', background: '#f0fdf4', color: '#0bc25c', fontSize: '10px', padding: '4px 10px', borderRadius: '15px', fontWeight: 'bold', marginBottom: '15px' }}>{app.serviceType} | {app.appointmentDate}</div>
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
            <div className="print-header" style={{ display: 'none', textAlign: 'center', marginBottom: '30px' }}><h2>Old Cabalan Health Center</h2><p>MediQueue System Analytics Report</p><p>Generated on: {new Date().toLocaleDateString()}</p><hr /></div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div className="dash-card" style={{ flex: 2, minWidth: '400px' }}><h3 style={{ color: '#1e293b', marginBottom: '25px', fontSize: '18px' }}>Appointments Per Category</h3><ResponsiveContainer width="100%" height={300}><BarChart data={processServiceData()} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{fontSize: 12}} /><YAxis allowDecimals={false} /><ChartTooltip cursor={{fill: '#f8fafc'}} /><Legend /><Bar dataKey="total" name="Total Patients" fill="#0bc25c" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
              <div className="dash-card" style={{ flex: 1, minWidth: '300px' }}><h3 style={{ color: '#1e293b', marginBottom: '25px', textAlign: 'center', fontSize: '18px' }}>Appointment Status</h3><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={processStatusData()} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>{processStatusData().map((entry, index) => <Cell key={`cell-${index}`} fill={['#f59e0b', '#10b981'][index % 2]} />)}</Pie><ChartTooltip /><Legend /></PieChart></ResponsiveContainer></div>
            </div>
            <div className="dash-card" style={{ width: '100%' }}>
              <h3 style={{ color: '#1e293b', marginBottom: '5px', fontSize: '18px' }}>Disease Hotspot / Patient Density</h3><p style={{ color: '#64748b', fontSize: '13px', marginBottom: '25px' }}>Number of patients/cases clustered by Purok.</p>
              <ResponsiveContainer width="100%" height={300}><BarChart data={processPurokData()} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="purok" tick={{fontSize: 12}} /><YAxis allowDecimals={false} /><ChartTooltip cursor={{fill: '#fef2f2'}} /><Legend /><Bar dataKey="cases" name="Total Cases / Appointments" fill="#ef4444" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
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
              <h3 style={{ color: '#3b82f6', margin: '0 0 15px 0', fontSize: '18px'
                
               }}>System Actions</h3>
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