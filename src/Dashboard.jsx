  import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, database } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue, query, orderByChild, equalTo, update, push } from 'firebase/database';
import { 
  FaBell, FaSignOutAlt, FaUser, FaRegCalendarAlt, FaFileAlt, 
  FaCapsules, FaClipboardList, FaStethoscope, FaHeartbeat, 
  FaRegListAlt, FaHeart, FaMapMarkerAlt, FaLightbulb, FaChevronRight,
  FaTimesCircle, FaCheckCircle, FaInfoCircle, FaExclamationTriangle, FaChartLine, FaTimes,
  FaArrowLeft, FaCamera, FaIdBadge, FaEnvelope, FaPhoneAlt, FaHome, FaStar, FaHistory, FaClock, FaBullhorn
} from 'react-icons/fa';
import BookingModal from './BookingModal';
import Prescriptions from './Prescriptions';
import Records from './Records';
import AvailableTimes from './AvailableTimes';

function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [currentServing, setCurrentServing] = useState("None");
  const [showBooking, setShowBooking] = useState(false);
  const [myTicket, setMyTicket] = useState("None");
  const [assignedTime, setAssignedTime] = useState(null); 
  const [activeApptId, setActiveApptId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [myAppointments, setMyAppointments] = useState([]); 
  const [myNotifications, setMyNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUploading, setIsUploading] = useState(false); 
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  
  const [showCallPopup, setShowCallPopup] = useState(false);
  const [feedbackAppt, setFeedbackAppt] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [systemSettings, setSystemSettings] = useState({ status: 'Open', closedReason: '' });

  const [alertBox, setAlertBox] = useState({ show: false, message: '', type: 'info' });
  const [confirmBox, setConfirmBox] = useState({ show: false, message: '', onConfirm: null });
  const navigate = useNavigate();

  const showAlert = (message, type = 'info') => setAlertBox({ show: true, message, type });
  const showConfirm = (message, onConfirm) => setConfirmBox({ show: true, message, onConfirm });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        onValue(ref(database, 'users/' + user.uid), (snapshot) => setUserData({ id: user.uid, ...snapshot.val() }));
        onValue(ref(database, 'liveQueue/current'), (snapshot) => { if (snapshot.exists()) setCurrentServing(snapshot.val()); });
        onValue(ref(database, 'settings'), (snapshot) => { if (snapshot.exists()) setSystemSettings(snapshot.val()); });

        const appointmentsRef = query(ref(database, 'appointments'), orderByChild('patientId'), equalTo(user.uid));
        onValue(appointmentsRef, (snapshot) => {
          if (snapshot.exists()) {
            const list = Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })).reverse();
            setMyAppointments(list);
            const pendingList = list.filter(app => app.status === 'pending');
            if (pendingList.length > 0) {
              setMyTicket(pendingList[0].queueNumber);
              setAssignedTime(pendingList[0].assignedTime || null);
              setActiveApptId(pendingList[0].id); 
            } else { setMyTicket("None"); setAssignedTime(null); setActiveApptId(null); }
          } else { setMyAppointments([]); setMyTicket("None"); setAssignedTime(null); setActiveApptId(null); }
        });

        onValue(ref(database, `notifications/${user.uid}`), (snapshot) => {
          if (snapshot.exists()) setMyNotifications(Object.keys(snapshot.val()).map(key => ({ id: key, ...snapshot.val()[key] })).reverse());
          else setMyNotifications([]);
        });
      } else navigate('/');
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (myTicket !== "None" && currentServing === myTicket) {
      setShowCallPopup(true);
    }
  }, [currentServing, myTicket]);

  useEffect(() => {
    if (myAppointments.length > 0) {
      const unrated = myAppointments.find(app => app.status === 'completed' && !app.feedbackSubmitted);
      if (unrated && !feedbackAppt) setFeedbackAppt(unrated);
    }
  }, [myAppointments, feedbackAppt]);

  const analyzeBP = (bpStr) => {
      if(!bpStr) return null;
      const [sys, dia] = bpStr.split('/').map(Number);
      if(!sys || !dia) return { label: "Invalid Format", color: "#94a3b8" };
      if(sys < 90 && dia < 60) return { label: "Low Blood", color: "#3b82f6" };
      if(sys <= 120 && dia <= 80) return { label: "Normal", color: "#16a34a" };
      if(sys <= 129 && dia < 80) return { label: "Elevated", color: "#f59e0b" };
      return { label: "High Blood", color: "#ef4444" };
  };

  const computeBMI = (weight, heightCm) => {
      if(!weight || !heightCm) return null;
      const heightM = heightCm / 100;
      const bmi = (weight / (heightM * heightM)).toFixed(1);
      if(bmi < 18.5) return { val: bmi, label: "Underweight", color: "#3b82f6" };
      if(bmi < 24.9) return { val: bmi, label: "Normal", color: "#16a34a" };
      if(bmi < 29.9) return { val: bmi, label: "Overweight", color: "#f59e0b" };
      return { val: bmi, label: "Obese", color: "#ef4444" };
  };

  const bpStatus = userData?.healthMetrics?.bp ? analyzeBP(userData.healthMetrics.bp) : null;
  const bmiStatus = computeBMI(userData?.healthMetrics?.weight, userData?.healthMetrics?.height);

  const handleLogout = () => signOut(auth).then(() => navigate('/'));

  const handleCancelAppointment = () => {
    if (!cancelReason) return showAlert("Select a reason.", "error");
    const finalReason = cancelReason === 'Others' ? otherReason : cancelReason;
    
    const targetAppt = myAppointments.find(a => a.id === activeApptId);

    update(ref(database, `appointments/${activeApptId}`), { 
      status: 'cancelled', 
      cancelReason: finalReason,
      adminAcknowledgedCancel: false 
    }).then(() => { 
      if(targetAppt) {
        push(ref(database, `notifications/admin`), {
          title: "Appointment Cancelled",
          message: `Queue ${targetAppt.queueNumber} was cancelled by the patient. Reason: ${finalReason}`,
          date: targetAppt.appointmentDate,
          appId: activeApptId,
          timestamp: new Date().toLocaleString()
        });
      }
      setShowCancelModal(false); 
      showAlert("Appointment cancelled successfully.", "success"); 
    });
  };

  const handleBookClick = () => {
    if (systemSettings.status === 'Closed') return showAlert(`Suspended. Reason: ${systemSettings.closedReason}`, "error");
    if (myTicket === "None") setShowBooking(true);
    else showAlert("Active appointment exists.", "error");
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1048576) return showAlert("Image is too large! Please choose an image smaller than 1MB.", "error");
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        update(ref(database, 'users/' + userData.id), { profilePicture: reader.result })
        .then(() => { showAlert("Profile picture updated!", "success"); setIsUploading(false); })
        .catch(err => { showAlert(err.message, "error"); setIsUploading(false); });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitFeedback = (skipped = false) => {
    if (!skipped && rating === 0) return showAlert("Select star rating.", "error");
    update(ref(database, `appointments/${feedbackAppt.id}`), { feedbackSubmitted: true, rating: skipped ? 0 : rating, feedbackComment: skipped ? "" : feedbackText })
    .then(() => { setFeedbackAppt(null); setRating(0); setFeedbackText(''); if(!skipped) showAlert("Feedback successfully updated in the system!", "success"); });
  };

  return (
    <div className="dash-wrapper">
      {/* ALERTS */}
      {alertBox.show && ( <div className="modal-overlay hide-on-print"><div className="modern-register-card" style={{ maxWidth: '350px', textAlign: 'center', padding: '30px', background: '#ffffff' }}><div style={{ fontSize: '50px', marginBottom: '15px', color: alertBox.type === 'success' ? '#10b981' : '#ef4444' }}>{alertBox.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}</div><h3 style={{ color: '#1e293b', marginBottom: '10px' }}>{alertBox.message}</h3><button onClick={() => setAlertBox({ show: false, message: '', type: 'info' })} className="btn-green-full" style={{ margin: 0 }}>OK</button></div></div> )}
      {confirmBox.show && ( <div className="modal-overlay hide-on-print"><div className="modern-register-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px', background: '#ffffff' }}><div style={{ fontSize: '50px', color: '#ef4444', marginBottom: '15px' }}><FaExclamationTriangle /></div><h3 style={{ color: '#1e293b', marginBottom: '10px' }}>{confirmBox.message}</h3><div style={{ display: 'flex', gap: '10px' }}><button onClick={() => setConfirmBox({ show: false, message: '', onConfirm: null })} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Go Back</button><button onClick={() => { confirmBox.onConfirm(); setConfirmBox({ show: false, message: '', onConfirm: null }); }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Yes, Cancel it</button></div></div></div> )}

      {/* CALL POP-UP MODAL */}
      {showCallPopup && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modern-register-card" style={{ maxWidth: '450px', textAlign: 'center', padding: '40px', background: '#ffffff', border: '4px solid #10b981' }}>
            <div style={{ fontSize: '60px', marginBottom: '15px', color: '#10b981', animation: 'pulse 1.5s infinite' }}>
              <FaBullhorn />
            </div>
            <h1 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '28px', fontWeight: '900' }}>IT'S YOUR TURN!</h1>
            <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>
              Please proceed to the doctor's office immediately.
            </p>
            <div style={{ fontSize: '50px', fontWeight: '900', color: '#0bc25c', marginBottom: '30px' }}>
              {myTicket}
            </div>
            <button onClick={() => setShowCallPopup(false)} className="btn-green-full" style={{ margin: 0, fontSize: '16px', padding: '15px' }}>I'm on my way</button>
          </div>
        </div>
      )}

      {feedbackAppt && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modern-register-card" style={{ maxWidth: '400px', padding: '30px', textAlign: 'center' }}>
            <div style={{ background: '#fffbeb', color: '#f59e0b', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', margin: '0 auto 15px auto' }}><FaStar /></div>
            <h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '22px', fontWeight: '800' }}>Rate Your Experience</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Your appointment for <strong>{feedbackAppt.serviceType}</strong> is complete! How was our service?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>{[1, 2, 3, 4, 5].map(star => <FaStar key={star} size={35} color={(hoverRating || rating) >= star ? '#f59e0b' : '#e2e8f0'} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(star)} style={{ cursor: 'pointer', transition: '0.2s' }} />)}</div>
            <div className="modern-group" style={{ marginBottom: '20px', textAlign: 'left' }}><textarea className="modern-input" placeholder="Comments (Optional)" rows="3" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} style={{ resize: 'none', padding: '15px' }}></textarea></div>
            <div style={{ display: 'flex', gap: '10px' }}><button onClick={() => handleSubmitFeedback(true)} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Skip / Close</button><button onClick={() => handleSubmitFeedback(false)} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: 'none', background: '#0bc25c', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Save Rating</button></div>
          </div>
        </div>
      )}

      {showBooking && <BookingModal onClose={() => setShowBooking(false)} userData={userData} />}
      
      {showCancelModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modern-register-card" style={{ maxWidth: '450px', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowCancelModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}><FaTimes /></button>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}><div style={{ background: '#fef2f2', color: '#ef4444', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', margin: '0 auto 15px auto', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)' }}><FaTimesCircle /></div><h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '22px', fontWeight: '800' }}>Cancel Appointment</h2><p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>You are about to cancel Queue Number: <strong style={{color: '#ef4444'}}>{myTicket}</strong></p></div>
            <div className="form-content"><div className="modern-group" style={{ marginBottom: '15px' }}><label style={{ color: '#475569', fontSize: '12px', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>REASON FOR CANCELLATION</label><select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="modern-input" required><option value="" disabled>Select a reason...</option><option value="Wrong details entered">Entered wrong details</option><option value="Conflict of schedule">Unexpected schedule conflict</option><option value="Feeling better">Feeling better / Recovered</option><option value="Others">Others (Please specify)</option></select></div>{cancelReason === 'Others' && (<div className="modern-group" style={{ marginBottom: '15px' }}><input type="text" placeholder="Type your specific reason here..." value={otherReason} onChange={(e) => setOtherReason(e.target.value)} className="modern-input" required /></div>)}<div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}><button onClick={() => setShowCancelModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>Keep Ticket</button><button onClick={handleCancelAppointment} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' }}>Confirm Cancel</button></div></div>
          </div>
        </div>
      )}

      <nav className="dash-nav">
        <div className="dash-nav-left" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
          <div className="dash-logo-box"><img src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" alt="Logo" style={{ width: '28px' }} /></div>
          <div><h2>Old Cabalan Health App</h2><p>Your Health, Our Priority</p></div>
        </div>
        <div className="dash-nav-right">
          <div style={{ position: 'relative' }}>
            <button className="dash-icon-btn" onClick={() => setShowNotifDropdown(!showNotifDropdown)}><FaBell />{myNotifications.length > 0 && <span className="dash-badge">{myNotifications.length}</span>}</button>
            {showNotifDropdown && (
              <div style={{ position: 'absolute', top: '45px', right: '0', background: 'white', width: '320px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 1000, overflow: 'hidden' }}>
                <div style={{ padding: '15px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h4 style={{ margin: 0, color: '#1e293b', fontSize: '14px' }}>Notifications</h4><span onClick={() => setShowNotifDropdown(false)} style={{ fontSize: '11px', color: '#64748b', cursor: 'pointer', fontWeight: 'bold' }}><FaTimes /> Close</span></div>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {myNotifications.length === 0 ? <p style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No new notifications.</p> : 
                    myNotifications.map((notif) => (
                      <div key={notif.id} onClick={() => {setShowNotifDropdown(false); setActiveTab('history');}} style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
                        <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '10px', borderRadius: '50%', fontSize: '14px' }}><FaBell /></div>
                        <div><h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#1e293b' }}>{notif.title}</h4><p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{notif.message}</p><span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>{notif.timestamp}</span></div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
          <div className="dash-user-pill" onClick={() => setActiveTab('profile')} style={{ cursor: 'pointer' }}><FaUser /> {userData ? userData.fullName.split(' ')[0] : "Resident"}</div>
          <div className="dash-user-pill" onClick={handleLogout} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}><FaSignOutAlt /></div>
        </div>
      </nav>

      <div className="dash-container">
        {activeTab === 'profile' ? (
           <div className="dash-card" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
             <button onClick={() => setActiveTab('dashboard')} style={{ background: 'transparent', border: 'none', fontSize: '15px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '30px', fontWeight: 'bold' }}><FaArrowLeft /> Back to Dashboard</button>
             {userData && (
               <div style={{ display: 'flex', gap: '50px', flexWrap: 'wrap' }}>
                 <div style={{ textAlign: 'center', minWidth: '180px', margin: '0 auto' }}>
                   <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 15px auto' }}>
                     {userData.profilePicture ? <img src={userData.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f0fdf4', boxShadow: '0 4px 15px rgba(11, 194, 92, 0.2)' }} /> : <div style={{ background: '#f8fafc', width: '100%', height: '100%', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '50px', color: '#cbd5e1', border: '4px solid white', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}><FaIdBadge /></div>}
                     <label style={{ position: 'absolute', bottom: '5px', right: '5px', background: '#0bc25c', color: 'white', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '3px solid white', transition: '0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                       <FaCamera /><input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePicChange} disabled={isUploading} />
                     </label>
                   </div>
                   <h3 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '20px' }}>{userData.fullName}</h3>
                   <span style={{ background: '#f0fdf4', color: '#0bc25c', padding: '4px 15px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #bbf7d0', display: 'inline-block' }}>Resident Account</span>
                   <button onClick={() => setActiveTab('history')} style={{ marginTop: '20px', width: '100%', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display:'flex', justifyContent:'center', alignItems:'center', gap:'8px' }}><FaHistory /> View Medical History</button>
                 </div>
                 <div style={{ flex: 1, minWidth: '250px' }}>
                   <h3 style={{ color: '#1e293b', fontSize: '18px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px' }}>Personal Information</h3>
                   <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#334155' }}><strong>Email:</strong> {userData.email}</p>
                   <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#334155' }}><strong>Contact:</strong> {userData.contact}</p>
                   <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#334155' }}><strong>Purok:</strong> {userData.purok}</p>
                   <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#334155' }}><strong>Address:</strong> {userData.address}</p>
                 </div>
               </div>
             )}
           </div>
        ) : activeTab === 'prescriptions' ? (
           <Prescriptions onBack={() => setActiveTab('dashboard')} />
        ) : activeTab === 'history' ? (
           <Records onBack={() => setActiveTab('dashboard')} userData={userData} appointments={myAppointments} onRate={(app) => {setFeedbackAppt(app); setRating(app.rating || 0); setFeedbackText(app.feedbackComment || '');}} />
        ) : activeTab === 'availableTimes' ? (
           <AvailableTimes onBack={() => setActiveTab('dashboard')} clinicStatus={systemSettings.status} closedReason={systemSettings.closedReason} />
        ) : (
           <>
             {systemSettings.status === 'Closed' && (
               <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '15px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                 <FaExclamationTriangle style={{ fontSize: '24px', color: '#ef4444' }} />
                 <div><h4 style={{ margin: 0, color: '#ef4444', fontSize: '15px' }}>CLINIC IS CURRENTLY CLOSED</h4><p style={{ margin: 0, color: '#b91c1c', fontSize: '13px' }}>{systemSettings.closedReason || 'No appointments are being accepted at this time.'}</p></div>
               </div>
             )}

             <div className="dash-hero">
               <FaStethoscope style={{ position: 'absolute', right: '-20px', top: '10px', fontSize: '150px', opacity: '0.1' }} />
               <h1>Welcome back, {userData ? userData.fullName.split(' ')[0] : "Resident"}! 👋</h1>
               <p>Book your appointment and get your queue number</p>
             </div>

             <div className="dash-quick-actions">
               <div className="dash-action-card" onClick={handleBookClick} style={{ opacity: myTicket !== "None" || systemSettings.status === 'Closed' ? 0.6 : 1, cursor: myTicket !== "None" || systemSettings.status === 'Closed' ? 'not-allowed' : 'pointer' }}>
                 <div className="dash-icon-wrapper" style={{ background: '#10b981' }}><FaRegCalendarAlt /></div><span>Book Appointment</span>
               </div>
               <div className="dash-action-card" onClick={() => setActiveTab('history')}>
                 <div className="dash-icon-wrapper" style={{ background: '#3b82f6' }}><FaHistory /></div><span>View History</span>
               </div>
               <div className="dash-action-card" onClick={() => setActiveTab('prescriptions')}>
                 <div className="dash-icon-wrapper" style={{ background: '#a855f7' }}><FaCapsules /></div><span>Prescriptions</span>
               </div>
               <div className="dash-action-card" onClick={() => setActiveTab('availableTimes')}>
                 <div className="dash-icon-wrapper" style={{ background: '#f97316' }}><FaClock /></div><span>Available Slots</span>
               </div>
             </div>

             <div className="dash-grid">
               <div className="dash-left">
                 <div className="dash-card">
                   <div className="dash-card-header"><div className="dash-card-icon"><FaStethoscope /></div><div><h3 className="dash-card-title">Live Queue Status</h3><p className="dash-card-subtitle">Current consultation progress</p></div></div>
                   <div className="doctor-avail-box">
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}><div style={{ background: '#0bc25c', color: 'white', padding: '12px', borderRadius: '50%' }}><FaUser /></div><div><h4 style={{ margin: 0, color: '#1e293b', fontSize: '15px', fontWeight: '800' }}>Now Serving</h4><p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Current Queue Number</p></div></div>
                       <span style={{ fontSize: '30px', color: '#10b981', fontWeight: '900' }}>{currentServing}</span>
                     </div>
                     <hr style={{ border: 'none', borderTop: '1px dashed #bbf7d0', margin: '20px 0' }} />
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div><h4 style={{ margin: 0, color: '#1e293b', fontSize: '15px', fontWeight: '800' }}>My Ticket</h4><p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>{assignedTime ? `Schedule: ${assignedTime}` : 'Pending'}</p></div>
                       <span style={{ fontSize: '24px', color: '#3b82f6', fontWeight: '900' }}>{myTicket}</span>
                     </div>
                     {myTicket !== "None" && (<button onClick={() => setShowCancelModal(true)} style={{ width: '100%', padding: '15px', borderRadius: '12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '20px' }}><FaTimesCircle style={{ fontSize: '18px' }} /> Cancel My Ticket</button>)}
                   </div>
                 </div>

                 <div className="dash-card">
                   <div className="dash-card-header"><div className="dash-card-icon" style={{ color: '#3b82f6', background: '#eff6ff' }}><FaBell /></div><div><h3 className="dash-card-title">Recent Updates</h3><p className="dash-card-subtitle">Your latest notifications</p></div></div>
                   {myNotifications.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', padding: '20px 0' }}>No new updates available.</p> : myNotifications.slice(0, 3).map((notif) => (<div key={notif.id} className="activity-item"><div className="activity-icon"><FaRegListAlt /></div><div style={{ flex: 1 }}><h4 style={{ margin: 0, color: '#1e293b', fontSize: '14px', fontWeight: '700' }}>{notif.title}</h4><p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>{notif.message}</p><span style={{ fontSize: '11px', color: '#94a3b8' }}>{notif.timestamp}</span></div><FaChevronRight style={{ color: '#cbd5e1' }} /></div>))}
                 </div>
               </div>

               <div className="dash-right">
                 <div className="dash-card">
                   <div className="dash-card-header"><div className="dash-card-icon" style={{ color: '#ef4444', background: '#fef2f2' }}><FaHeart /></div><div><h3 className="dash-card-title">Health Metrics</h3><p className="dash-card-subtitle">Latest readings</p></div></div>
                   
                   <div className="metric-row">
                     <div className="metric-info">
                       <FaUser style={{ color: '#f59e0b', fontSize: '18px' }} />
                       <div>
                         <h4>Height / Weight</h4>
                         <h2>{userData?.healthMetrics?.height ? `${userData.healthMetrics.height} cm` : '--'} / {userData?.healthMetrics?.weight ? `${userData.healthMetrics.weight} kg` : '--'}</h2>
                       </div>
                     </div>
                   </div>

                   <div className="metric-row"><div className="metric-info"><FaHeart style={{ color: '#10b981', fontSize: '18px' }} /><div><h4>Blood Pressure</h4><h2>{userData?.healthMetrics?.bp || 'TBA'}</h2></div></div>{bpStatus ? <span style={{ background: '#f1f5f9', color: bpStatus.color, padding: '4px 10px', borderRadius: '15px', fontSize: '10px', fontWeight: 'bold' }}>{bpStatus.label}</span> : <span className="metric-badge">PENDING</span>}</div>
                   
                   <div className="metric-row"><div className="metric-info"><FaHeartbeat style={{ color: '#3b82f6', fontSize: '18px' }} /><div><h4>Heart Rate</h4><h2>{userData?.healthMetrics?.hr ? `${userData.healthMetrics.hr} bpm` : 'TBA'}</h2></div></div></div>
                   
                   <div className="metric-row"><div className="metric-info"><FaChartLine style={{ color: '#a855f7', fontSize: '18px' }} /><div><h4>BMI (Body Mass Index)</h4><h2>{bmiStatus ? bmiStatus.val : 'TBA'}</h2></div></div>{bmiStatus ? <span style={{ background: '#f1f5f9', color: bmiStatus.color, padding: '4px 10px', borderRadius: '15px', fontSize: '10px', fontWeight: 'bold' }}>{bmiStatus.label}</span> : <span className="metric-badge">PENDING</span>}</div>
                 </div>

                 <div className="info-card-green">
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}><FaMapMarkerAlt style={{ fontSize: '20px' }} /><h3 style={{ margin: 0, fontSize: '16px' }}>Old Cabalan Health Center</h3></div>
                   <button onClick={() => window.open('https://maps.app.goo.gl/Zt2ABJNtpDLn7HodA', '_blank')} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', color: '#0bc25c', background: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}><FaMapMarkerAlt /> Get Directions</button>
                 </div>
               </div>
             </div>
           </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;