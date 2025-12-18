import React, { useState } from 'react';
import { Button } from './ui';
import { SMSMessaging } from './SMSMessaging';
import { Parcel } from '../services/wmsApi';
import { SMSResponse } from '../services/smsApi';

interface SMSButtonProps {
  parcel?: Parcel;
  parcels?: Parcel[];
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onSuccess?: (results: SMSResponse[]) => void;
  children?: React.ReactNode;
  title?: string;
}

export const SMSButton: React.FC<SMSButtonProps> = ({
  parcel,
  parcels = [],
  disabled = false,
  variant = 'outline',
  size = 'sm',
  title,
  className = '',
  onSuccess,
  children
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const targetParcels = parcel ? [parcel] : parcels;
  const hasValidParcels = targetParcels.length > 0;

  const handleSuccess = (results: SMSResponse[]) => {
    setIsModalOpen(false);
    onSuccess?.(results);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        title={title}
        disabled={disabled || !hasValidParcels}
        onClick={() => setIsModalOpen(true)}
      >
        {children || (
          <>
            <svg 
              className="w-4 h-4 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
              />
            </svg>
            Send SMS
          </>
        )}
      </Button>

      <SMSMessaging
        parcel={parcel}
        parcels={parcels}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
};