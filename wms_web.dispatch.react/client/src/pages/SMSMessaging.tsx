import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Users, Package, RefreshCw, Filter, Search, Phone } from 'lucide-react';
import { Card, Button, Badge, FilterPanel, FilterField, Input, Select } from '../components/ui';
import { VirtualScrollTable } from '../components/VirtualScrollTable';
import { SMSMessaging } from '../components/SMSMessaging';
import { useSMS } from '../hooks/useSMS';
import { useAuth } from '../context/AuthContext';
import { wmsApi, Parcel } from '../services/wmsApi';
import { smsApi, SMSResponse } from '../services/smsApi';

interface SMSFilterState {
  search: string;
  status: string;
  destination: string;
  hasValidPhone: string;
}

const SMSMessagingPage: React.FC = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedParcels, setSelectedParcels] = useState<Parcel[]>([]);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [destinations, setDestinations] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<SMSFilterState>({
    search: '',
    status: '',
    destination: '',
    hasValidPhone: ''
  });

  const { user, isAdmin } = useAuth();
  const { isSending, lastResults, validatePhoneNumber, validateSMSConfig } = useSMS({
    onSuccess: (results) => {
      console.log('SMS sent successfully:', results);
      setSelectedParcels([]);
    },
    onError: (error) => {
      console.error('SMS error:', error);
      alert(`Error sending SMS: ${error}`);
    }
  });

  useEffect(() => {
    fetchParcels();
  }, []);

  const fetchParcels = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      const branchFilter = user?.branch?.name && !isAdmin() 
        ? user.branch.name 
        : undefined;
      
      const data = await wmsApi.getParcels(branchFilter);
      setParcels(data);
      
      // Extract unique destinations for the filter dropdown
      const uniqueDestinations = Array.from(new Set(
        data.map(parcel => parcel.destination).filter(dest => dest && dest.trim())
      )).sort();
      setDestinations(uniqueDestinations);
    } catch (err) {
      setError('Failed to load parcels');
      console.error('Error fetching parcels:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredParcels = React.useMemo(() => {
    return parcels.filter(parcel => {
      const searchLower = filters.search.toLowerCase();
      
      const matchesSearch = !filters.search || 
        parcel.waybillNumber.toLowerCase().includes(searchLower) ||
        parcel.sender.toLowerCase().includes(searchLower) ||
        parcel.receiver.toLowerCase().includes(searchLower) ||
        parcel.destination.toLowerCase().includes(searchLower);
      
      const matchesStatus = !filters.status || 
        parcel.status.toString() === filters.status;
      
      const matchesDestination = !filters.destination || 
        parcel.destination === filters.destination;
      
      const matchesPhoneFilter = !filters.hasValidPhone || (() => {
        const hasValidSender = parcel.senderTelephone && validatePhoneNumber(parcel.senderTelephone);
        const hasValidReceiver = parcel.receiverTelephone && validatePhoneNumber(parcel.receiverTelephone);
        
        if (filters.hasValidPhone === 'valid') {
          return hasValidSender || hasValidReceiver;
        } else if (filters.hasValidPhone === 'invalid') {
          return !hasValidSender && !hasValidReceiver;
        }
        return true;
      })();
      
      return matchesSearch && matchesStatus && matchesDestination && matchesPhoneFilter;
    });
  }, [parcels, filters, validatePhoneNumber]);

  const handleFilterChange = (key: string, value: string | { from: string; to: string }) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      destination: '',
      hasValidPhone: ''
    });
  };

  const handleSelectParcel = (parcel: Parcel) => {
    setSelectedParcels(prev => {
      const isSelected = prev.find(p => p.id === parcel.id);
      if (isSelected) {
        return prev.filter(p => p.id !== parcel.id);
      } else {
        return [...prev, parcel];
      }
    });
  };

  const handleSelectAll = () => {
    const validParcels = filteredParcels.filter(parcel => 
      (parcel.senderTelephone && validatePhoneNumber(parcel.senderTelephone)) ||
      (parcel.receiverTelephone && validatePhoneNumber(parcel.receiverTelephone))
    );
    
    setSelectedParcels(validParcels);
  };

  const handleClearSelection = () => {
    setSelectedParcels([]);
  };

  const getStatusLabel = (status: number) => {
    const statusMap = {
      0: 'Pending',
      1: 'Confirmed', 
      2: 'In Transit',
      3: 'Delivered',
      4: 'Cancelled'
    };
    return statusMap[status as keyof typeof statusMap] || 'Unknown';
  };

  const getStatusVariant = (status: number): 'primary' | 'success' | 'warning' | 'error' | 'gray' => {
    switch (status) {
      case 0: return 'gray';
      case 1: return 'warning';
      case 2: return 'primary';
      case 3: return 'success';
      case 4: return 'error';
      default: return 'gray';
    }
  };

  const getPhoneStatus = (parcel: Parcel) => {
    const validSender = parcel.senderTelephone && validatePhoneNumber(parcel.senderTelephone);
    const validReceiver = parcel.receiverTelephone && validatePhoneNumber(parcel.receiverTelephone);
    
    if (validSender && validReceiver) return { status: 'Both Valid', variant: 'success' as const };
    if (validSender) return { status: 'Sender Only', variant: 'warning' as const };
    if (validReceiver) return { status: 'Receiver Only', variant: 'warning' as const };
    return { status: 'No Valid Phone', variant: 'error' as const };
  };

  const filterFields: FilterField[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Waybill, sender, receiver...'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: '', label: 'All Statuses' },
        { value: '0', label: 'Pending' },
        { value: '1', label: 'Confirmed' },
        { value: '2', label: 'In Transit' },
        { value: '3', label: 'Delivered' },
        { value: '4', label: 'Cancelled' }
      ]
    },
    {
      key: 'destination',
      label: 'Destination',
      type: 'select',
      options: [
        { value: '', label: 'All Destinations' },
        ...destinations.map(dest => ({ value: dest, label: dest }))
      ]
    },
    {
      key: 'hasValidPhone',
      label: 'Phone Status',
      type: 'select',
      options: [
        { value: '', label: 'All Phone Statuses' },
        { value: 'valid', label: 'Has Valid Phone' },
        { value: 'invalid', label: 'No Valid Phone' }
      ]
    }
  ];

  const columns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedParcels.length > 0 && selectedParcels.length === filteredParcels.filter(p => 
            validatePhoneNumber(p.senderTelephone) || validatePhoneNumber(p.receiverTelephone)
          ).length}
          onChange={selectedParcels.length > 0 ? handleClearSelection : handleSelectAll}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      ),
      width: 50,
      render: (parcel: Parcel) => {
        const hasValidPhone = validatePhoneNumber(parcel.senderTelephone) || validatePhoneNumber(parcel.receiverTelephone);
        const isSelected = selectedParcels.find(p => p.id === parcel.id);
        
        return (
          <input
            type="checkbox"
            checked={!!isSelected}
            disabled={!hasValidPhone}
            onChange={() => handleSelectParcel(parcel)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
          />
        );
      }
    },
    {
      key: 'waybillNumber',
      header: 'Waybill',
      width: 120,
      render: (parcel: Parcel) => (
        <div className="font-medium text-gray-900">{parcel.waybillNumber}</div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: 100,
      render: (parcel: Parcel) => (
        <Badge variant={getStatusVariant(parcel.status)}>
          {getStatusLabel(parcel.status)}
        </Badge>
      )
    },
    {
      key: 'contacts',
      header: 'Contacts',
      width: 250,
      render: (parcel: Parcel) => (
        <div className="space-y-1 text-sm">
          <div className="flex items-center">
            <span className="text-gray-500 w-12">From:</span>
            <span className="font-medium">{parcel.sender}</span>
            <div className="ml-2 flex items-center text-gray-500">
              <Phone className="w-3 h-3 mr-1" />
              <span className={validatePhoneNumber(parcel.senderTelephone) ? 'text-green-600' : 'text-red-500'}>
                {parcel.senderTelephone}
              </span>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-gray-500 w-12">To:</span>
            <span className="font-medium">{parcel.receiver}</span>
            <div className="ml-2 flex items-center text-gray-500">
              <Phone className="w-3 h-3 mr-1" />
              <span className={validatePhoneNumber(parcel.receiverTelephone) ? 'text-green-600' : 'text-red-500'}>
                {parcel.receiverTelephone}
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'destination',
      header: 'Destination',
      width: 120,
      render: (parcel: Parcel) => (
        <span className="text-gray-900">{parcel.destination}</span>
      )
    },
    {
      key: 'phoneStatus',
      header: 'Phone Status',
      width: 130,
      render: (parcel: Parcel) => {
        const phoneStatus = getPhoneStatus(parcel);
        return (
          <Badge variant={phoneStatus.variant} size="sm">
            {phoneStatus.status}
          </Badge>
        );
      }
    }
  ];

  const configValidation = validateSMSConfig();

  if (!configValidation.isValid) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-title-md font-bold text-gray-900">SMS Messaging</h1>
          <p className="text-gray-600">Send SMS notifications to parcel contacts</p>
        </div>
        
        <Card className="p-8 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">SMS Configuration Required</h3>
          <p className="text-gray-500 mb-4">
            Please configure your SMS settings to use this feature.
          </p>
          <div className="text-sm text-left bg-red-50 rounded-lg p-4 max-w-md mx-auto">
            <strong>Missing configuration:</strong>
            <ul className="mt-2 list-disc list-inside space-y-1">
              {configValidation.errors.map((error, index) => (
                <li key={index} className="text-red-700">{error}</li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-12">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Parcels</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => fetchParcels()}>Try Again</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-md font-bold text-gray-900">SMS Messaging</h1>
          <p className="text-gray-600">Send SMS notifications to parcel contacts</p>
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
            onClick={() => fetchParcels(true)}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Total Parcels</p>
              <p className="text-2xl font-bold text-gray-900">{filteredParcels.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Valid Contacts</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredParcels.filter(p => 
                  validatePhoneNumber(p.senderTelephone) || validatePhoneNumber(p.receiverTelephone)
                ).length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <MessageSquare className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Selected</p>
              <p className="text-2xl font-bold text-gray-900">{selectedParcels.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <Send className="w-8 h-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Max Recipients</p>
              <p className="text-2xl font-bold text-gray-900">{selectedParcels.length * 2}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Selection Actions */}
      {selectedParcels.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">
                {selectedParcels.length} parcel{selectedParcels.length !== 1 ? 's' : ''} selected
              </h3>
              <p className="text-sm text-blue-700">
                Up to {selectedParcels.length * 2} SMS messages can be sent
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleClearSelection}>
                Clear Selection
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => setShowSMSModal(true)}
                disabled={isSending}
              >
                <Send className="w-4 h-4 mr-2" />
                Send SMS
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      {showFilters && (
        <FilterPanel
          fields={filterFields}
          filters={filters as any}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          activeFilters={Object.entries(filters).filter(([_, value]) => value).map(([key, value]) => ({
            key,
            label: filterFields.find(f => f.key === key)?.label || key,
            value: typeof value === 'string' ? value : String(value),
            onRemove: () => handleFilterChange(key, '')
          }))}
          collapsible={true}
          defaultExpanded={true}
        />
      )}

      {/* Parcels Table */}
      <Card padding={false}>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Parcels Available for SMS ({filteredParcels.length})
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredParcels.filter(p => 
                  validatePhoneNumber(p.senderTelephone) || validatePhoneNumber(p.receiverTelephone)
                ).length === 0}
              >
                Select All Valid
              </Button>
            </div>
          </div>
        </Card.Header>

        <VirtualScrollTable
          data={filteredParcels}
          columns={columns}
          rowHeight={80}
          containerHeight={600}
          loading={loading}
          emptyMessage="No parcels available for SMS messaging"
        />
      </Card>

      {/* SMS Modal */}
      <SMSMessaging
        parcels={selectedParcels}
        isOpen={showSMSModal}
        onClose={() => setShowSMSModal(false)}
        onSuccess={(results) => {
          console.log('SMS Campaign Results:', results);
          setShowSMSModal(false);
          setSelectedParcels([]);
        }}
      />
    </div>
  );
};

export default SMSMessagingPage;