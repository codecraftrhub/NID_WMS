import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Clock, AlertTriangle } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onLogout: () => void;
  warningTime: number;
}

const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  onContinue,
  onLogout,
  warningTime
}) => {
  const [timeLeft, setTimeLeft] = useState(warningTime);

  useEffect(() => {
    if (!isOpen) return;

    setTimeLeft(warningTime);
    
    const interval = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1000) {
          clearInterval(interval);
          onLogout();
          return 0;
        }
        return prevTime - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, warningTime, onLogout]);

  const formatTime = (milliseconds: number) => {
    const seconds = Math.ceil(milliseconds / 1000);
    return seconds;
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onContinue}
      size="sm"
      closeOnBackdropClick={false}
      closeOnEscape={false}
      showCloseButton={false}
    >
      <Modal.Body>
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Session About to Expire
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your session will expire due to inactivity. You will be automatically logged out in:
            </p>
            
            <div className="flex items-center justify-center space-x-2 text-2xl font-mono font-bold text-red-600 dark:text-red-400">
              <Clock className="w-6 h-6" />
              <span>{formatTime(timeLeft)} seconds</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Click "Continue Session" to stay logged in or "Logout" to end your session now.
          </p>
        </div>
      </Modal.Body>
      
      <Modal.Footer>
        <div className="flex space-x-3 w-full">
          <Button
            variant="outline"
            onClick={onLogout}
            className="flex-1"
          >
            Logout Now
          </Button>
          <Button
            variant="primary"
            onClick={onContinue}
            className="flex-1"
          >
            Continue Session
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default SessionTimeoutModal;