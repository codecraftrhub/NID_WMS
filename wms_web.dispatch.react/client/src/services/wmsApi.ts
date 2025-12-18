// WMS API Service - uses the .NET Web API endpoints
import { useAuth } from '../context/AuthContext';
import { API_CONFIG, getAuthHeaders } from '../config/api';

// Use centralized API configuration
const API_BASE_URL = API_CONFIG.BASE_URL;


// Updated interfaces to match .NET API structure

export interface Parcel {
  id: string;
  createdAt: string;
  updatedAt?: string;
  waybillNumber: string;
  qrCode?: string;
  dispatchedAt?: string;
  dispatchTrackingCode?: string;
  createdById: number;
  sender: string;
  senderTelephone: string;
  receiver: string;
  receiverTelephone: string;
  destination: string;
  quantity: number;
  description: string;
  amount: number;
  rate: number;
  paymentMethods: string;
  totalAmount: number;
  totalRate: number;
  status: number; // 0=Pending, 1=Confirmed, 2=InTransit, 3=Delivered, 4=Cancelled
  createdBy?: any;
  // Payment tracking fields
  amountPaid?: number;
  transactionCode?: string;
  paymentUpdatedAt?: string;
  paymentUpdatedBy?: number;
}

export interface Dispatch {
  id: string;
  dispatchCode: string;
  destination: string;
  dispatchTime: string;
  sourceBranch: string;
  vehicleNumber: string;
  driver: string;
  driverPhone?: string;
  status: string;
  totalParcels?: number;
  totalAmount?: number;
  parcelIds: string[] | { $values: string[] };
  parcels?: Parcel[];
}

export interface CreateDispatchRequest {
  dispatchCode: string;
  sourceBranch: string;
  destination: string;
  vehicleNumber: string;
  driver: string;
  driverPhone?: string;
  parcelIds: string[];
}

export interface User {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  role?: {
    id: number;
    name: string;
  };
  branch?: {
    id: number;
    name: string;
  } | string;
  createdAt?: string;
  branchId?: number;
  roleId?: number;
  isActive?: boolean;
}

export interface ParcelDepositDto {
  id: number;
  parcelId: string;
  waybillNumber?: string;
  depositedAmount: number;
  expenses: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdById?: number;
  createdByName?: string;
  updatedById?: number;
  updatedByName?: string;
  remainingDebt: number;
  parcelTotalAmount: number;
  parcelSender?: string;
  parcelReceiver?: string;
  parcelDestination?: string;
}

export interface CreateParcelDepositDto {
  parcelId: string;
  depositedAmount: number;
  expenses: number;
  notes?: string;
  createdById?: number;
}

export interface UpdateParcelDepositDto {
  depositedAmount: number;
  expenses: number;
  notes?: string;
  updatedById?: number;
}

export interface ClerkCashInSummaryDto {
  clerkId: number;
  clerkName: string;
  clerkUsername: string;
  totalPaidAmount: number;
  totalDeposited: number;
  totalExpenses: number;
  remainingDebt: number;
  parcelCount: number;
  lastUpdateDate?: string;
}

export interface ContractCustomer {
  id: number;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  contractNumber?: string;
  paymentTerms: string;
  taxRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  apiUserId?: number;
  apiUsername?: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  contractCustomerId: number;
  customerId: number;
  customer?: ContractCustomer;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  createdById: number;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  parcelId: string;
  waybillNumber: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  destination: string;
  sender: string;
  receiver: string;
  createdAt: string;
}

export interface InvoicePayment {
  id: number;
  invoiceId: number;
  paymentDate: string;
  amount: number;
  paymentMethod: 'cash' | 'cheque' | 'bank_transfer' | 'mobile_money';
  chequeNumber?: string;
  bankReference?: string;
  notes?: string;
  recordedBy?: number;
  recordedByName?: string;
  createdAt: string;
}

export interface CreateInvoiceDto {
  contractCustomerId: number;
  issueDate: string;
  dueDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  notes?: string;
  createdById: number;
  parcelIds: string[];
}

export interface CreateInvoicePaymentDto {
  invoiceId: number;
  amount: number;
  paymentMethod: 'cash' | 'cheque' | 'bank_transfer' | 'mobile_money';
  paymentDate: string;
  chequeNumber?: string;
  bankReference?: string;
  notes?: string;
}

// COD Collection Management Types
export interface CODCollection {
  id: number;
  branchId: number;
  branchName: string;
  collectionDate: string;
  dispatchCode: string;
  driverName: string;
  vehicleNumber: string;
  totalCODAmount: number;
  depositedAmount: number;
  shortfall: number;
  parcelIds: string[];
  collectedBy: number;
  collectedByName?: string;
  depositedAt?: string;
  depositedBy?: number;
  depositedByName?: string;
  status: 'collected' | 'deposited' | 'reconciled' | 'shortfall';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCODCollectionDto {
  branchId: number;
  dispatchCode: string;
  driverName: string;
  vehicleNumber: string;
  totalCODAmount: number;
  parcelIds: string[];
  collectionDate?: string;
  notes?: string;
}

export interface UpdateCODCollectionDto {
  depositedAmount: number;
  depositedAt: string;
  notes?: string;
}

// Daily Expense Management Types
export interface DailyExpense {
  id: number;
  date: string;
  category: 'fuel' | 'casual_labor' | 'hired_cars' | 'maintenance' | 'office_supplies' | 'utilities' | 'transport' | 'other';
  description: string;
  amount: number;
  branchId?: number;
  branchName?: string;
  clerkId?: number;
  clerkName?: string;
  approvedBy?: number;
  approvedByName?: string;
  receiptNumber?: string;
  vendor?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdBy: number;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDailyExpenseDto {
  date: string;
  category: 'fuel' | 'casual_labor' | 'hired_cars' | 'maintenance' | 'office_supplies' | 'utilities' | 'transport' | 'other';
  description: string;
  amount: number;
  branchId?: number;
  clerkId?: number;
  branchName?: string;
  clerkName?: string;
  receiptNumber?: string;
  vendor?: string;
  notes?: string;
}

export interface ApproveExpenseDto {
  expenseId: number;
  approved: boolean;
  rejectionReason?: string;
  notes?: string;
}

export interface ExpensesSummary {
  totalExpenses: number;
  pendingExpenses: number;
  approvedExpenses: number;
  rejectedExpenses: number;
  monthlyTotal: number;
  categoryBreakdown: {
    category: string;
    amount: number;
    count: number;
  }[];
}

// Enhanced Clerk Cash Management Types
export interface EnhancedClerkCashSummary {
  id: number;
  clerkId: number;
  clerkName: string;
  clerkUsername: string;
  date: string;
  totalPaidAmount: number;
  depositedAmount: number;
  totalExpenses: number;
  netDebt: number;
  parcelCount: number;
  expenseCount: number;
  lastDepositDate?: string;
  status: 'pending' | 'deposited' | 'reconciled' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

export interface CreateClerkDepositDto {
  clerkId: number;
  depositAmount: number;
  depositDate: string;
  notes?: string;
}

// Cheque Management Types
export interface ChequeDeposit {
  id: number;
  chequeNumber: string;
  amount: number;
  bankName: string;
  accountNumber?: string;
  drawerName: string;
  depositDate: string;
  clearanceDate?: string;
  status: 'deposited' | 'cleared' | 'bounced' | 'cancelled';
  relatedInvoiceId?: number;
  relatedInvoiceNumber?: string;
  depositedBy: number;
  depositedByName?: string;
  bounceReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChequeDepositDto {
  chequeNumber: string;
  amount: number;
  bankName: string;
  accountNumber?: string;
  drawerName: string;
  depositDate: string;
  relatedInvoiceId?: number;
  notes?: string;
}

export interface UpdateChequeStatusDto {
  status: 'cleared' | 'bounced' | 'cancelled';
  clearanceDate?: string;
  bounceReason?: string;
  notes?: string;
}

class WMSApiService {
  private getHeaders(): Record<string, string> {
    // Use centralized auth headers from config
    return getAuthHeaders();
  }

  // Parcels API methods
  async getParcels(branchName?: string): Promise<Parcel[]> {
    try {
      let url = `${API_BASE_URL}/Parcels`;
      
      // Add branch filter if provided - API filters by destination using branchName parameter
      if (branchName) {
        url += `?branchName=${encodeURIComponent(branchName)}`;
      }
      
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch parcels: ${response.status}`);
      }

      const rawData = await response.json();

      // Handle the { "$id": ..., "$values": [...] } format
      if (typeof rawData === 'object' && rawData !== null && '$values' in rawData && Array.isArray(rawData.$values)) {
        return rawData.$values;
      } else if (Array.isArray(rawData)) {
        return rawData;
      } else {
        return [];
      }
    } catch (error) {
      throw new Error(`Failed to connect to WMS API: ${error}`);
    }
  }

  async getParcelById(parcelId: string): Promise<Parcel | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/Parcels/${parcelId}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch parcel: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getParcelByWaybill(waybillNumber: string): Promise<Parcel | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/Parcels/waybill/${waybillNumber}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch parcel by waybill: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getParcelsByIds(parcelIds: string[]): Promise<Parcel[]> {
    try {
      if (parcelIds.length === 0) {
        return [];
      }

      
      // For better performance, fetch parcels in parallel chunks
      const CHUNK_SIZE = 10; // Adjust based on server capabilities
      const chunks: string[][] = [];
      
      for (let i = 0; i < parcelIds.length; i += CHUNK_SIZE) {
        chunks.push(parcelIds.slice(i, i + CHUNK_SIZE));
      }

      const allParcels: Parcel[] = [];
      
      // Process chunks in parallel
      const chunkPromises = chunks.map(async (chunk) => {
        const parcelsInChunk = await Promise.all(
          chunk.map(async (parcelId) => {
            try {
              const parcel = await this.getParcelById(parcelId);
              return parcel;
            } catch (error) {
              return null;
            }
          })
        );
        
        // Filter out null results
        return parcelsInChunk.filter((parcel): parcel is Parcel => parcel !== null);
      });

      const chunkResults = await Promise.all(chunkPromises);
      
      // Flatten all results
      chunkResults.forEach(parcels => {
        allParcels.push(...parcels);
      });

      return allParcels;
    } catch (error) {
      throw error;
    }
  }

  async getParcelsForDispatch(destination?: string, statuses?: string[]): Promise<Parcel[]> {
    try {
      const url = `${API_BASE_URL}/Parcels/dispatch`;
      const params = new URLSearchParams();
      
      if (destination) {
        params.append('destination', destination);
      }
      
      if (statuses && statuses.length > 0) {
        params.append('statuses', statuses.join(','));
      }

      const response = await fetch(`${url}?${params}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch parcels for dispatch: ${response.status}`);
      }

      const data = await response.json();
      return data.$values || data;
    } catch (error) {
      throw error;
    }
  }

  async getParcelsForDispatchByBranch(userBranchId?: number): Promise<Parcel[]> {
    try {
      // Get all parcels first
      const allParcels = await this.getParcels();
      
      // Filter by status: Only Pending (0) or Confirmed (1)
      const validStatuses = [0, 1];
      let filteredParcels = allParcels.filter(parcel => validStatuses.includes(parcel.status));
      
      // If user has a branch, filter by creator's branch
      if (userBranchId) {
        // Get all users to map createdById to user branches
        const users = await this.getUsers();
        
        // Filter parcels to only show those created by users from the same branch
        filteredParcels = filteredParcels.filter(parcel => {
          if (!parcel.createdById) return false;
          
          const creator = users.find(user => user.id === parcel.createdById);
          return creator && creator.branchId === userBranchId;
        });
        
        console.log(`getParcelsForDispatchByBranch - Branch ${userBranchId}: ${filteredParcels.length} parcels found`);
        console.log(`getParcelsForDispatchByBranch - Sample creators:`, 
          filteredParcels.slice(0, 3).map(p => {
            const creator = users.find(u => u.id === p.createdById);
            return { 
              parcelId: p.id, 
              createdById: p.createdById, 
              creatorBranch: creator?.branchId,
              creatorName: creator?.username 
            };
          })
        );
      }
      
      // Populate creator information for display
      try {
        const users = await this.getUsers();
        const updatedParcels = filteredParcels.map(parcel => {
          if (!parcel.createdBy && parcel.createdById) {
            const creator = users.find(u => u.id === parcel.createdById);
            if (creator) {
              return { 
                ...parcel, 
                createdBy: { 
                  username: creator.firstName && creator.lastName 
                    ? `${creator.firstName} ${creator.lastName}` 
                    : creator.username 
                } 
              };
            }
          }
          return parcel;
        });
        
        return updatedParcels;
      } catch (userErr) {
        // If user fetching fails, return parcels without creator info
        return filteredParcels;
      }
    } catch (error) {
      console.error('getParcelsForDispatchByBranch - Error:', error);
      throw error;
    }
  }

  async getPendingParcels(dateFilter?: string, branch?: string): Promise<Parcel[]> {
    try {
      const url = `${API_BASE_URL}/parcels/pending`;
      const params = new URLSearchParams();
      if (branch) {
        params.append('branchName', branch);
      }

      const response = await fetch(`${url}?${params}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pending parcels: ${response.status}`);
      }

      const data = await response.json();
      let parcels = data.$values || data;

      if (dateFilter) {
        // Filter parcels by date on the client side
        parcels = parcels.filter((parcel: Parcel) => {
          if (parcel.createdAt) {
            try {
              const parcelDate = new Date(parcel.createdAt.replace('Z', '+00:00'));
              return parcelDate.toISOString().split('T')[0] === dateFilter;
            } catch (error) {
              return false;
            }
          }
          return false;
        });
      }

      return parcels;
    } catch (error) {
      throw error;
    }
  }

  async updateParcel(parcelId: string, parcelData: Partial<Parcel>): Promise<boolean> {
    try {
      // Clean up the data
      const cleanedData = Object.fromEntries(
        Object.entries(parcelData).filter(([_, value]) => value !== null)
      );

      const response = await fetch(`${API_BASE_URL}/parcels/${parcelId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(cleanedData),
      });

      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  async updateParcelPayment(parcelId: string, paymentData: {
    amountPaid: number;
    transactionCode: string;
    updatedById?: number;
  }): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/parcels/${parcelId}/payment`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          amountPaid: paymentData.amountPaid,
          transactionCode: paymentData.transactionCode,
          updatedById: paymentData.updatedById
        }),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating parcel payment:', error);
      return false;
    }
  }

  async updateParcelStatus(parcelId: string, status: number): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/parcels/${parcelId}/status`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ Status: status }),
      });

      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  async deleteParcel(parcelId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/parcels/${parcelId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  // Helper method to normalize parcelIds structure
  private normalizeParcelIds(parcelIds: string[] | { $values: string[] } | undefined): string[] {
    if (!parcelIds) return [];
    if (Array.isArray(parcelIds)) return parcelIds;
    if (typeof parcelIds === 'object' && parcelIds.$values && Array.isArray(parcelIds.$values)) {
      return parcelIds.$values;
    }
    return [];
  }

  // Dispatches API methods
  async getDispatches(branchName?: string): Promise<Dispatch[]> {
    try {
      let url = `${API_BASE_URL}/Dispatches`;
      
      // Add branch filter if provided - use the dedicated branch endpoint
      if (branchName) {
        url = `${API_BASE_URL}/Dispatches/branch/${encodeURIComponent(branchName)}`;
      }
      
      console.log('getDispatches API call:', { branchName, url });
      
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      console.log('getDispatches API response:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('getDispatches API error:', errorText);
        throw new Error(`Failed to fetch dispatches: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const dispatches = data.$values || data;
      
      // Normalize parcelIds structure for all dispatches
      const normalizedDispatches = dispatches.map((dispatch: Dispatch) => ({
        ...dispatch,
        parcelIds: this.normalizeParcelIds(dispatch.parcelIds)
      }));
      
      return normalizedDispatches;
    } catch (error) {
      throw error;
    }
  }

  async getDispatchById(dispatchId: string): Promise<Dispatch | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/Dispatches/${dispatchId}/note`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch dispatch: ${response.status}`);
      }

      const data = await response.json();
      const dispatch = data.$values || data;
      
      // Normalize parcelIds structure
      if (dispatch) {
        return {
          ...dispatch,
          parcelIds: this.normalizeParcelIds(dispatch.parcelIds)
        };
      }
      
      return dispatch;
    } catch (error) {
      throw error;
    }
  }

  async createDispatch(dispatchData: {
    dispatchCode: string;
    sourceBranch: string;
    destination: string;
    driver_name: string;
    vehicle_registration: string;
    parcel_ids: string[];
  }): Promise<Dispatch | null> {
    try {
      // Debug: Log input data
      
      // Use the .NET API structure for creating dispatch
      const createDispatchRequest = {
        dispatchCode: dispatchData.dispatchCode,
        sourceBranch: dispatchData.sourceBranch,
        destination: dispatchData.destination,
        vehicleNumber: dispatchData.vehicle_registration,
        driver: dispatchData.driver_name,
        parcelIds: dispatchData.parcel_ids
      };

      // Debug: Log the request payload being sent to API

      const response = await fetch(`${API_BASE_URL}/Dispatches/create`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(createDispatchRequest),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT * 2), // Double timeout for create operations
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create dispatch: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // Users API methods
  async getUserById(userId: number): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/Users/${userId}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch user: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      // Use the main /Users endpoint which we know returns complete data with branches
      const response = await fetch(`${API_BASE_URL}/Users`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();
      console.log('getUsers - Raw API response:', data);
      
      // Handle the $values format
      const users = data.$values || data;
      console.log('getUsers - Users array:', users);

      // Transform API data to match our User interface
      const transformedUsers = users.map((user: any) => {
        const transformedUser = {
          id: user.id, // Use lowercase id from API
          username: user.username || '',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.role?.name ? [user.role.name] : ['User'],
          role: user.role ? {
            id: user.role.id,
            name: user.role.name
          } : { id: 0, name: 'User' },
          branch: user.branch ? {
            id: user.branch.id,
            name: user.branch.name
          } : undefined,
          branchId: user.branch?.id,
          roleId: user.role?.id,
          createdAt: user.createdAt,
          isActive: user.isActive !== undefined ? user.isActive : true // Use backend isActive value
        };
        
        console.log(`getUsers - Transformed user ${user.id}:`, transformedUser);
        return transformedUser;
      });

      return transformedUsers;
    } catch (error) {
      console.error('getUsers - Error:', error);
      throw error;
    }
  }

  async createUser(userData: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    roleId: number;
    branchId?: number;
  }): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/Users`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(userData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create user: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async updateUser(userId: number, userData: {
    id?: number;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    roleId?: number;
    branchId?: number;
    isActive?: boolean;
  }): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/Users/${userId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(userData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update user: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  async changeUserPassword(userId: number, newPassword: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/Users/${userId}/change-password`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ newPassword }),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to change password: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(userId: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/Users/${userId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete user: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  async activateUser(userId: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/Users/${userId}/activate`, {
        method: 'PUT',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to activate user: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  async deactivateUser(userId: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/Users/${userId}/deactivate`, {
        method: 'PUT',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to deactivate user: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  // Branches API methods
  async getBranches(): Promise<{ id: number; name: string; address?: string; phone?: string; email?: string }[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/Branches`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch branches: ${response.status}`);
      }

      const data = await response.json();
      return data.$values || data;
    } catch (error) {
      throw error;
    }
  }

  // Analytics methods
  async getParcelCountForDate(date: Date, branch?: string): Promise<number> {
    try {
      const params = new URLSearchParams();
      params.append('date', date.toISOString().split('T')[0]);
      if (branch) {
        params.append('branchName', branch);
      }

      const response = await fetch(`${API_BASE_URL}/Parcels/count?${params}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      return 0;
    }
  }

  async getTotalSalesForDate(date: Date, branch?: string): Promise<number> {
    try {
      const params = new URLSearchParams();
      params.append('date', date.toISOString().split('T')[0]);
      if (branch) {
        params.append('branchName', branch);
      }

      const response = await fetch(`${API_BASE_URL}/Parcels/sales?${params}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return data.totalSales || 0;
    } catch (error) {
      return 0;
    }
  }

  // Contract Customers API methods
  async getContractCustomers(): Promise<ContractCustomer[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/ContractCustomers`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch contract customers: ${response.status}`);
      }

      const data = await response.json();
      return data.$values || data;
    } catch (error) {
      console.error('Error fetching contract customers:', error);
      throw error;
    }
  }


  async createContractCustomer(customer: Omit<ContractCustomer, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContractCustomer> {
    try {
      console.log('Creating contract customer with data:', customer);
      
      const response = await fetch(`${API_BASE_URL}/ContractCustomers`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customer),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to create contract customer: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Create contract customer error:', error);
      throw error;
    }
  }

  async updateContractCustomer(id: number, customer: Partial<ContractCustomer>): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/ContractCustomers/${id}`, {
        method: 'PUT',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customer),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to update contract customer: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  async deleteContractCustomer(id: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/ContractCustomers/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete contract customer: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  // Invoice API methods
  async getInvoices(): Promise<Invoice[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/Invoices`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch invoices: ${response.status}`);
      }

      const data = await response.json();
      const invoices = data.$values || data;
      
      // Transform nested items structure
      return invoices.map((invoice: any) => ({
        ...invoice,
        items: invoice.items?.$values || invoice.items || []
      }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }


  async getInvoiceById(invoiceId: number): Promise<Invoice | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/Invoices/${invoiceId}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch invoice: ${response.status}`);
      }

      const invoice = await response.json();
      
      // Transform nested items structure
      return {
        ...invoice,
        items: invoice.items?.$values || invoice.items || []
      };
    } catch (error) {
      throw error;
    }
  }

  async createInvoice(invoiceData: CreateInvoiceDto): Promise<Invoice> {
    try {
      const response = await fetch(`${API_BASE_URL}/Invoices`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to create invoice: ${response.status}`);
      }

      const invoice = await response.json();
      
      // Transform nested items structure
      return {
        ...invoice,
        items: invoice.items?.$values || invoice.items || []
      };
    } catch (error) {
      throw error;
    }
  }

  async addInvoicePayment(paymentData: CreateInvoicePaymentDto): Promise<InvoicePayment> {
    try {
      const response = await fetch(`${API_BASE_URL}/Invoices/payments`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to add invoice payment: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async recordInvoicePayment(invoiceId: number, paymentData: {
    amount: number;
    paymentMethod: 'cash' | 'cheque' | 'bank_transfer' | 'mobile_money';
    paymentDate: string;
    paymentReference?: string;
    notes?: string;
  }): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/Invoices/${invoiceId}/payment`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: paymentData.amount,
          paymentDate: paymentData.paymentDate,
          paymentMethod: paymentData.paymentMethod,
          paymentReference: paymentData.paymentReference,
          notes: paymentData.notes
        }),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to record payment: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  }

  async getUnbilledParcelsForCustomer(contractCustomerId: number, startDate?: string, endDate?: string): Promise<Parcel[]> {
    try {
      const params = new URLSearchParams();
      params.append('contractCustomerId', contractCustomerId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`${API_BASE_URL}/Invoices/unbilled-parcels?${params}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch unbilled parcels: ${response.status}`);
      }

      const data = await response.json();
      return data.$values || data;
    } catch (error) {
      throw error;
    }
  }

  // COD Collection API methods
  async getCODCollections(branchId?: number, startDate?: string, endDate?: string): Promise<CODCollection[]> {
    try {
      const params = new URLSearchParams();
      if (branchId) params.append('branchId', branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`${API_BASE_URL}/Payments/cod-collections?${params}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch COD collections: ${response.status}`);
      }

      const data = await response.json();
      return data.$values || data;
    } catch (error) {
      console.error('Error fetching COD collections:', error);
      throw error;
    }
  }


  async createCODCollection(collectionData: CreateCODCollectionDto): Promise<CODCollection> {
    try {
      const response = await fetch(`${API_BASE_URL}/Payments/cod-collections`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to create COD collection: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async updateCODCollection(collectionId: number, updateData: UpdateCODCollectionDto): Promise<CODCollection> {
    try {
      const response = await fetch(`${API_BASE_URL}/Payments/cod-collections/${collectionId}`, {
        method: 'PUT',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to update COD collection: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // Daily Expenses API methods
  async getDailyExpenses(branchId?: number, startDate?: string, endDate?: string, status?: string): Promise<DailyExpense[]> {
    try {
      const params = new URLSearchParams();
      if (branchId) params.append('branchId', branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (status) params.append('status', status);

      const response = await fetch(`${API_BASE_URL}/Expenses?${params}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch daily expenses: ${response.status}`);
      }

      const data = await response.json();
      return data.$values || data;
    } catch (error) {
      console.error('Error fetching daily expenses:', error);
      throw error;
    }
  }


  async createDailyExpense(expenseData: CreateDailyExpenseDto): Promise<DailyExpense> {
    try {
      console.log('API: Creating expense with data:', expenseData);
      
      const response = await fetch(`${API_BASE_URL}/Expenses`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to create daily expense: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async approveExpense(approvalData: ApproveExpenseDto): Promise<DailyExpense> {
    try {
      const response = await fetch(`${API_BASE_URL}/Expenses/approve`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to approve expense: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getExpensesSummary(): Promise<ExpensesSummary> {
    try {
      const response = await fetch(`${API_BASE_URL}/Expenses/summary`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch expenses summary: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching expenses summary:', error);
      throw error;
    }
  }

  // Enhanced Clerk Cash Management API methods
  async getEnhancedClerkCashSummaries(clerkId?: number, startDate?: string, endDate?: string): Promise<EnhancedClerkCashSummary[]> {
    try {
      const params = new URLSearchParams();
      if (clerkId) params.append('clerkId', clerkId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`${API_BASE_URL}/ClerkCashSummaries/enhanced?${params}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch enhanced clerk cash summaries: ${response.status}`);
      }

      const data = await response.json();
      return data.$values || data;
    } catch (error) {
      throw error;
    }
  }

  async createClerkDeposit(depositData: CreateClerkDepositDto): Promise<EnhancedClerkCashSummary> {
    try {
      const response = await fetch(`${API_BASE_URL}/ClerkCashSummaries/deposit`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(depositData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to create clerk deposit: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // Cheque Management API methods
  async getChequeDeposits(status?: string, startDate?: string, endDate?: string): Promise<ChequeDeposit[]> {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`${API_BASE_URL}/Payments/cheque-deposits?${params}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        console.warn('ChequeDeposits endpoint not implemented, returning mock data');
        return this.getMockChequeDeposits();
      }

      const data = await response.json();
      return data.$values || data;
    } catch (error) {
      console.warn('ChequeDeposits endpoint error, returning mock data:', error);
      return this.getMockChequeDeposits();
    }
  }

  private getMockChequeDeposits(): ChequeDeposit[] {
    return [
      {
        id: 1,
        chequeNumber: 'CHQ-001-2024',
        amount: 500000,
        bankName: 'Stanbic Bank',
        accountNumber: '9040012345678',
        drawerName: 'ABC Trading Ltd',
        depositDate: '2024-11-20',
        clearanceDate: '2024-11-22',
        status: 'cleared' as const,
        relatedInvoiceId: 1,
        relatedInvoiceNumber: 'INV-2024-001',
        depositedBy: 1,
        depositedByName: 'Finance Officer',
        createdAt: '2024-11-20T10:00:00Z',
        updatedAt: '2024-11-22T14:00:00Z'
      },
      {
        id: 2,
        chequeNumber: 'CHQ-002-2024',
        amount: 350000,
        bankName: 'Centenary Bank',
        accountNumber: '3100045678901',
        drawerName: 'XYZ Logistics',
        depositDate: '2024-11-23',
        status: 'deposited' as const,
        relatedInvoiceId: 2,
        relatedInvoiceNumber: 'INV-2024-002',
        depositedBy: 1,
        depositedByName: 'Finance Officer',
        notes: 'Awaiting clearance',
        createdAt: '2024-11-23T11:00:00Z',
        updatedAt: '2024-11-23T11:00:00Z'
      },
      {
        id: 3,
        chequeNumber: 'CHQ-003-2024',
        amount: 200000,
        bankName: 'DFCU Bank',
        accountNumber: '1234567890123',
        drawerName: 'LMN Enterprises',
        depositDate: '2024-11-18',
        status: 'bounced' as const,
        depositedBy: 1,
        depositedByName: 'Finance Officer',
        bounceReason: 'Insufficient funds',
        notes: 'Customer contacted for payment',
        createdAt: '2024-11-18T09:00:00Z',
        updatedAt: '2024-11-20T15:00:00Z'
      }
    ];
  }

  async createChequeDeposit(chequeData: CreateChequeDepositDto): Promise<ChequeDeposit> {
    try {
      const response = await fetch(`${API_BASE_URL}/Payments/cheque-deposits`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chequeData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to create cheque deposit: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async updateChequeStatus(chequeId: number, statusData: UpdateChequeStatusDto): Promise<ChequeDeposit> {
    try {
      const response = await fetch(`${API_BASE_URL}/Payments/cheque-deposits/${chequeId}/status`, {
        method: 'PUT',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statusData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to update cheque status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // Helper method to get branch-specific data based on user role
  async getBranchSpecificData<T>(
    fetchFunction: (branchName?: string) => Promise<T>,
    userBranch?: string
  ): Promise<T> {
    // If user has a branch (branch manager), filter by branch
    // If user is admin, get all data
    return await fetchFunction(userBranch);
  }

  // Branch Sales Analytics Methods
  async getBranchSalesData(startDate?: string, endDate?: string): Promise<{
    branchId: number;
    branchName: string;
    totalSales: number;
    totalParcels: number;
    avgSaleValue: number;
  }[]> {
    try {
      const [branches, parcels] = await Promise.all([
        this.getBranches(),
        this.getParcels()
      ]);

      // Filter parcels by date range if provided
      const filteredParcels = parcels.filter(parcel => {
        if (!parcel.createdAt) return false;
        
        if (startDate && endDate) {
          const parcelDate = new Date(parcel.createdAt);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return parcelDate >= start && parcelDate <= end;
        }
        return true;
      });

      return branches.map(branch => {
        // Get parcels that are being sent TO this branch (destination-based)
        // Match parcels where the destination matches the branch name
        const branchParcels = filteredParcels.filter(parcel => {
          // Check if parcel destination matches branch name (case-insensitive)
          return parcel.destination && 
                 parcel.destination.toLowerCase().includes(branch.name.toLowerCase());
        });

        const totalSales = branchParcels.reduce((sum, parcel) => sum + (parcel.totalAmount || 0), 0);
        const totalParcels = branchParcels.length;

        return {
          branchId: branch.id,
          branchName: branch.name,
          totalSales,
          totalParcels,
          avgSaleValue: totalParcels > 0 ? totalSales / totalParcels : 0
        };
      });
    } catch (error) {
      console.error('Error getting branch sales data:', error);
      throw error;
    }
  }

  async getDailySalesByBranch(date?: string): Promise<{
    branchId: number;
    branchName: string;
    dailySales: number;
    dailyParcels: number;
  }[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const salesData = await this.getBranchSalesData(targetDate, targetDate);
    
    return salesData.map(branch => ({
      branchId: branch.branchId,
      branchName: branch.branchName,
      dailySales: branch.totalSales,
      dailyParcels: branch.totalParcels
    }));
  }

  async getMonthlySalesByBranch(year?: number, month?: number): Promise<{
    branchId: number;
    branchName: string;
    monthlySales: number;
    monthlyParcels: number;
  }[]> {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth();

    const startDate = new Date(targetYear, targetMonth, 1).toISOString().split('T')[0];
    const endDate = new Date(targetYear, targetMonth + 1, 0).toISOString().split('T')[0];

    const salesData = await this.getBranchSalesData(startDate, endDate);
    
    return salesData.map(branch => ({
      branchId: branch.branchId,
      branchName: branch.branchName,
      monthlySales: branch.totalSales,
      monthlyParcels: branch.totalParcels
    }));
  }

  // Branch Deposits API methods
  async getBranchDeposits(branch?: string, startDate?: string, endDate?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (branch) params.append('branch', branch);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      // Add cache busting parameter
      params.append('_t', Date.now().toString());

      const url = `${API_BASE_URL}/BranchDeposits${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: {
          ...this.getHeaders(),
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch branch deposits: ${response.status}`);
      }

      const data = await response.json();
      return data.$values || data;
    } catch (error) {
      throw error;
    }
  }

  async createBranchDeposit(depositData: {
    branch: string;
    date: string;
    codTotal: number;
    depositAmount: number;
  }): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/BranchDeposits`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(depositData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create branch deposit: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async updateBranchDeposit(depositId: number, depositAmount: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/BranchDeposits/${depositId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ depositAmount }),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update branch deposit: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      throw error;
    }
  }

  async deleteBranchDeposit(depositId: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/BranchDeposits/${depositId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete branch deposit: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      throw error;
    }
  }

  // ParcelDeposit API methods
  async getParcelDeposits(date?: string, clerkId?: number, destination?: string): Promise<ParcelDepositDto[]> {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (clerkId) params.append('clerkId', clerkId.toString());
      if (destination) params.append('destination', destination);

      const url = `${API_BASE_URL}/ParcelDeposits${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch parcel deposits: ${response.status}`);
      }

      const data = await response.json();
      return data.$values || data;
    } catch (error) {
      throw error;
    }
  }

  async getParcelDepositById(id: number): Promise<ParcelDepositDto | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/ParcelDeposits/${id}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch parcel deposit: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getParcelDepositByParcelId(parcelId: string): Promise<ParcelDepositDto | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/ParcelDeposits/parcel/${parcelId}`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch parcel deposit: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async getClerkCashInSummary(date?: string, destination?: string): Promise<ClerkCashInSummaryDto[]> {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (destination) params.append('destination', destination);

      const url = `${API_BASE_URL}/ParcelDeposits/clerk-summary${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch clerk cash-in summary: ${response.status}`);
      }

      const data = await response.json();
      return data.$values || data;
    } catch (error) {
      throw error;
    }
  }

  async createParcelDeposit(depositData: CreateParcelDepositDto): Promise<ParcelDepositDto> {
    try {
      const response = await fetch(`${API_BASE_URL}/ParcelDeposits`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(depositData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create parcel deposit: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async updateParcelDeposit(id: number, depositData: UpdateParcelDepositDto): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/ParcelDeposits/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(depositData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update parcel deposit: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      throw error;
    }
  }

  async updateOrCreateParcelDeposit(parcelId: string, depositData: UpdateParcelDepositDto): Promise<ParcelDepositDto> {
    try {
      const response = await fetch(`${API_BASE_URL}/ParcelDeposits/parcel/${parcelId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(depositData),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update or create parcel deposit: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async deleteParcelDeposit(id: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/ParcelDeposits/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete parcel deposit: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      throw error;
    }
  }
}

// Export a singleton instance
export const wmsApi = new WMSApiService();

// Hook for using the WMS API service with authentication context
export const useWMSApi = () => {
  const { user, token } = useAuth();

  return {
    api: wmsApi,
    user,
    token,
    isAuthenticated: !!user && !!token,
  };
};
