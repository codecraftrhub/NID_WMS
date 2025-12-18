interface SMSApiConfig {
  SERVER: string;
  USER_ID: string;
  PASSWORD: string;
  SENDER_NAME: string;
}

interface SendSMSRequest {
  userid: string;
  password: string;
  mobile: string;
  senderid: string;
  msg: string;
  sendMethod: 'quick' | 'group' | 'bulkupload';
  msgType: 'text' | 'unicode';
  output: 'json' | 'plain' | 'xml';
  duplicatecheck: 'true' | 'false';
  test?: 'true' | 'false';
  scheduleTime?: string;
}

interface SMSResponse {
  status: string;
  message: string;
  msgId?: string;
  cost?: number;
  balance?: number;
}

interface ParcelSMSData {
  waybillNumber: string;
  senderPhone: string;
  receiverPhone: string;
  sender: string;
  receiver: string;
  destination: string;
  status: string;
}

class SMSApiService {
  private config: SMSApiConfig;

  constructor() {
    this.config = {
      SERVER: process.env.REACT_APP_SMS_SERVER || 'https://smsportal.hostpinnacle.co.ke/SMSApi',
      USER_ID: process.env.REACT_APP_SMS_USER_ID || 'nidlogistics1',
      PASSWORD: process.env.REACT_APP_SMS_PASSWORD || 'hqvu69ND',
      SENDER_NAME: process.env.REACT_APP_SMS_SENDER_NAME || 'NID_LOG_LTD'
    };
  }

  private createFormData(data: SendSMSRequest): FormData {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value);
      }
    });
    return formData;
  }

  async sendQuickSMS(
    phoneNumber: string,
    message: string,
    options?: {
      test?: boolean;
      scheduleTime?: string;
      msgType?: 'text' | 'unicode';
    }
  ): Promise<SMSResponse> {
    try {
      const requestData: SendSMSRequest = {
        userid: this.config.USER_ID,
        password: this.config.PASSWORD,
        mobile: this.cleanPhoneNumber(phoneNumber),
        senderid: this.config.SENDER_NAME,
        msg: message,
        sendMethod: 'quick',
        msgType: options?.msgType || 'text',
        output: 'json',
        duplicatecheck: 'true',
        ...(options?.test && { test: 'true' }),
        ...(options?.scheduleTime && { scheduleTime: options.scheduleTime })
      };

      const formData = this.createFormData(requestData);

      const response = await fetch(`${this.config.SERVER}/send`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw new Error(`Failed to send SMS: ${error}`);
    }
  }

  async sendBulkSMS(
    phoneNumbers: string[],
    message: string,
    options?: {
      test?: boolean;
      scheduleTime?: string;
      msgType?: 'text' | 'unicode';
    }
  ): Promise<SMSResponse[]> {
    const results: SMSResponse[] = [];
    
    for (const phoneNumber of phoneNumbers) {
      try {
        const result = await this.sendQuickSMS(phoneNumber, message, options);
        results.push(result);
        
        await this.delay(500);
      } catch (error) {
        results.push({
          status: 'error',
          message: `Failed to send to ${phoneNumber}: ${error}`
        });
      }
    }

    return results;
  }

  async sendParcelNotificationSMS(
    parcelData: ParcelSMSData,
    notificationType: 'created' | 'dispatched' | 'delivered' | 'ready_for_pickup',
    recipient: 'sender' | 'receiver'
  ): Promise<SMSResponse> {
    const phoneNumber = recipient === 'sender' ? parcelData.senderPhone : parcelData.receiverPhone;
    const recipientName = recipient === 'sender' ? parcelData.sender : parcelData.receiver;
    
    const message = this.generateParcelMessage(parcelData, notificationType, recipientName);
    
    return await this.sendQuickSMS(phoneNumber, message);
  }

  async sendParcelStatusUpdateSMS(
    parcelData: ParcelSMSData,
    newStatus: string,
    additionalInfo?: string
  ): Promise<SMSResponse[]> {
    const results: SMSResponse[] = [];
    
    const senderMessage = this.generateStatusUpdateMessage(parcelData, newStatus, parcelData.sender, 'sender', additionalInfo);
    const receiverMessage = this.generateStatusUpdateMessage(parcelData, newStatus, parcelData.receiver, 'receiver', additionalInfo);
    
    try {
      const senderResult = await this.sendQuickSMS(parcelData.senderPhone, senderMessage);
      results.push(senderResult);
      
      await this.delay(500);
      
      const receiverResult = await this.sendQuickSMS(parcelData.receiverPhone, receiverMessage);
      results.push(receiverResult);
    } catch (error) {
      console.error('Error sending status update SMS:', error);
      throw error;
    }
    
    return results;
  }

  private generateParcelMessage(
    parcelData: ParcelSMSData,
    notificationType: string,
    recipientName: string
  ): string {
    const greeting = `Dear ${recipientName},`;
    const closing = `Thank you for choosing NID Logistics Ltd.`;
    
    let mainMessage = '';
    
    switch (notificationType) {
      case 'created':
        mainMessage = `Your parcel (${parcelData.waybillNumber}) has been registered for delivery to ${parcelData.destination}. You will receive updates on its progress.`;
        break;
      
      case 'dispatched':
        mainMessage = `Your parcel (${parcelData.waybillNumber}) has been dispatched and is on its way to ${parcelData.destination}. Track your parcel for updates.`;
        break;
      
      case 'delivered':
        mainMessage = `Your parcel (${parcelData.waybillNumber}) has been successfully delivered to ${parcelData.destination}.`;
        break;
      
      case 'ready_for_pickup':
        mainMessage = `Your parcel (${parcelData.waybillNumber}) has arrived at ${parcelData.destination} and is ready for pickup. Please collect it at your earliest convenience.`;
        break;
      
      default:
        mainMessage = `Update on your parcel (${parcelData.waybillNumber}): Status changed to ${parcelData.status}.`;
    }
    
    return `${greeting} ${mainMessage} ${closing}`;
  }

  private generateStatusUpdateMessage(
    parcelData: ParcelSMSData,
    newStatus: string,
    recipientName: string,
    recipientType: 'sender' | 'receiver',
    additionalInfo?: string
  ): string {
    const greeting = `Dear ${recipientName},`;
    const closing = `Thank you for choosing NID Logistics Ltd.`;
    
    let mainMessage = '';
    
    switch (newStatus.toLowerCase()) {
      case 'pending':
        mainMessage = `Your parcel (${parcelData.waybillNumber}) is being processed`;
        break;
      case 'confirmed':
        mainMessage = `Your parcel (${parcelData.waybillNumber}) has been confirmed and is ready for dispatch`;
        break;
      case 'in_transit':
      case 'intransit':
        mainMessage = `Your parcel (${parcelData.waybillNumber}) is in transit to ${parcelData.destination}`;
        break;
      case 'delivered':
        mainMessage = `Your parcel (${parcelData.waybillNumber}) has been delivered`;
        if (recipientType === 'sender') {
          mainMessage += ` to ${parcelData.receiver} at ${parcelData.destination}`;
        }
        break;
      case 'cancelled':
        mainMessage = `Your parcel (${parcelData.waybillNumber}) has been cancelled`;
        break;
      default:
        mainMessage = `Your parcel (${parcelData.waybillNumber}) status has been updated to: ${newStatus}`;
    }

    if (additionalInfo) {
      mainMessage += `. ${additionalInfo}`;
    } else {
      mainMessage += `.`;
    }
    
    return `${greeting} ${mainMessage} ${closing}`;
  }

  private cleanPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
      cleaned = cleaned;
    } else if (cleaned.length === 9) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    const cleaned = this.cleanPhoneNumber(phoneNumber);
    return /^254\d{9}$/.test(cleaned);
  }

  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.config.USER_ID) {
      errors.push('SMS User ID is not configured');
    }
    
    if (!this.config.PASSWORD) {
      errors.push('SMS Password is not configured');
    }
    
    if (!this.config.SENDER_NAME) {
      errors.push('SMS Sender Name is not configured');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const smsApi = new SMSApiService();
export type { SMSResponse, ParcelSMSData };