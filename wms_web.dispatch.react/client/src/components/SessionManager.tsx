import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import SessionTimeoutModal from './SessionTimeoutModal';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_TIME = 30 * 1000; // 30 seconds in milliseconds

const SessionManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, logout } = useAuth();
  const [showWarningModal, setShowWarningModal] = useState(false);

  const handleTimeout = useCallback(() => {
    setShowWarningModal(false);
    logout();
  }, [logout]);

  const handleWarning = useCallback((timeLeft: number) => {
    setShowWarningModal(true);
  }, []);

  const { extendSession } = useSessionTimeout({
    timeout: SESSION_TIMEOUT,
    onTimeout: handleTimeout,
    onWarning: handleWarning,
    warningTime: WARNING_TIME,
    isAuthenticated
  });

  const handleContinueSession = useCallback(() => {
    setShowWarningModal(false);
    extendSession();
  }, [extendSession]);

  const handleLogoutNow = useCallback(() => {
    setShowWarningModal(false);
    logout();
  }, [logout]);

  return (
    <>
      {children}
      <SessionTimeoutModal
        isOpen={showWarningModal}
        onContinue={handleContinueSession}
        onLogout={handleLogoutNow}
        warningTime={WARNING_TIME}
      />
    </>
  );
};

export default SessionManager;