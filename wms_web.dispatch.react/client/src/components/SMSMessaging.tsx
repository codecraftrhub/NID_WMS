import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Card, Modal, Badge } from './ui';
import { smsApi, SMSResponse, ParcelSMSData } from '../services/smsApi';
import { Parcel } from '../services/wmsApi';

interface SMSMessagingProps {
  parcel?: Parcel;
  parcels?: Parcel[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (results: SMSResponse[]) => void;
}

interface MessageTemplate {
  id: string;
  name: string;
  message: string;
  variables: string[];
}

const defaultTemplates: MessageTemplate[] = [
  {
    id: 'parcel_created',
    name: 'Parcel Created',
    message: 'Dear {name}, your parcel ({waybill}) has been registered for delivery to {destination}. You will receive updates on its progress. Thank you for choosing NID Logistics Ltd.',
    variables: ['name', 'waybill', 'destination']
  },
  {
    id: 'parcel_dispatched',
    name: 'Parcel Dispatched',
    message: 'Dear {name}, your parcel ({waybill}) has been dispatched and is on its way to {destination}. Track your parcel for updates. Thank you for choosing NID Logistics Ltd.',
    variables: ['name', 'waybill', 'destination']
  },
  {
    id: 'parcel_delivered',
    name: 'Parcel Delivered',
    message: 'Dear {name}, your parcel ({waybill}) has been successfully delivered to {destination}. Thank you for choosing NID Logistics Ltd.',
    variables: ['name', 'waybill', 'destination']
  },
  {
    id: 'ready_for_pickup',
    name: 'Ready for Pickup',
    message: 'Dear {name}, your parcel ({waybill}) has arrived at {destination} and is ready for pickup. Please collect it at your earliest convenience. Thank you for choosing NID Logistics Ltd.',
    variables: ['name', 'waybill', 'destination']
  },
  {
    id: 'custom',
    name: 'Custom Message',
    message: '',
    variables: []
  }
];

export const SMSMessaging: React.FC<SMSMessagingProps> = ({
  parcel,
  parcels = [],
  isOpen,
  onClose,
  onSuccess
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('parcel_created');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [recipients, setRecipients] = useState<'sender' | 'receiver' | 'both'>('both');
  const [isTestMode, setIsTestMode] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [results, setResults] = useState<SMSResponse[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);

  const targetParcels = parcel ? [parcel] : parcels;
  const currentTemplate = defaultTemplates.find(t => t.id === selectedTemplate);

  useEffect(() => {
    if (!isOpen) {
      setResults([]);
      setShowResults(false);
      setCustomMessage('');
      setSelectedTemplate('parcel_created');
      setRecipients('both');
    }
  }, [isOpen]);

  const generateMessage = (template: MessageTemplate, parcelData: Parcel, recipientType: 'sender' | 'receiver'): string => {
    if (template.id === 'custom') {
      return customMessage;
    }

    const recipientName = recipientType === 'sender' ? parcelData.sender : parcelData.receiver;
    
    let message = template.message;
    message = message.replace('{name}', recipientName);
    message = message.replace('{waybill}', parcelData.waybillNumber);
    message = message.replace('{destination}', parcelData.destination);
    message = message.replace('{sender}', parcelData.sender);
    message = message.replace('{receiver}', parcelData.receiver);

    return message;
  };

  const validateInputs = (): string[] => {
    const errors: string[] = [];

    if (targetParcels.length === 0) {
      errors.push('No parcels selected');
    }

    if (selectedTemplate === 'custom' && !customMessage.trim()) {
      errors.push('Custom message cannot be empty');
    }

    for (const p of targetParcels) {
      if (recipients === 'sender' || recipients === 'both') {
        if (!p.senderTelephone || !smsApi.validatePhoneNumber(p.senderTelephone)) {
          errors.push(`Invalid sender phone number for parcel ${p.waybillNumber}`);
        }
      }
      if (recipients === 'receiver' || recipients === 'both') {
        if (!p.receiverTelephone || !smsApi.validatePhoneNumber(p.receiverTelephone)) {
          errors.push(`Invalid receiver phone number for parcel ${p.waybillNumber}`);
        }
      }
    }

    const configValidation = smsApi.validateConfig();
    if (!configValidation.isValid) {
      errors.push(...configValidation.errors);
    }

    return errors;
  };

  const handleSendMessages = async () => {
    const errors = validateInputs();
    if (errors.length > 0) {
      alert(`Cannot send messages:\n${errors.join('\n')}`);
      return;
    }

    setIsSending(true);
    const allResults: SMSResponse[] = [];

    try {
      for (const p of targetParcels) {
        const template = currentTemplate!;
        
        if (recipients === 'sender' || recipients === 'both') {
          try {
            const message = generateMessage(template, p, 'sender');
            const result = await smsApi.sendQuickSMS(
              p.senderTelephone,
              message,
              { test: isTestMode }
            );
            allResults.push({
              ...result,
              recipient: `${p.sender} (${p.senderTelephone})`,
              parcel: p.waybillNumber
            } as SMSResponse & { recipient?: string; parcel?: string });
          } catch (error) {
            allResults.push({
              status: 'error',
              message: `Failed to send to sender: ${error}`,
              recipient: `${p.sender} (${p.senderTelephone})`,
              parcel: p.waybillNumber
            } as SMSResponse & { recipient?: string; parcel?: string });
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (recipients === 'receiver' || recipients === 'both') {
          try {
            const message = generateMessage(template, p, 'receiver');
            const result = await smsApi.sendQuickSMS(
              p.receiverTelephone,
              message,
              { test: isTestMode }
            );
            allResults.push({
              ...result,
              recipient: `${p.receiver} (${p.receiverTelephone})`,
              parcel: p.waybillNumber
            } as SMSResponse & { recipient?: string; parcel?: string });
          } catch (error) {
            allResults.push({
              status: 'error',
              message: `Failed to send to receiver: ${error}`,
              recipient: `${p.receiver} (${p.receiverTelephone})`,
              parcel: p.waybillNumber
            } as SMSResponse & { recipient?: string; parcel?: string });
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setResults(allResults);
      setShowResults(true);
      
      if (onSuccess) {
        onSuccess(allResults);
      }

    } catch (error) {
      console.error('Error sending SMS messages:', error);
      alert(`Error sending messages: ${error}`);
    } finally {
      setIsSending(false);
    }
  };

  const getPreviewMessage = (): string => {
    if (targetParcels.length === 0) return 'No parcel selected';
    
    const sampleParcel = targetParcels[0];
    if (!currentTemplate) return '';
    
    return generateMessage(currentTemplate, sampleParcel, 'sender');
  };

  const getTotalRecipients = (): number => {
    let count = 0;
    targetParcels.forEach(p => {
      if (recipients === 'sender' || recipients === 'both') count++;
      if (recipients === 'receiver' || recipients === 'both') count++;
    });
    return count;
  };

  if (showResults) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="SMS Sending Results">
        <div className="space-y-4">
          <div className="grid gap-2">
            {results.map((result, index) => (
              <Card key={index} className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {(result as any).recipient || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-600">
                      Parcel: {(result as any).parcel || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      {result.message}
                    </p>
                  </div>
                  <Badge
                    variant={result.status === 'success' ? 'success' : 'error'}
                    size="sm"
                  >
                    {result.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowResults(false)}>
              Send More
            </Button>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send SMS Messages">
      <div className="space-y-6">
        <Card className="p-4 bg-blue-50">
          <h4 className="font-medium text-blue-900 mb-2">Target Parcels</h4>
          <p className="text-sm text-blue-700">
            {targetParcels.length} parcel{targetParcels.length !== 1 ? 's' : ''} selected
          </p>
          {targetParcels.length > 0 && targetParcels.length <= 3 && (
            <div className="mt-2 text-xs text-blue-600">
              {targetParcels.map(p => p.waybillNumber).join(', ')}
            </div>
          )}
        </Card>

        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Template
            </label>
            <Select
              value={selectedTemplate}
              onChange={(value) => setSelectedTemplate(value as unknown as string)}
              options={defaultTemplates.map(template => ({
                value: template.id,
                label: template.name
              }))}
              className="w-full"
            />
          </div>

          {selectedTemplate === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Message
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter your custom message..."
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipients
            </label>
            <Select
              value={recipients}
              onChange={(value) => setRecipients(value as unknown as 'sender' | 'receiver' | 'both')}
              options={[
                { value: 'both', label: 'Both Sender and Receiver' },
                { value: 'sender', label: 'Sender Only' },
                { value: 'receiver', label: 'Receiver Only' }
              ]}
              className="w-full"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="testMode"
              checked={isTestMode}
              onChange={(e) => setIsTestMode(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="testMode" className="ml-2 text-sm text-gray-700">
              Test Mode (messages won't be delivered)
            </label>
          </div>
        </div>

        {currentTemplate && currentTemplate.id !== 'custom' && (
          <Card className="p-4 bg-gray-50">
            <h4 className="font-medium text-gray-900 mb-2">Message Preview</h4>
            <p className="text-sm text-gray-700">
              {getPreviewMessage()}
            </p>
          </Card>
        )}

        <Card className="p-4 bg-yellow-50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-yellow-900">Ready to Send</h4>
              <p className="text-sm text-yellow-700">
                {getTotalRecipients()} message{getTotalRecipients() !== 1 ? 's' : ''} will be sent
                {isTestMode ? ' (Test Mode)' : ''}
              </p>
            </div>
            {isTestMode && (
              <Badge variant="warning" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                TEST
              </Badge>
            )}
          </div>
        </Card>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendMessages} 
            disabled={isSending || targetParcels.length === 0}
          >
            {isSending ? 'Sending...' : 'Send Messages'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};