import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import './AuthPageStyles.css';

const AuthPage = ({ onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    // Check for redirect result when component mounts
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const user = result.user;
          console.log('User signed in via redirect:', user);
          if (onSuccess) {
            onSuccess();
          } else {
            navigate('/home');
          }
        }
      } catch (error) {
        console.error('Error with redirect result:', error);
      }
    };
    
    checkRedirectResult();
  }, [navigate, onSuccess]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First try popup method
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('User signed in:', user);
      // Call success handler if provided, otherwise navigate
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/home');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      
      // Handle specific error cases
      if (error.code === 'auth/internal-error') {
        setError('Network connection issue. Please check your internet connection and try again.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else if (error.message.includes('Failed to fetch') || error.message.includes('ERR_NAME_NOT_RESOLVED')) {
        setError('Cannot connect to authentication servers. Please check your internet connection and try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups for this site and try again.');
        // Try redirect as fallback
        try {
          console.log('Trying redirect method as fallback...');
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          console.error('Redirect also failed:', redirectError);
          setError('Sign-in failed. Please check your browser settings and try again.');
        }
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        setError('Another sign-in popup is already open. Please complete that first.');
      } else if (error.message.includes('Cross-Origin-Opener-Policy')) {
        // Handle COOP policy issues
        setError('Browser security settings are preventing sign-in. Trying alternative method...');
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          setError('Sign-in failed due to browser security settings. Please try refreshing the page.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={handleCloseModal}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={handleCloseModal}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <div className="auth-modal-header">
          <h2>Welcome to Nepal Connect</h2>
          <p>Plan your perfect Nepal trip and share your experiences with fellow travelers</p>
        </div>

        <div className="auth-modal-body">
          {error && (
            <div className="auth-error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#E74C3C" strokeWidth="2"/>
                <path d="M15 9l-6 6M9 9l6 6" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}
          
          <button 
            className={`google-signin-btn ${loading ? 'loading' : ''}`}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>
          
          {error && error.includes('popup') && (
            <div className="auth-help-text">
              <p>Having trouble? Try:</p>
              <ul>
                <li>Allow popups for this site</li>
                <li>Disable popup blockers</li>
                <li>Refresh the page and try again</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
