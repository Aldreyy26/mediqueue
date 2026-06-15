import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaClock, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';
import { ref, onValue } from 'firebase/database';
import { database } from './firebase';

function AvailableTimes({ onBack, clinicStatus, closedReason }) {
  // Kunin ang kasalukuyang petsa sa format na YYYY-MM-DD
  const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [takenTimes, setTakenTimes] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);

  // Pakinggan ang lahat ng appointments mula sa Firebase
  useEffect(() => {
    const apptRef = ref(database, 'appointments');
    onValue(apptRef, (snapshot) => {
      if (snapshot.exists()) {
        setAllAppointments(Object.values(snapshot.val()));
      } else {
        setAllAppointments([]);
      }
    });
  }, []);

  // I-filter ang mga appointments base sa napiling petsa at formatin ang oras
  useEffect(() => {
    if (allAppointments.length > 0) {
      const dateBookings = allAppointments.filter(a => 
        a.appointmentDate === selectedDate && 
        a.status !== 'cancelled' && 
        a.status !== 'completed'
      );
      
      const times = dateBookings
        .map(a => {
           let timeToFormat = a.assignedTime || a.preferredTime;
           if(timeToFormat){
             // Simpleng logic para i-format ang 24h to 12h AM/PM kung kailangan
             // Ipagpalagay na ang preferredTime ay madalas HH:MM (24h) kapag mula sa input type="time"
              if(timeToFormat.length === 5){
                 const [h, m] = timeToFormat.split(':');
                 let hour = parseInt(h, 10);
                 const ampm = hour >= 12 ? 'PM' : 'AM';
                 hour = hour % 12 || 12;
                 timeToFormat = `${hour}:${m} ${ampm}`;
              }
           }
           return timeToFormat;
        })
        .filter(time => time) 
        .sort((a, b) => {
           // Basic sort para sa AM/PM string, maaaring hindi perfect pero mas maayos kaysa default
           const timeA = new Date('1970/01/01 ' + a);
           const timeB = new Date('1970/01/01 ' + b);
           return timeA - timeB;
        });
        
      setTakenTimes(times);
    } else {
      setTakenTimes([]);
    }
  }, [selectedDate, allAppointments]);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'none', background: 'transparent' }}>
      <div className="lab-header-banner" style={{ background: clinicStatus === 'Closed' ? '#f3f4f6' : '#fffbeb', borderBottomColor: clinicStatus === 'Closed' ? '#e5e7eb' : '#fde68a' }}>
        <button className="rx-back-btn" onClick={onBack}><FaArrowLeft /></button>
        <div className="lab-icon-box" style={{ background: clinicStatus === 'Closed' ? '#e5e7eb' : '#fef3c7', color: clinicStatus === 'Closed' ? '#6b7280' : '#d97706' }}><FaClock /></div>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>Taken Slots</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Check booked times before setting your schedule</p>
        </div>
      </div>
      
      <div style={{ padding: '20px' }}>
        <div className="modern-group" style={{ marginBottom: '25px', maxWidth: '300px' }}>
          <label style={{ color: '#0bc25c', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
             <FaCalendarAlt /> SELECT DATE TO CHECK:
          </label>
          <input 
            type="date" 
            className="modern-input" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
          />
        </div>

        {clinicStatus === 'Closed' ? (
             <div style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '40px 20px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>
               <FaExclamationTriangle style={{ fontSize: '40px', color: '#9ca3af', marginBottom: '15px' }} />
               <h3 style={{ margin: '0 0 5px 0', color: '#4b5563', fontSize: '18px' }}>CLINIC IS CLOSED</h3>
               <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>{closedReason || 'The clinic is currently closed or halted.'}</p>
             </div>
        ) : takenTimes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
               <FaClock style={{ fontSize: '40px', color: '#cbd5e1', marginBottom: '15px' }} />
               <h3 style={{ color: '#1e293b', margin: '0 0 10px 0' }}>All Slots Open!</h3>
               <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>There are no time bookings for this date yet.</p>
            </div>
        ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px' }}>
                {takenTimes.map((time, index) => (
                    <div key={index} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '15px', borderRadius: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                        {time} <br/><span style={{fontSize: '11px'}}>(Taken)</span>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}

export default AvailableTimes;