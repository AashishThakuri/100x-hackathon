import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { auth } from './firebase';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const logout = () => {
    return signOut(auth);
  };

  const clearError = () => {
    setAuthError(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        setAuthError(null); // Clear any previous errors on successful auth
      }
    });

    // Check for redirect result on app load
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('User signed in via redirect:', result.user);
          setAuthError(null);
        }
      } catch (error) {
        console.error('Error with redirect result:', error);
        setAuthError(error.message);
      }
    };

    checkRedirectResult();

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    logout,
    authError,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
