import React, { useState, useEffect } from 'react';
import { FaTimes, FaCalendarAlt, FaClock, FaStethoscope, FaNotesMedical, FaUserMd, FaUsers } from 'react-icons/fa';
import { ref, push, set, get, onValue } from 'firebase/database';
import { auth, database } from './firebase';

function BookingModal({ onClose, userData }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('08:30');
  const [healthService, setHealthService] = useState('General Consultation');
  const [serviceType, setServiceType] = useState('Non-Senior/Non-PWD');
  const [symptoms, setSymptoms] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clinicStatus, setClinicStatus] = useState('Open');
  const [allAppts, setAllAppts] = useState([]);

  // DOCTOR, MIDWIFE & DENTIST SHIFT SCHEDULES
  const serviceShifts = {
    'General Consultation': { staff: 'Dr. Roberto Santos (Medical Officer)', shift: 'Morning & Afternoon (8:00 AM - 4:00 PM)', maxSlots: 25, estMinsPerPatient: 12 },
    'Maternal & Child Care (Prenatal/Postnatal)': { staff: 'Midwife Elena Cruz, RM', shift: 'Morning Shift (8:00 AM - 12:00 PM)', maxSlots: 15, estMinsPerPatient: 15 },
    'Immunization / Vaccination': { staff: 'Nurse Mark Gomez, RN & BHW Team', shift: 'Wednesday & Friday (8:00 AM - 3:00 PM)', maxSlots: 20, estMinsPerPatient: 8 },
    'Senior Citizen & Maintenance Medicine Pickup': { staff: 'BHW Pharmacy & Dr. Roberto Santos', shift: 'Daily Priority Lane (8:00 AM - 4:00 PM)', maxSlots: 30, estMinsPerPatient: 7 },
    'Dental Services': { staff: 'Dr. Liza Reyes (Barangay Dentist)', shift: 'Tue / Thu Morning (8:00 AM - 12:00 PM)', maxSlots: 12, estMinsPerPatient: 20 }
  };

  useEffect(() => {
    const settingsRef = ref(database, 'settings');
    onValue(settingsRef, (snapshot) => {
      if (snapshot.exists() && snapshot.val().status === 'Closed') {
        setClinicStatus('Closed');
      }
    });

    const apptRef = ref(database, 'appointments');
    onValue(apptRef, (snapshot) => {
      if (snapshot.exists()) {
        setAllAppts(Object.values(snapshot.val()));
      } else {
        setAllAppts([]);
      }
    });
  }, []);

  // Calculate live remaining slots for the selected date and service
  const bookedForServiceToday = allAppts.filter(
    a => a.appointmentDate === date && (a.healthService === healthService || a.serviceType === healthService) && a.status !== 'cancelled'
  ).length;
  const currentShiftInfo = serviceShifts[healthService] || serviceShifts['General Consultation'];
  const remainingSlots = Math.max(0, currentShiftInfo.maxSlots - bookedForServiceToday);

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
    if (remainingSlots <= 0) {
      alert("Sorry, all slots for this shift on the selected date are fully booked.");
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
        const list = Object.values(snapshot.val());
        const todayAppts = list.filter(a => a.appointmentDate === date);
        count = todayAppts.length + 1;
      }

      const isPriority = serviceType.includes('Senior') || serviceType.includes('PWD') || serviceType.includes('Pregnant') || healthService.includes('Senior') || healthService.includes('Maternal');
      const prefix = isPriority ? 'P-' : 'Q-';
      const queueNumber = `${prefix}${String(count).padStart(3, '0')}`;

      const newApptRef = push(ref(database, 'appointments'));
      const newApptId = newApptRef.key;

      await set(newApptRef, {
        patientId: user.uid,
        appointmentDate: date,
        preferredTime: time,
        healthService: healthService,
        assignedStaff: currentShiftInfo.staff,
        estDurationMins: currentShiftInfo.estMinsPerPatient,
        serviceType: serviceType,
        notes: symptoms ? `[${healthService}] ${symptoms}` : `[${healthService}] Routine Visit`,
        queueNumber: queueNumber,
        status: 'pending',
        queueStage: 'Waiting', // Para sa Kanban Board ("Waiting", "In Consultation", "Completed", "No Show")
        isSkipped: false,
        createdAt: new Date().toISOString()
      });
      
      const patientName = userData ? userData.fullName : "A resident";
      const formattedTime = formatTimeForNotif(time);
      
      push(ref(database, `notifications/admin`), {
         title: "New Smart Appointment Booked",
         message: `${patientName} booked Queue ${queueNumber} (${healthService}) for ${date} at ${formattedTime}.`,
         date: date,
         appId: newApptId, 
         timestamp: new Date().toLocaleString()
      });

      alert(`Smart Appointment Booked!\n\nService: ${healthService}\nAssigned Duty: ${currentShiftInfo.staff}\nYour Queue Ticket: ${queueNumber}`);
      onClose();
    } catch (error) {
      alert("Booking Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modern-register-card modern-scrollable-card" style={{ maxWidth: '540px' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', zIndex: 10 }}>
          <FaTimes />
        </button>
        <div style={{ padding: '30px 30px 15px 30px', textAlign: 'center' }}>
          <div style={{ background: '#0bc25c', color: 'white', width: '55px', height: '55px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '22px', margin: '0 auto 12px auto', boxShadow: '0 4px 10px rgba(11, 194, 92, 0.3)' }}>
            <FaCalendarAlt />
          </div>
          <h2 style={{ color: '#1e293b', margin: '0 0 4px 0', fontSize: '21px', fontWeight: '800' }}>Smart Appointment Booking</h2>
          <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Real-Time Slot Availability Based on Doctor & Midwife Shifts</p>
        </div>

        <form onSubmit={handleBook} style={{ padding: '0 30px 30px 30px' }}>
          
          {/* 5 SPECIFIC HEALTH CENTER SERVICES */}
          <div className="modern-group" style={{ marginBottom: '15px' }}>
            <label style={{ color: '#0bc25c' }}><FaStethoscope /> Health Center Service <span>*</span></label>
            <select className="modern-input" value={healthService} onChange={(e) => setHealthService(e.target.value)} required>
              <option value="General Consultation">General Consultation</option>
              <option value="Maternal & Child Care (Prenatal/Postnatal)">Maternal & Child Care (Prenatal/Postnatal)</option>
              <option value="Immunization / Vaccination">Immunization / Vaccination</option>
              <option value="Senior Citizen & Maintenance Medicine Pickup">Senior Citizen & Maintenance Medicine Pickup</option>
              <option value="Dental Services">Dental Services</option>
            </select>
          </div>

          {/* REAL-TIME SHIFT & SLOT AVAILABILITY BOX */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 15px', marginBottom: '15px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <strong style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}><FaUserMd /> {currentShiftInfo.staff}</strong>
              <span style={{ background: remainingSlots > 3 ? '#0bc25c' : '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                {remainingSlots} / {currentShiftInfo.maxSlots} Slots Left
              </span>
            </div>
            <div style={{ color: '#475569' }}>🕒 Shift Schedule: <strong>{currentShiftInfo.shift}</strong> (Est. ~{currentShiftInfo.estMinsPerPatient} mins/patient)</div>
          </div>

          <div className="modern-row mobile-col" style={{ marginBottom: '15px' }}>
            <div className="modern-group">
              <label style={{ color: '#0bc25c' }}><FaCalendarAlt /> Appointment Date <span>*</span></label>
              <input type="date" className="modern-input" value={date} onChange={(e) => setDate(e.target.value)} min={today} required />
            </div>
            <div className="modern-group">
              <label style={{ color: '#0bc25c' }}><FaClock /> Preferred Time <span>*</span></label>
              <input type="time" className="modern-input" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>
          
          <div className="modern-group" style={{ marginBottom: '15px' }}>
            <label style={{ color: '#0bc25c' }}><FaUsers /> Priority Triage Category <span>*</span></label>
            <select className="modern-input" value={serviceType} onChange={(e) => setServiceType(e.target.value)} required>
              <option value="Non-Senior/Non-PWD">Regular Resident (Non-Senior / Non-PWD)</option>
              <option value="Senior Citizen">Senior Citizen (Priority Lane)</option>
              <option value="Pregnant">Pregnant / Maternal (Priority Lane)</option>
              <option value="PWD">PWD - Person with Disability (Priority Lane)</option>
            </select>
          </div>
          
          <div className="modern-group" style={{ marginBottom: '22px' }}>
            <label style={{ color: '#0bc25c' }}><FaNotesMedical /> Chief Complaint / Reason for Visit</label>
            <input type="text" className="modern-input" placeholder="E.g., Fever & cough, Prenatal check, BP maintenance refill, Toothache..." value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
          </div>
          
          <button type="submit" className="modern-submit-btn" style={{ background: '#0bc25c', boxShadow: '0 4px 15px rgba(11, 194, 92, 0.3)' }} disabled={isLoading || remainingSlots <= 0}>
            {isLoading ? 'Generating Smart Queue Ticket...' : 'Confirm Smart Appointment'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default BookingModal;