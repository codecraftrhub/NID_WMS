import { useState, useCallback } from 'react';
import { smsApi, SMSResponse, ParcelSMSData } from '../services/smsApi';
import { Parcel } from '../services/wmsApi';

interface ExtendedSMSResponse extends SMSResponse {
  parcelId?: string;
}

interface UseSMSOptions {
  onSuccess?: (results: SMSResponse[]) => void;
  onError?: (error: string) => void;
}

export const useSMS = (options?: UseSMSOptions) => {
  const [isSending, setIsSending] = useState(false);
  const [lastResults, setLastResults] = useState<SMSResponse[]>([]);

  const convertParcelToSMSData = useCallback((parcel: Parcel): ParcelSMSData => {
    const getStatusString = (status: number): string => {
      switch (status) {
        case 0: return 'Pending';
        case 1: return 'Confirmed';
        case 2: return 'In Transit';
        case 3: return 'Delivered';
        case 4: return 'Cancelled';
        default: return 'Unknown';
      }
    };

    return {
      waybillNumber: parcel.waybillNumber,
      senderPhone: parcel.senderTelephone,
      receiverPhone: parcel.receiverTelephone,
      sender: parcel.sender,
      receiver: parcel.receiver,
      destination: parcel.destination,
      status: getStatusString(parcel.status)
    };
  }, []);

  const sendParcelCreatedNotification = useCallback(async (parcel: Parcel): Promise<SMSResponse[]> => {
    setIsSending(true);
    try {
      const smsData = convertParcelToSMSData(parcel);
      const results: SMSResponse[] = [];

      const senderResult = await smsApi.sendParcelNotificationSMS(smsData, 'created', 'sender');
      results.push(senderResult);

      const receiverResult = await smsApi.sendParcelNotificationSMS(smsData, 'created', 'receiver');
      results.push(receiverResult);

      setLastResults(results);
      options?.onSuccess?.(results);
      return results;
    } catch (error) {
      const errorMessage = `Failed to send parcel created notification: ${error}`;
      options?.onError?.(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSending(false);
    }
  }, [convertParcelToSMSData, options]);

  const sendParcelDispatchedNotification = useCallback(async (parcel: Parcel): Promise<SMSResponse[]> => {
    setIsSending(true);
    try {
      const smsData = convertParcelToSMSData(parcel);
      const results: SMSResponse[] = [];

      const senderResult = await smsApi.sendParcelNotificationSMS(smsData, 'dispatched', 'sender');
      results.push(senderResult);

      const receiverResult = await smsApi.sendParcelNotificationSMS(smsData, 'dispatched', 'receiver');
      results.push(receiverResult);

      setLastResults(results);
      options?.onSuccess?.(results);
      return results;
    } catch (error) {
      const errorMessage = `Failed to send parcel dispatched notification: ${error}`;
      options?.onError?.(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSending(false);
    }
  }, [convertParcelToSMSData, options]);

  const sendParcelDeliveredNotification = useCallback(async (parcel: Parcel): Promise<SMSResponse[]> => {
    setIsSending(true);
    try {
      const smsData = convertParcelToSMSData(parcel);
      const results: SMSResponse[] = [];

      const senderResult = await smsApi.sendParcelNotificationSMS(smsData, 'delivered', 'sender');
      results.push(senderResult);

      const receiverResult = await smsApi.sendParcelNotificationSMS(smsData, 'delivered', 'receiver');
      results.push(receiverResult);

      setLastResults(results);
      options?.onSuccess?.(results);
      return results;
    } catch (error) {
      const errorMessage = `Failed to send parcel delivered notification: ${error}`;
      options?.onError?.(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSending(false);
    }
  }, [convertParcelToSMSData, options]);

  const sendParcelStatusUpdate = useCallback(async (
    parcel: Parcel,
    newStatus: string,
    additionalInfo?: string
  ): Promise<SMSResponse[]> => {
    setIsSending(true);
    try {
      const smsData = convertParcelToSMSData(parcel);
      const results = await smsApi.sendParcelStatusUpdateSMS(smsData, newStatus, additionalInfo);

      setLastResults(results);
      options?.onSuccess?.(results);
      return results;
    } catch (error) {
      const errorMessage = `Failed to send parcel status update: ${error}`;
      options?.onError?.(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSending(false);
    }
  }, [convertParcelToSMSData, options]);

  const sendCustomSMS = useCallback(async (
    phoneNumbers: string[],
    message: string,
    testMode: boolean = true
  ): Promise<SMSResponse[]> => {
    setIsSending(true);
    try {
      const results = await smsApi.sendBulkSMS(phoneNumbers, message, { test: testMode });
      setLastResults(results);
      options?.onSuccess?.(results);
      return results;
    } catch (error) {
      const errorMessage = `Failed to send custom SMS: ${error}`;
      options?.onError?.(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSending(false);
    }
  }, [options]);

  const sendBulkParcelUpdates = useCallback(async (
    parcels: Parcel[],
    notificationType: 'created' | 'dispatched' | 'delivered' | 'ready_for_pickup'
  ): Promise<SMSResponse[]> => {
    setIsSending(true);
    try {
      const allResults: ExtendedSMSResponse[] = [];

      for (const parcel of parcels) {
        try {
          const smsData = convertParcelToSMSData(parcel);

          const senderResult = await smsApi.sendParcelNotificationSMS(smsData, notificationType, 'sender');
          allResults.push({ ...senderResult, parcelId: parcel.id } as ExtendedSMSResponse);

          await new Promise(resolve => setTimeout(resolve, 500));

          const receiverResult = await smsApi.sendParcelNotificationSMS(smsData, notificationType, 'receiver');
          allResults.push({ ...receiverResult, parcelId: parcel.id } as ExtendedSMSResponse);

          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          allResults.push({
            status: 'error',
            message: `Failed to send notifications for parcel ${parcel.waybillNumber}: ${error}`,
            parcelId: parcel.id
          } as ExtendedSMSResponse);
        }
      }

      setLastResults(allResults);
      options?.onSuccess?.(allResults);
      return allResults;
    } catch (error) {
      const errorMessage = `Failed to send bulk parcel updates: ${error}`;
      options?.onError?.(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSending(false);
    }
  }, [convertParcelToSMSData, options]);

  const validateSMSConfig = useCallback(() => {
    return smsApi.validateConfig();
  }, []);

  const validatePhoneNumber = useCallback((phoneNumber: string): boolean => {
    return smsApi.validatePhoneNumber(phoneNumber);
  }, []);

  return {
    isSending,
    lastResults,
    sendParcelCreatedNotification,
    sendParcelDispatchedNotification,
    sendParcelDeliveredNotification,
    sendParcelStatusUpdate,
    sendCustomSMS,
    sendBulkParcelUpdates,
    validateSMSConfig,
    validatePhoneNumber
  };
};