import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from './firebase';

function LoginForm({ onClose, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Kunin ang role ng user mula sa Firebase Database
      const userRef = ref(database, `users/${user.uid}/role`);
      const snapshot = await get(userRef);
      const userRole = snapshot.exists() ? snapshot.val() : 'resident';

      // AUTOMATIC ROLE-BASED ROUTING (Handa na rin para sa Doctor account)
      if (userRole === 'admin') {
        navigate('/admin');
      } else if (userRole === 'doctor') {
        navigate('/doctor');
      } else {
        navigate('/dashboard'); // Para sa mga residents
      }

    } catch (err) {
      setError('Incorrect email or password. Please try again.');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please type your email address in the box first, then click 'Forgot Password'.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent! Please check your email inbox or spam folder.");
      setError('');
    } catch (err) {
      setError("Error sending reset link: " + err.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modern-register-card" style={{ maxWidth: '500px', width: '90%' }}>
        <button className="close-btn" onClick={onClose}><FaTimes /></button>
        
        <div className="modern-header-green">
          <div className="modern-logo-box">
            <img src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" alt="Logo" style={{ width: '35px' }} />
          </div>
          <div>
            <h2>Welcome Back</h2>
            <p>Login to your account</p>
          </div>
        </div>

        <div className="modern-form-body">
          {/* TINANGGAL NA ANG ROLE TOGGLE DITO PARA SECURE AT AUTOMATIC */}
          
          <form onSubmit={handleLogin}>
            {error && <div className="error-message" style={{ background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold', fontSize: '13px' }}>{error}</div>}
            
            <div className="modern-group" style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '5px' }}>EMAIL ADDRESS</label>
              <div style={{ position: 'relative' }}>
                <FaEnvelope style={{ position: 'absolute', top: '14px', left: '15px', color: '#94a3b8' }} />
                <input
                  type="email"
                  className="modern-input"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '40px', width: '100%', boxSizing: 'border-box' }}
                  required
                />
              </div>
            </div>

            <div className="modern-group" style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '5px' }}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <FaLock style={{ position: 'absolute', top: '14px', left: '15px', color: '#94a3b8' }} />
                <input
                  type={showPassword ? "text" : "password"}
                  className="modern-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '40px', paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                  required
                />
                <span 
                  onClick={() => setShowPassword(!showPassword)} 
                  style={{ position: 'absolute', top: '14px', right: '15px', cursor: 'pointer', color: '#94a3b8' }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap' }}>
              <div className="modern-checkbox-row" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                <input type="checkbox" id="rememberMe" />
                <label htmlFor="rememberMe">Remember me</label>
              </div>
              <span className="modern-forgot-link" onClick={handleForgotPassword} style={{ marginTop: 0, color: '#0bc25c', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                Forgot Password?
              </span>
            </div>

            <button type="submit" className="modern-submit-btn" disabled={isLoading} style={{ width: '100%', padding: '15px', background: '#0bc25c', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="modern-footer" style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#64748b' }}>
            Don't have an account? <span onClick={onSwitchToRegister} style={{ color: '#0bc25c', fontWeight: 'bold', cursor: 'pointer' }}>Sign Up</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;