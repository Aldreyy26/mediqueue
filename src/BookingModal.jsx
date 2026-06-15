import React, { useState, useEffect } from 'react';
import { FaTimes, FaCalendarAlt, FaClock, FaStethoscope, FaNotesMedical } from 'react-icons/fa';
import { ref, push, set, get, onValue } from 'firebase/database';
import { auth, database } from './firebase';

function BookingModal({ onClose, userData }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clinicStatus, setClinicStatus] = useState('Open');

  useEffect(() => {
    const settingsRef = ref(database, 'settings');
    onValue(settingsRef, (snapshot) => {
      if (snapshot.exists() && snapshot.val().status === 'Closed') {
        setClinicStatus('Closed');
      }
    });
  }, []);

  const formatTimeForNotif = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(':');
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (clinicStatus === 'Closed') {
      alert("Cannot book. Clinic is currently closed.");
      return;
    }
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Please login first.");
        return;
      }

      const apptRef = ref(database, 'appointments');
      const snapshot = await get(apptRef);
      let count = 1;

      if (snapshot.exists()) {
        const allAppts = Object.values(snapshot.val());
        const todayAppts = allAppts.filter(a => a.appointmentDate === date);
        count = todayAppts.length + 1;
      }

      const prefix = serviceType.includes('Senior') || serviceType.includes('PWD') || serviceType.includes('Pregnant') ? 'P-' : 'Q-';
      const queueNumber = `${prefix}${String(count).padStart(3, '0')}`;

      // BAGO: Gumawa ng reference muna para makuha yung ID bago i-save
      const newApptRef = push(ref(database, 'appointments'));
      const newApptId = newApptRef.key;

      await set(newApptRef, {
        patientId: user.uid,
        appointmentDate: date,
        preferredTime: time,
        serviceType: serviceType,
        notes: symptoms,
        queueNumber: queueNumber,
        status: 'pending',
        isSkipped: false,
        createdAt: new Date().toISOString()
      });
      
      const patientName = userData ? userData.fullName : "A resident";
      const formattedTime = formatTimeForNotif(time);
      
      // BAGO: Sinave ang appId at date sa loob ng notification
      push(ref(database, `notifications/admin`), {
         title: "New Appointment Booked",
         message: `${patientName} booked Queue ${queueNumber} for ${date} at ${formattedTime}.`,
         date: date,
         appId: newApptId, 
         timestamp: new Date().toLocaleString()
      });

      alert(`Appointment Booked! Your Queue Number is ${queueNumber}`);
      onClose();
    } catch (error) {
      alert("Booking Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modern-register-card" style={{ maxWidth: '500px', overflow: 'visible' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', zIndex: 10 }}>
          <FaTimes />
        </button>
        <div style={{ padding: '35px 30px 20px 30px', textAlign: 'center' }}>
          <div style={{ background: '#0bc25c', color: 'white', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', margin: '0 auto 15px auto', boxShadow: '0 4px 10px rgba(11, 194, 92, 0.3)' }}>
            <FaCalendarAlt />
          </div>
          <h2 style={{ color: '#1e293b', margin: '0 0 5px 0', fontSize: '22px', fontWeight: '800' }}>Book an Appointment</h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Old Cabalan Health Center</p>
        </div>
        <form onSubmit={handleBook} style={{ padding: '0 30px 30px 30px' }}>

          <div className="modern-group" style={{ marginBottom: '15px' }}>
            <label style={{ color: '#0bc25c' }}><FaCalendarAlt /> Appointment Date <span>*</span></label>
            <input type="date" className="modern-input" value={date} onChange={(e) => setDate(e.target.value)} min={today} required />
          </div>
          
          <div className="modern-group" style={{ marginBottom: '15px' }}>
            <label style={{ color: '#0bc25c' }}><FaClock /> Preferred Time <span>*</span></label>
            <input type="time" className="modern-input" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
          
          <div className="modern-group" style={{ marginBottom: '15px' }}>
            <label style={{ color: '#0bc25c' }}><FaStethoscope /> Patient Category <span>*</span></label>
            <select className="modern-input" value={serviceType} onChange={(e) => setServiceType(e.target.value)} required>
              <option value="" disabled>Select category...</option>
              <option value="Non-Senior/Non-PWD">Non-Senior / Non-PWD</option>
              <option value="Senior Citizen">Senior Citizen</option>
              <option value="Pregnant">Pregnant</option>
              <option value="PWD">PWD (Person with Disability)</option>
            </select>
          </div>
          
          <div className="modern-group" style={{ marginBottom: '25px' }}>
            <label style={{ color: '#0bc25c' }}><FaNotesMedical /> Reason for Visit (Optional)</label>
            <input type="text" className="modern-input" placeholder="E.g., Fever, Cough, Checkup..." value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
          </div>
          
          <button type="submit" className="modern-submit-btn" style={{ background: '#0bc25c', boxShadow: '0 4px 15px rgba(11, 194, 92, 0.3)' }} disabled={isLoading}>
            {isLoading ? 'Booking...' : 'Confirm Appointment'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default BookingModal;