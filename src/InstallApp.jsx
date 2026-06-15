import React, { useState, useEffect } from 'react';
import { FaDownload } from 'react-icons/fa';

function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Ito ang function na sasalo sa signal ng browser na pwede nang i-install ang app
    const handleBeforeInstallPrompt = (e) => {
      // Pigilan ang default na popup ng browser
      e.preventDefault();
      // I-save ang event para magamit natin kapag kinlick na ang button
      setDeferredPrompt(e);
      // I-show ang ating custom button
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Kapag na-install na ng user ang app, itago na natin ang button
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Ipakita ang totoong install popup ng Android/Chrome
    deferredPrompt.prompt();

    // Hintayin ang sagot ng user (kung kinancel o in-accept)
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    // I-clear ang prompt dahil minsan lang ito pwedeng gamitin
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Kung na-install na o hindi supported ng browser, wag ipakita ang button
  if (!isInstallable) return null;

  return (
    <button 
      onClick={handleInstallClick} 
      style={{
        background: '#1e293b',
        color: 'white',
        border: 'none',
        padding: '12px 25px',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        transition: '0.2s',
        marginTop: '15px'
      }}
      onMouseOver={(e) => e.currentTarget.style.background = '#334155'}
      onMouseOut={(e) => e.currentTarget.style.background = '#1e293b'}
    >
      <FaDownload /> Install App sa Cellphone
    </button>
  );
}

export default InstallApp;