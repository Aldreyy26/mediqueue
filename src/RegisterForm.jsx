import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaEnvelope, FaLock, FaUser, FaMapMarkerAlt, FaPhoneAlt, FaHome, FaShieldAlt, FaEye, FaEyeSlash } from 'react-icons/fa';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, database } from './firebase';

function RegisterForm({ onClose, onSwitchToLogin }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [purok, setPurok] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  
  // Show Password States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // BAGO: State para sa Terms & Conditions Modal
  const [showTermsModal, setShowTermsModal] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    if (!agreeTerms) {
      setError("Please agree to the Terms and Conditions.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const fullName = `${firstName} ${lastName}`;
      await set(ref(database, 'users/' + user.uid), {
        fullName: fullName,
        address: address,
        contact: contact,
        email: email,
        purok: purok,
        role: "resident"
      });
      alert("Account Successfully Created!");
      navigate('/dashboard');

    } catch (err) {
      setError('Registration Failed: ' + err.message);
    }
  };

  return (
    <div className="modal-overlay">
      
      {/* BAGO: TERMS AND CONDITIONS MODAL */}
      {showTermsModal && (
        <div className="modal-overlay" style={{ zIndex: 10001 }}>
          <div className="modern-register-card" style={{ maxWidth: '500px', padding: '30px', maxHeight: '80vh', overflowY: 'auto' }}>
            <button className="close-btn" type="button" onClick={() => setShowTermsModal(false)}><FaTimes /></button>
            <h2 style={{ color: '#1e293b', margin: '0 0 15px 0', fontSize: '20px', fontWeight: '800' }}>Terms and Conditions</h2>
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', textAlign: 'justify' }}>
              <p><strong>1. Acceptance of Terms</strong><br/> By creating an account, you agree to abide by these terms and the rules of the Old Cabalan Health Center.</p>
              <p><strong>2. Data Privacy Policy</strong><br/> We respect your privacy. All personal and health-related information collected (e.g., Name, Address, Vitals) will be used strictly for medical record-keeping and queuing efficiency. Your data is secured and will not be shared with unauthorized third parties.</p>
              <p><strong>3. Accuracy of Information</strong><br/> You confirm that all information provided during registration is accurate and true. Fake accounts may be suspended.</p>
              <p><strong>4. Healthcare Updates</strong><br/> By proceeding, you consent to receive digital notifications regarding your appointments and official health center announcements.</p>
              <p><strong>5. Account Security</strong><br/> You are responsible for maintaining the confidentiality of your password.</p>
            </div>
            <button 
              type="button" 
              className="btn-green-full" 
              onClick={() => { setAgreeTerms(true); setShowTermsModal(false); }} 
              style={{ marginTop: '20px', padding: '12px' }}
            >
              I Agree
            </button>
          </div>
        </div>
      )}

      <div className="modern-register-card modern-scrollable-card">

        {/* Close Button */}
        <button className="close-btn" onClick={onClose}><FaTimes /></button>

        {/* Header */}
        <div className="modern-header-green">
          <div className="modern-logo-box">
            <img src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" alt="Logo" style={{ width: '35px' }} />
          </div>
          <div>
            <h2>Create Your Account</h2>
            <p>Old Cabalan Health App</p>
          </div>
        </div>

        {/* Form Body */}
        <form className="modern-form-body" onSubmit={handleRegister}>

          {error && <div className="error-message" style={{ background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold', fontSize: '13px' }}>{error}</div>}

          {/* ROW 1: Name */}
          <div className="modern-row mobile-col">
            <div className="modern-group">
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}><FaUser /> First Name <span>*</span></label>
              <input type="text" className="modern-input" placeholder="Juan" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="modern-group">
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}><FaUser /> Last Name <span>*</span></label>
              <input type="text" className="modern-input" placeholder="Dela Cruz" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>

          {/* ROW 2: Email & Phone */}
          <div className="modern-row mobile-col">
            <div className="modern-group">
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}><FaEnvelope /> Email Address <span>*</span></label>
              <input type="email" className="modern-input" placeholder="juan.delacruz@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="modern-group">
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}><FaPhoneAlt /> Phone Number <span>*</span></label>
              <input type="tel" className="modern-input" placeholder="09XX XXX XXXX" value={contact} onChange={(e) => setContact(e.target.value)} required />
            </div>
          </div>

          {/* SINGLE ROW: Address */}
          <div className="modern-group" style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}><FaHome /> Complete Address</label>
            <input type="text" className="modern-input" placeholder="123 Main Street, Old Cabalan" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>

       {/* SINGLE ROW: Purok */}
          <div className="modern-group" style={{ marginBottom: '20px' }}>
             <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}><FaMapMarkerAlt /> Purok</label>
            <select className="modern-input" value={purok} onChange={(e) => setPurok(e.target.value)} required>
              <option value="" disabled>Select your purok</option>
              {/* BINAGO: Mula Array(13), ginawa nating Array(15) */}
              {[...Array(15)].map((_, i) => (
                <option key={i+1} value={`Purok ${i+1}`}>Purok {i+1}</option>
              ))}
            </select>
          </div>

          {/* Secure Your Account Box */}
          <div className="modern-secure-box" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div className="modern-secure-title" style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaShieldAlt color="#0bc25c" /> Secure Your Account
            </div>
            
            <div className="modern-group" style={{ marginBottom: '15px', position: 'relative' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Password <span>*</span></label>
              <div style={{ position: 'relative' }}>
                  <FaLock style={{ position: 'absolute', top: '14px', left: '15px', color: '#94a3b8' }} />
                  <input type={showPassword ? "text" : "password"} className="modern-input" placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={{ paddingLeft: '40px', paddingRight: '40px' }} />
                  <span onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', top: '14px', right: '15px', cursor: 'pointer', color: '#94a3b8' }}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
              </div>
            </div>

            <div className="modern-group" style={{ marginBottom: '0', position: 'relative' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>Confirm Password <span>*</span></label>
              <div style={{ position: 'relative' }}>
                  <FaLock style={{ position: 'absolute', top: '14px', left: '15px', color: '#94a3b8' }} />
                  <input type={showConfirmPassword ? "text" : "password"} className="modern-input" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ paddingLeft: '40px', paddingRight: '40px' }} />
                  <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', top: '14px', right: '15px', cursor: 'pointer', color: '#94a3b8' }}>
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
              </div>
            </div>
          </div>

          {/* Terms Box with Clickable Link */}
          <div className="modern-terms-box" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '20px', fontSize: '12px', color: '#64748b' }}>
            <input type="checkbox" id="terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} style={{ marginTop: '3px' }} />
            <label htmlFor="terms">
              <strong style={{ color: '#1e293b', display: 'block' }}>
                I agree to the <span style={{ color: '#0bc25c', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}>Terms and Conditions</span> <span>*</span>
              </strong>
              By signing up, you agree to our privacy policy and consent to receive healthcare updates.
            </label>
          </div>

          <button type="submit" className="modern-submit-btn" style={{ width: '100%', padding: '15px', background: '#0bc25c', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            Create Account
          </button>

          <div className="modern-footer" style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#64748b' }}>
            Already have an account? <span onClick={onSwitchToLogin} style={{ color: '#0bc25c', fontWeight: 'bold', cursor: 'pointer' }}>Sign In</span>
          </div>

        </form>
      </div>
    </div>
  );
}

export default RegisterForm;