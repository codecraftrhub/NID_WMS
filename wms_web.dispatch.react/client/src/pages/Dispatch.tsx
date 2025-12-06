import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Package, 
  User, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Search,
  Filter,
  Eye,
  Printer,
  DollarSign,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Table, FilterPanel, FilterField } from '../components/ui';
import { VirtualScrollTable } from '../components/VirtualScrollTable';
import { wmsApi, type Dispatch, Parcel } from '../services/wmsApi';

interface DispatchFilterState {
  search: string;
  status: string;
  destination: string;
  driver: string;
  vehicleNumber: string;
  dateRange: { from: string; to: string };
}

interface EnhancedDispatch extends Omit<Dispatch, 'parcelIds'> {
  parcelIds: string[]; // Always normalized to array in UI
  totalWeight?: number;
  totalAmount?: number;
  totalParcels?: number;
}

interface EnhancedParcel extends Parcel {
  createdByDisplayName?: string;
}

const DispatchList: React.FC = () => {
  const { user, isAdmin, isBranchManager } = useAuth();
  const [dispatches, setDispatches] = useState<EnhancedDispatch[]>([]);
  const [filteredDispatches, setFilteredDispatches] = useState<EnhancedDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userCache, setUserCache] = useState<Map<number, string>>(new Map());
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<DispatchFilterState>({
    search: '',
    status: '',
    destination: '',
    driver: '',
    vehicleNumber: '',
    dateRange: { from: '', to: '' }
  });

  useEffect(() => {
    fetchDispatches();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [dispatches, filters]);

  const fetchDispatches = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      // Determine if we should filter by branch
      const branchName = isBranchManager() && user?.branch?.name ? user.branch.name : undefined;
      
      const data = await wmsApi.getDispatches(branchName);
      
      
      // For each dispatch, fetch parcel details to calculate totals
      const dispatchesWithTotals = await Promise.all(
        data.map(async (dispatch): Promise<EnhancedDispatch> => {
          // Cast to EnhancedDispatch since API service normalizes parcelIds
          const enhancedDispatch = dispatch as EnhancedDispatch;
          
          
          if (enhancedDispatch.parcelIds && enhancedDispatch.parcelIds.length > 0) {
            try {
              const parcels: EnhancedParcel[] = [];
              
              for (const parcelId of enhancedDispatch.parcelIds) {
                const parcel = await wmsApi.getParcelById(parcelId);
                if (parcel) {
                  
                  const enhancedParcel: EnhancedParcel = {
                    ...parcel,
                    createdByDisplayName: await getUserDisplayName(parcel.createdById)
                  };
                  parcels.push(enhancedParcel);
                } else {
                }
              }
              
              const totalAmount = parcels.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
              const totalWeight = parcels.reduce((sum, p) => sum + (p.quantity || 0), 0);
              
              return {
                ...enhancedDispatch,
                parcels,
                totalParcels: parcels.length,
                totalAmount,
                totalWeight
              };
            } catch (err) {
              return enhancedDispatch;
            }
          }
          
          return enhancedDispatch;
        })
      );
      
      setDispatches(dispatchesWithTotals);
    } catch (err) {
      setError('Failed to load dispatches');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = dispatches;

    // Apply filters
    if (filters.search) {
      filtered = filtered.filter(dispatch =>
        dispatch.dispatchCode.toLowerCase().includes(filters.search.toLowerCase()) ||
        dispatch.driver.toLowerCase().includes(filters.search.toLowerCase()) ||
        dispatch.vehicleNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
        dispatch.destination.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(dispatch => dispatch.status === filters.status);
    }

    if (filters.destination) {
      filtered = filtered.filter(dispatch =>
        dispatch.destination.toLowerCase().includes(filters.destination.toLowerCase())
      );
    }

    if (filters.driver) {
      filtered = filtered.filter(dispatch =>
        dispatch.driver.toLowerCase().includes(filters.driver.toLowerCase())
      );
    }

    if (filters.vehicleNumber) {
      filtered = filtered.filter(dispatch =>
        dispatch.vehicleNumber.toLowerCase().includes(filters.vehicleNumber.toLowerCase())
      );
    }

    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter(dispatch => {
        const dispatchDate = new Date(dispatch.dispatchTime);
        const fromDate = filters.dateRange.from ? new Date(filters.dateRange.from) : null;
        const toDate = filters.dateRange.to ? new Date(filters.dateRange.to) : null;
        
        return (!fromDate || dispatchDate >= fromDate) && (!toDate || dispatchDate <= toDate);
      });
    }

    setFilteredDispatches(filtered);
  };

  const handleFilterChange = (key: string, value: string | { from: string; to: string }) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      destination: '',
      driver: '',
      vehicleNumber: '',
      dateRange: { from: '', to: '' }
    });
  };

  const getActiveFilterChips = () => {
    const chips: any[] = [];

    if (filters.search) {
      chips.push({
        key: 'search',
        label: 'Search',
        value: filters.search,
        onRemove: () => handleFilterChange('search', '')
      });
    }

    if (filters.status) {
      chips.push({
        key: 'status',
        label: 'Status',
        value: filters.status,
        onRemove: () => handleFilterChange('status', '')
      });
    }

    if (filters.destination) {
      chips.push({
        key: 'destination',
        label: 'Destination',
        value: filters.destination,
        onRemove: () => handleFilterChange('destination', '')
      });
    }

    if (filters.driver) {
      chips.push({
        key: 'driver',
        label: 'Driver',
        value: filters.driver,
        onRemove: () => handleFilterChange('driver', '')
      });
    }

    if (filters.vehicleNumber) {
      chips.push({
        key: 'vehicleNumber',
        label: 'Vehicle',
        value: filters.vehicleNumber,
        onRemove: () => handleFilterChange('vehicleNumber', '')
      });
    }

    if (filters.dateRange.from || filters.dateRange.to) {
      const rangeValue = `${filters.dateRange.from || 'Start'} - ${filters.dateRange.to || 'End'}`;
      chips.push({
        key: 'dateRange',
        label: 'Date Range',
        value: rangeValue,
        onRemove: () => handleFilterChange('dateRange', { from: '', to: '' })
      });
    }

    return chips;
  };

  const filterFields: FilterField[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Search by dispatch code, driver, vehicle, or destination',
      icon: <Search className="w-4 h-4" />
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'Select status',
      icon: <CheckCircle className="w-4 h-4" />,
      options: [
        { value: '', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'in_transit', label: 'In Transit' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    },
    {
      key: 'destination',
      label: 'Destination',
      type: 'text',
      placeholder: 'Filter by destination',
      icon: <MapPin className="w-4 h-4" />
    },
    {
      key: 'driver',
      label: 'Driver',
      type: 'text',
      placeholder: 'Filter by driver name',
      icon: <User className="w-4 h-4" />
    },
    {
      key: 'vehicleNumber',
      label: 'Vehicle Number',
      type: 'text',
      placeholder: 'Filter by vehicle number',
      icon: <Truck className="w-4 h-4" />
    },
    {
      key: 'dateRange',
      label: 'Dispatch Date Range',
      type: 'dateRange',
      placeholder: 'Select date range',
      icon: <Calendar className="w-4 h-4" />
    }
  ];

  const handleViewDispatch = (dispatch: EnhancedDispatch) => {
    // This will navigate to the dispatch details page
    window.location.href = `/dispatches/view?id=${dispatch.id}`;
  };

  const handlePrintDispatchNote = async (dispatch: EnhancedDispatch) => {
    try {
      // Use the parcels from the dispatch object if available, or fetch them with user info
      let parcels: EnhancedParcel[] = [];
      
      if (dispatch.parcels && dispatch.parcels.length > 0) {
        // Enhance existing parcels with user display names
        for (const parcel of dispatch.parcels) {
          const enhancedParcel: EnhancedParcel = {
            ...parcel,
            createdByDisplayName: await getUserDisplayName(parcel.createdById)
          };
          parcels.push(enhancedParcel);
        }
      }
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const eatDateTime = formatDateTime(dispatch.dispatchTime);
        printWindow.document.write(`
          <html>
            <head>
              <title>Dispatch Note - ${dispatch.dispatchCode}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  padding: 20px; 
                  margin: 0;
                  font-size: 12px;
                }
                .header { 
                  text-align: center; 
                  margin-bottom: 20px; 
                  border-bottom: 2px solid #000;
                  padding-bottom: 15px;
                }
                .header h1 {
                  margin: 0;
                  font-size: 18px;
                  font-weight: bold;
                }
                .header h2 {
                  margin: 5px 0 0 0;
                  font-size: 14px;
                  color: #666;
                }
                .info-grid { 
                  display: grid;
                  grid-template-columns: 1fr 1fr 1fr;
                  gap: 20px;
                  margin-bottom: 20px;
                  background: #f8f9fa;
                  padding: 15px;
                  border-radius: 5px;
                }
                .info-item {
                  display: flex;
                  flex-direction: column;
                }
                .info-label {
                  font-weight: bold;
                  color: #333;
                  font-size: 11px;
                  margin-bottom: 2px;
                }
                .info-value {
                  color: #000;
                  font-size: 12px;
                }
                .status-badge {
                  background: #007bff;
                  color: white;
                  padding: 2px 8px;
                  border-radius: 3px;
                  font-size: 10px;
                  display: inline-block;
                }
                .parcels-header {
                  background: #f0f0f0;
                  padding: 10px;
                  margin: 20px 0 10px 0;
                  font-weight: bold;
                  font-size: 14px;
                }
                table { 
                  width: 100%; 
                  border-collapse: collapse; 
                  font-size: 10px;
                }
                th, td { 
                  border: 1px solid #ccc; 
                  padding: 8px 4px; 
                  text-align: left; 
                  vertical-align: top;
                }
                th { 
                  background-color: #f8f9fa; 
                  font-weight: bold;
                  font-size: 9px;
                  text-align: center;
                }
                td {
                  font-size: 9px;
                }
                .total-row {
                  background-color: #f8f9fa;
                  font-weight: bold;
                }
                .signatures {
                  margin-top: 40px;
                  display: grid;
                  grid-template-columns: 1fr 1fr 1fr;
                  gap: 50px;
                }
                .signature-line {
                  border-bottom: 1px solid #000;
                  height: 40px;
                  margin-bottom: 5px;
                }
                .signature-label {
                  font-size: 10px;
                  font-weight: bold;
                  text-align: center;
                }
                .payment-summary {
                  margin-top: 20px;
                  font-size: 11px;
                  font-weight: bold;
                }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>NID LOGISTICS DISPATCH NOTE</h1>
                <h2>DISPATCH MANAGEMENT SYSTEM</h2>
              </div>
              
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Dispatch Code:</span>
                  <span class="info-value">${dispatch.dispatchCode}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Destination:</span>
                  <span class="info-value">${dispatch.destination}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Date:</span>
                  <span class="info-value">${eatDateTime.full}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Parcels:</span>
                  <span class="info-value">${dispatch.totalParcels || dispatch.parcelIds?.length || 0}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Amount:</span>
                  <span class="info-value">KES ${(dispatch.totalAmount || 0).toFixed(2)}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Status:</span>
                  <span class="status-badge">${dispatch.status}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Vehicle Reg:</span>
                  <span class="info-value">${dispatch.vehicleNumber}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Driver:</span>
                  <span class="info-value">${dispatch.driver}</span>
                </div>
              </div>

              <div class="parcels-header">PARCELS LIST</div>
              
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Waybill</th>
                    <th>Sender</th>
                    <th>Receiver</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Amount</th>
                    <th>Payment Mode</th>
                    <th>Created By</th>
                    <th>Confirmed by</th>
                    <th>Receiver Signature</th>
                    <th>ID Number</th>
                  </tr>
                </thead>
                <tbody>
                  ${parcels.map((parcel, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${parcel.waybillNumber}</td>
                      <td>${parcel.sender}<br>Tel: ${parcel.senderTelephone}</td>
                      <td>${parcel.receiver}<br>Tel: ${parcel.receiverTelephone}</td>
                      <td>${parcel.description}</td>
                      <td>${parcel.quantity || 0}</td>
                      <td>KES ${(parcel.totalAmount || 0).toFixed(2)}</td>
                      <td>${parcel.paymentMethods || 'N/A'}</td>
                      <td>${parcel.createdByDisplayName || 'N/A'}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div style="text-align: right; margin-top: 20px; font-weight: bold; font-size: 12px;">
                TOTAL: KES ${parcels.reduce((sum, p) => sum + (p.totalAmount || 0), 0).toFixed(2)}
              </div>

              <div class="signatures">
                <div>
                  <div class="signature-line"></div>
                  <div class="signature-label">Dispatcher Signature</div>
                </div>
                <div>
                  <div class="signature-line"></div>
                  <div class="signature-label">Driver Signature</div>
                </div>
                <div>
                  <div class="signature-line"></div>
                  <div class="signature-label">Supervisor Signature</div>
                </div>
              </div>

              <div class="payment-summary">
                <h3>Payment Method Totals:</h3>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (err) {
      setError('Failed to generate dispatch note');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'pending': { variant: 'warning' as const, label: 'Pending' },
      'in_transit': { variant: 'primary' as const, label: 'In Transit' },
      'delivered': { variant: 'success' as const, label: 'Delivered' },
      'cancelled': { variant: 'error' as const, label: 'Cancelled' },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { variant: 'gray' as const, label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount).replace('KES', 'KSh');
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    // Display timestamp as-is (no timezone conversion)
    return {
      date: date.toLocaleDateString('en-KE'),
      time: date.toLocaleTimeString('en-KE', { hour12: false }),
      full: date.toLocaleString('en-KE', { hour12: false })
    };
  };

  // Virtual table columns
  const columns = [
    {
      key: 'dispatchCode',
      header: 'Dispatch Code',
      width: 150,
      sortable: true,
      render: (dispatch: EnhancedDispatch) => (
        <div className="font-medium text-gray-900 dark:text-white">
          {dispatch.dispatchCode}
        </div>
      )
    },
    {
      key: 'sourceBranch',
      header: 'Source Branch',
      width: 140,
      sortable: true,
      render: (dispatch: EnhancedDispatch) => dispatch.sourceBranch
    },
    {
      key: 'destination',
      header: 'Destination',
      width: 140,
      sortable: true,
      render: (dispatch: EnhancedDispatch) => (
        <div className="flex items-center text-gray-900 dark:text-white">
          <MapPin className="w-4 h-4 mr-1 text-gray-400" />
          {dispatch.destination}
        </div>
      )
    },
    {
      key: 'driver',
      header: 'Driver',
      width: 140,
      sortable: true,
      render: (dispatch: EnhancedDispatch) => (
        <div className="flex items-center text-gray-900 dark:text-white">
          <User className="w-4 h-4 mr-1 text-gray-400" />
          {dispatch.driver}
        </div>
      )
    },
    {
      key: 'vehicleNumber',
      header: 'Vehicle',
      width: 120,
      sortable: true,
      render: (dispatch: EnhancedDispatch) => (
        <div className="flex items-center text-gray-900 dark:text-white">
          <Truck className="w-4 h-4 mr-1 text-gray-400" />
          {dispatch.vehicleNumber}
        </div>
      )
    },
    {
      key: 'totalParcels',
      header: 'Parcels',
      width: 100,
      sortable: true,
      render: (dispatch: EnhancedDispatch) => (
        <div className="text-center">
          <div className="font-medium">{dispatch.totalParcels || dispatch.parcelIds.length}</div>
          <div className="text-xs text-gray-500">parcels</div>
        </div>
      )
    },
    {
      key: 'totalAmount',
      header: 'Total Value',
      width: 120,
      sortable: true,
      render: (dispatch: EnhancedDispatch) => (
        <div className="font-medium">
          {dispatch.totalAmount ? formatCurrency(dispatch.totalAmount) : 'N/A'}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      sortable: true,
      render: (dispatch: EnhancedDispatch) => getStatusBadge(dispatch.status)
    },
    {
      key: 'dispatchTime',
      header: 'Dispatch Time',
      width: 150,
      sortable: true,
      render: (dispatch: EnhancedDispatch) => {
        const formatted = formatDateTime(dispatch.dispatchTime);
        return (
          <div>
            <div className="text-sm text-gray-900 dark:text-white">{formatted.date}</div>
            <div className="text-xs text-gray-500">{formatted.time}</div>
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 120,
      render: (dispatch: EnhancedDispatch) => (
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePrintDispatchNote(dispatch)}
            title="Print Dispatch Note"
          >
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const getUserDisplayName = async (userId: number): Promise<string> => {
    // Check cache first
    if (userCache.has(userId)) {
      return userCache.get(userId)!;
    }

    try {
      const user = await wmsApi.getUserById(userId);
      const displayName = user?.username || user?.firstName || `User ${userId}`;
      
      // Cache the result
      setUserCache(prev => new Map(prev).set(userId, displayName));
      
      return displayName;
    } catch (error) {
      const fallback = `User ${userId}`;
      setUserCache(prev => new Map(prev).set(userId, fallback));
      return fallback;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dispatch Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track dispatch operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="primary"
            onClick={() => fetchDispatches(true)}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-brand-100 dark:bg-brand-500/20">
              <Truck className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Dispatches
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {dispatches.length}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-500/20">
              <Package className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Parcels
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {dispatches.reduce((sum, d) => sum + (d.totalParcels || d.parcelIds?.length || 0), 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-success-100 dark:bg-success-500/20">
              <DollarSign className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Value
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(dispatches.reduce((sum, d) => sum + (d.totalAmount || 0), 0))}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-warning-100 dark:bg-warning-500/20">
              <CheckCircle className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                In Transit
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {dispatches.filter(d => d.status === 'in_transit').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-error-50 border border-error-200 text-error-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <FilterPanel
          fields={filterFields}
          filters={filters as any}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          activeFilters={getActiveFilterChips()}
          collapsible={true}
          defaultExpanded={true}
        />
      )}

      {/* Dispatches Table */}
      <Card padding={false}>
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dispatches ({filteredDispatches.length})
          </h3>
        </div>

        <VirtualScrollTable
          data={filteredDispatches}
          columns={columns}
          rowHeight={72}
          containerHeight={600}
          loading={loading}
          emptyMessage={
            Object.values(filters).some(filter => filter) 
              ? 'Try adjusting your filters' 
              : 'No dispatches have been created yet'
          }
          onRowClick={(dispatch) => {
            // TODO: Navigate to dispatch details
          }}
        />
      </Card>
    </div>
  );
};

export default DispatchList;