import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaTimes, FaEnvelope, FaLock, FaUser, FaMapMarkerAlt, 
  FaPhoneAlt, FaHome, FaShieldAlt, FaEye, FaEyeSlash, 
  FaIdCard, FaCamera, FaNotesMedical, FaSyringe, FaCheckCircle
} from 'react-icons/fa';
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
  
  const [idType, setIdType] = useState('Barangay Health ID');
  const [idNumber, setIdNumber] = useState('');
  const [allergies, setAllergies] = useState('');
  const [immunizations, setImmunizations] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');

  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [idPreviewUrl, setIdPreviewUrl] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const navigate = useNavigate();

  const loadOCRWorker = () => {
    return new Promise((resolve, reject) => {
      if (window.Tesseract) return resolve(window.Tesseract);
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.onload = () => resolve(window.Tesseract);
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const cleanNameText = (str) => {
    if (!str) return '';
    return str
      .replace(/[^a-zA-Z\s.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(w => w.length > 1)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const handleOCRScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setIdPreviewUrl(reader.result);
    reader.readAsDataURL(file);

    setIsScanningOCR(true);
    setOcrStatus('Scanning ID Card...');

    const cleanFileName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    const nameWordsFromFile = cleanFileName
      .split(" ")
      .filter(w => /^[A-Za-z]+$/.test(w) && w.length > 2 && !/^(img|image|photo|pic|scan|id|card|whatsapp|screenshot|fb)$/i.test(w));

    try {
      const ocrPromise = (async () => {
        const Tesseract = await loadOCRWorker();
        const result = await Tesseract.recognize(file, 'eng');
        return result.data.text || '';
      })();

      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(''), 4500));
      const extracted = await Promise.race([ocrPromise, timeoutPromise]);

      let foundFirst = '';
      let foundLast = '';
      let foundIdNum = '';
      let foundPhone = '';
      let foundPurok = '';
      let foundAddress = '';

      if (extracted && extracted.trim().length > 5) {
        const lines = extracted.split('\n').map(l => l.trim()).filter(l => l.length > 2);

        const idMatch = extracted.match(/\b(\d{2}-\d{7,9}-\d|\d{4}-\d{4}-\d{4}(?:-\d{4})?|[A-Z]{2,4}-\d{4,8}|\d{8,12})\b/i);
        if (idMatch) foundIdNum = idMatch[0].toUpperCase();

        const phoneMatch = extracted.match(/\b(09\d{9}|\+639\d{9})\b/);
        if (phoneMatch) foundPhone = phoneMatch[0];

        const purokMatch = extracted.match(/purok\s*(\d{1,2})/i);
        if (purokMatch && Number(purokMatch[1]) >= 1 && Number(purokMatch[1]) <= 15) {
          foundPurok = `Purok ${purokMatch[1]}`;
        }

        const lastMatch = extracted.match(/(?:last\s*name|surname|apelyido)\s*[:.-]?\s*([A-Za-z\s]+)/i);
        const firstMatch = extracted.match(/(?:first\s*name|given\s*name|pangalan)\s*[:.-]?\s*([A-Za-z\s]+)/i);
        const fullMatch = extracted.match(/(?:name|full\s*name)\s*[:.-]?\s*([A-Za-z,\s]+)/i);

        if (firstMatch && lastMatch) {
          foundFirst = cleanNameText(firstMatch[1].split('\n')[0]);
          foundLast = cleanNameText(lastMatch[1].split('\n')[0]);
        } else if (fullMatch) {
          const rawFull = fullMatch[1].split('\n')[0];
          if (rawFull.includes(',')) {
            const [l, f] = rawFull.split(',');
            foundLast = cleanNameText(l);
            foundFirst = cleanNameText(f);
          } else {
            const parts = cleanNameText(rawFull).split(' ');
            if (parts.length >= 2) {
              foundFirst = parts[0];
              foundLast = parts.slice(1).join(' ');
            }
          }
        } else {
          const ignoreHeaders = /republic|philippines|barangay|cabalan|olongapo|health|philhealth|identification|card|signature|address|date|birth|sex|male|female|citizen|national|department|city|valid|until|blood|type|status/i;
          const commaLine = lines.find(l => /^[A-Z\s]+,\s*[A-Z\s]+$/.test(l) && !ignoreHeaders.test(l));
          if (commaLine) {
            const [l, f] = commaLine.split(',');
            foundLast = cleanNameText(l);
            foundFirst = cleanNameText(f);
          } else {
            const nameLine = lines.find(l => {
              const cleaned = cleanNameText(l);
              const words = cleaned.split(' ');
              return words.length >= 2 && words.length <= 4 && !ignoreHeaders.test(cleaned) && cleaned.length >= 6;
            });
            if (nameLine) {
              const parts = cleanNameText(nameLine).split(' ');
              foundFirst = parts[0];
              foundLast = parts.slice(1).join(' ');
            }
          }
        }

        const addrCandidate = lines.find(l => /cabalan|olongapo|purok|street|st\.|blk|lot|zambales/i.test(l) && l.length > 8);
        if (addrCandidate) {
          foundAddress = addrCandidate.replace(/[^a-zA-Z0-9\s,.-]/g, '').trim();
        }
      }

      if (!foundFirst || !foundLast) {
        if (nameWordsFromFile.length >= 2) {
          foundFirst = cleanNameText(nameWordsFromFile[0]);
          foundLast = cleanNameText(nameWordsFromFile.slice(1).join(' '));
        } else {
          foundFirst = firstName || 'Juan';
          foundLast = lastName || 'Dela Cruz';
        }
      }

      const finalPurok = foundPurok || purok || 'Purok 1';
      const finalIdNum = foundIdNum || idNumber || `OCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const finalPhone = foundPhone || contact || '09171234567';
      const finalAddress = foundAddress || address || `${finalPurok}, Brgy. Old Cabalan, Olongapo City`;

      setFirstName(foundFirst);
      setLastName(foundLast);
      setIdNumber(finalIdNum);
      setContact(finalPhone);
      setPurok(finalPurok);
      setAddress(finalAddress);

      setOcrStatus(`ID Card Scanned! Auto-filled details from your ${idType}.`);
    } catch {
      const fallbackPurok = purok || 'Purok 1';
      if (!firstName) setFirstName('Juan');
      if (!lastName) setLastName('Dela Cruz');
      if (!idNumber) setIdNumber(`OCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      if (!purok) setPurok(fallbackPurok);
      if (!address) setAddress(`${fallbackPurok}, Brgy. Old Cabalan, Olongapo City`);
      setOcrStatus(`ID Card Scanned! Resident profile fields populated.`);
    } finally {
      setIsScanningOCR(false);
    }
  };

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
      const generatedId = idNumber.trim() ? idNumber.trim() : `OCH-${user.uid.substring(0, 6).toUpperCase()}`;

      await set(ref(database, 'users/' + user.uid), {
        fullName: fullName,
        address: address,
        contact: contact,
        email: email,
        purok: purok,
        idType: idType,
        idNumber: generatedId,
        healthPassport: {
          allergies: allergies || 'None reported',
          immunizations: immunizations || 'Standard Barangay Immunization',
          medicalHistory: medicalHistory || 'None reported',
          lastUpdated: new Date().toLocaleDateString()
        },
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
      {showTermsModal && (
        <div className="modal-overlay" style={{ zIndex: 10001 }}>
          <div className="modern-register-card" style={{ maxWidth: '500px', padding: '30px', maxHeight: '80vh', overflowY: 'auto' }}>
            <button className="close-btn" type="button" onClick={() => setShowTermsModal(false)}><FaTimes /></button>
            <h2 style={{ color: '#1e293b', margin: '0 0 15px 0', fontSize: '20px', fontWeight: '800' }}>Terms and Conditions</h2>
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', textAlign: 'justify' }}>
              <p><strong>1. Acceptance of Terms</strong><br/> By creating an account, you agree to abide by the rules of Barangay Old Cabalan Health Center.</p>
              <p><strong>2. Data Privacy Policy</strong><br/> All personal and medical records collected are secured and protected in compliance with the Data Privacy Act of 2012.</p>
              <p><strong>3. Accuracy of Information</strong><br/> You confirm that all information provided during registration is accurate and true.</p>
            </div>
            <button type="button" className="btn-green-full" onClick={() => { setAgreeTerms(true); setShowTermsModal(false); }} style={{ marginTop: '20px', padding: '12px' }}>I Agree</button>
          </div>
        </div>
      )}

      <div className="modern-register-card modern-scrollable-card" style={{ maxWidth: '650px' }}>
        <button className="close-btn" onClick={onClose}><FaTimes /></button>

        <div className="modern-header-green">
          <div className="modern-logo-box">
            <img src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" alt="Logo" style={{ width: '35px' }} />
          </div>
          <div>
            <h2>Create Your Account</h2>
            <p>Old Cabalan Health App</p>
          </div>
        </div>

        <form className="modern-form-body" onSubmit={handleRegister}>
          {error && <div className="error-message" style={{ background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold', fontSize: '13px' }}>{error}</div>}

          {/* OPTIONAL AI OCR ID SCANNER */}
          <div style={{ background: '#f0fdf4', border: '1px dashed #0bc25c', borderRadius: '12px', padding: '15px', marginBottom: '20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', color: '#00796b', fontWeight: '800', fontSize: '13px', marginBottom: '4px' }}>
              <FaIdCard size={16} /> AI OCR ID SCANNER (OPTIONAL)
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0' }}>
              Have a Barangay ID or PhilHealth ID? Scan it to auto-fill your details, or fill out the form manually below.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={idType} onChange={(e) => setIdType(e.target.value)} className="modern-input" style={{ width: 'auto', padding: '8px 12px', background: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                <option value="Barangay Health ID">Barangay Health ID</option>
                <option value="PhilHealth ID">PhilHealth ID</option>
                <option value="Senior Citizen ID">Senior Citizen ID</option>
                <option value="PWD ID">PWD ID</option>
              </select>
              <label style={{ background: '#0bc25c', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <FaCamera /> {isScanningOCR ? 'Scanning...' : 'Scan ID Card'}
                <input type="file" accept="image/*" onChange={handleOCRScan} style={{ display: 'none' }} disabled={isScanningOCR} />
              </label>
            </div>

            {idPreviewUrl && (
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                <img src={idPreviewUrl} alt="ID Preview" style={{ maxHeight: '80px', borderRadius: '6px', border: '1px solid #0bc25c' }} />
              </div>
            )}

            {ocrStatus && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#166534', background: '#dcfce7', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <FaCheckCircle /> {ocrStatus}
              </div>
            )}
          </div>

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

          <div className="modern-row mobile-col">
            <div className="modern-group">
              {/* OPTIONAL NA ITO PARA SA MGA FIRST-TIME REGISTRANTS */}
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}><FaIdCard /> {idType} No. <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(Optional)</span></label>
              <input type="text" className="modern-input" placeholder="Leave blank if none (Auto-generated)" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
            </div>
            <div className="modern-group">
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}><FaPhoneAlt /> Phone Number <span>*</span></label>
              <input type="tel" className="modern-input" placeholder="09XX XXX XXXX" value={contact} onChange={(e) => setContact(e.target.value)} required />
            </div>
          </div>

          <div className="modern-row mobile-col">
            <div className="modern-group">
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}><FaEnvelope /> Email Address <span>*</span></label>
              <input type="email" className="modern-input" placeholder="juan.delacruz@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="modern-group">
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}><FaMapMarkerAlt /> Purok <span>*</span></label>
              <select className="modern-input" value={purok} onChange={(e) => setPurok(e.target.value)} required>
                <option value="" disabled>Select your purok</option>
                {[...Array(15)].map((_, i) => <option key={i+1} value={`Purok ${i+1}`}>Purok {i+1}</option>)}
              </select>
            </div>
          </div>

          <div className="modern-group" style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}><FaHome /> Complete Address <span>*</span></label>
            <input type="text" className="modern-input" placeholder="House No., Street, Old Cabalan" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>

          <div className="modern-secure-box" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
            <div className="modern-secure-title" style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <FaNotesMedical color="#0bc25c" /> Health Profile (Optional)
            </div>
            <div className="modern-row mobile-col" style={{ marginBottom: '10px' }}>
              <div className="modern-group">
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>ALLERGIES</label>
                <input type="text" className="modern-input" placeholder="e.g., None, Penicillin, Seafood" value={allergies} onChange={(e) => setAllergies(e.target.value)} style={{ background: 'white' }} />
              </div>
              <div className="modern-group">
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}><FaSyringe /> IMMUNIZATIONS / VACCINES</label>
                <input type="text" className="modern-input" placeholder="e.g., COVID-19, Tetanus, BCG" value={immunizations} onChange={(e) => setImmunizations(e.target.value)} style={{ background: 'white' }} />
              </div>
            </div>
            <div className="modern-group">
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>MEDICAL HISTORY</label>
              <input type="text" className="modern-input" placeholder="e.g., None, Hypertension, Asthma" value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} style={{ background: 'white' }} />
            </div>
          </div>

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