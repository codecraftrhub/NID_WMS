import { useEffect, useRef, useCallback } from 'react';

interface UseSessionTimeoutProps {
  timeout: number;
  onTimeout: () => void;
  onWarning: (timeLeft: number) => void;
  warningTime: number;
  isAuthenticated: boolean;
}

export const useSessionTimeout = ({
  timeout,
  onTimeout,
  onWarning,
  warningTime,
  isAuthenticated
}: UseSessionTimeoutProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;

    lastActivityRef.current = Date.now();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }

    warningRef.current = setTimeout(() => {
      if (isAuthenticated) {
        onWarning(warningTime);
      }
    }, timeout - warningTime);

    timeoutRef.current = setTimeout(() => {
      if (isAuthenticated) {
        onTimeout();
      }
    }, timeout);
  }, [timeout, warningTime, onTimeout, onWarning, isAuthenticated]);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      return;
    }

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearTimers();
    };
  }, [isAuthenticated, resetTimer, clearTimers]);

  return {
    extendSession,
    clearTimers
  };
};