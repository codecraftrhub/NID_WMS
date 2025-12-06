import React, { useState, useEffect, useMemo } from 'react';
import { Package, Search, Filter, Download, Eye, Edit, RefreshCw, Calendar, MapPin, DollarSign, User, Phone, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, Table, FilterPanel, FilterField } from '../components/ui';
import { VirtualScrollTable } from '../components/VirtualScrollTable';
import { wmsApi, Parcel } from '../services/wmsApi';
import { generateQRCode } from '../utils/qrCode';
import { exportParcelsToPDF, generateFilterSummary } from '../utils/pdfExport';

interface ParcelFilterState {
  search: string;
  status: string;
  destination: string;
  paymentMethod: string;
  amountRange: { from: string; to: string };
  dateRange: { from: string; to: string };
  sender: string;
  receiver: string;
}

const Parcels: React.FC = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [showParcelModal, setShowParcelModal] = useState(false);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  
  const [filters, setFilters] = useState<ParcelFilterState>({
    search: '',
    status: '',
    destination: '',
    paymentMethod: '',
    amountRange: { from: '', to: '' },
    dateRange: { from: '', to: '' },
    sender: '',
    receiver: ''
  });

  const { user, isAdmin, isBranchManager } = useAuth();

  useEffect(() => {
    fetchParcels();
  }, []);

  const handleViewParcel = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setShowParcelModal(true);
  };

  const handleCloseModal = () => {
    setSelectedParcel(null);
    setShowParcelModal(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount).replace('KES', 'KSh');
  };

  const getStatusLabel = (status: number) => {
    const statusMap = {
      0: 'Pending',
      1: 'Finalized', 
      2: 'In Transit',
      3: 'Delivered',
      4: 'Cancelled'
    };
    return statusMap[status as keyof typeof statusMap] || 'Unknown';
  };

  const handleDownloadA4Receipt = async (parcel: Parcel) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    // Generate QR code for the waybill number
    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await generateQRCode(parcel.waybillNumber, { width: 160 });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const consignmentNote = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Consignment Note - ${parcel.waybillNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #000; background: #fff; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; color: #000; margin-bottom: 5px; }
          .company-tagline { font-size: 14px; color: #000; margin-bottom: 10px; }
          .document-title { font-size: 18px; font-weight: bold; color: #000; }
          .waybill-number { font-size: 16px; color: #000; margin-top: 5px; }
          
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-section { border: 1px solid #000; border-radius: 0; padding: 15px; background: #fff; }
          .section-title { font-weight: bold; font-size: 14px; color: #000; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 5px; }
          .info-row { margin-bottom: 8px; }
          .info-label { font-weight: bold; color: #000; display: inline-block; width: 120px; }
          .info-value { color: #000; }
          
          
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #000; font-size: 11px; color: #000; }
          .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
          .signature-box { text-align: center; border-top: 1px solid #000; padding-top: 5px; }
          
          .status-badge { display: inline-block; padding: 4px 8px; border: 1px solid #000; border-radius: 0; font-size: 11px; font-weight: bold; background: #fff; color: #000; }
          
          @media print {
            body { margin: 0; }
            .container { max-width: none; margin: 0; padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="company-name"> LOGISTICS</div>
            <div class="company-tagline">Reliable Delivery Solutions</div>
            <div class="document-title">OFFICIAL CONSIGNMENT NOTE</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
              <div>
                <div class="waybill-number">Waybill No: ${parcel.waybillNumber}</div>
                <div style="margin-top: 10px;">
                  <span class="status-badge">
                    Status: ${getStatusLabel(parcel.status)}
                  </span>
                </div>
              </div>
              ${qrCodeDataUrl ? `
              <div style="text-align: center;">
                <div style="font-size: 10px; color: #000; margin-bottom: 5px;">SCAN TO TRACK</div>
                <div style="width: 80px; height: 80px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; background: white;">
                  <img src="${qrCodeDataUrl}" alt="QR Code for ${parcel.waybillNumber}" style="max-width: 100%; max-height: 100%;" />
                </div>
              </div>
              ` : `
              <div style="text-align: center;">
                <div style="font-size: 10px; color: #000; margin-bottom: 5px;">QR CODE</div>
                <div style="width: 80px; height: 80px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; background: white; font-size: 8px; color: #666;">
                  Not Available
                </div>
              </div>
              `}
            </div>
          </div>

          <!-- Main Information Grid -->
          <div class="info-grid">
            <!-- Sender Information -->
            <div class="info-section">
              <div class="section-title">SENDER INFORMATION</div>
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${parcel.sender}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">${parcel.senderTelephone}</span>
              </div>
            </div>

            <!-- Receiver Information -->
            <div class="info-section">
              <div class="section-title">RECEIVER INFORMATION</div>
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${parcel.receiver}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">${parcel.receiverTelephone}</span>
              </div>
            </div>

            <!-- Shipment Details -->
            <div class="info-section">
              <div class="section-title">SHIPMENT DETAILS</div>
              <div class="info-row">
                <span class="info-label">Destination:</span>
                <span class="info-value">${parcel.destination}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Quantity:</span>
                <span class="info-value">${parcel.quantity}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Description:</span>
                <span class="info-value">${parcel.description || 'N/A'}</span>
              </div>
            </div>

            <!-- Financial Information -->
            <div class="info-section">
              <div class="section-title">FINANCIAL INFORMATION</div>
              <div class="info-row">
                <span class="info-label">Amount:</span>
                <span class="info-value">${formatCurrency(parcel.totalAmount)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment:</span>
                <span class="info-value">${parcel.paymentMethods}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Created By:</span>
                <span class="info-value">${parcel.createdBy?.username || 'N/A'}</span>
              </div>
            </div>
          </div>


          <!-- Date and Time Information -->
          <div class="info-section" style="margin-bottom: 20px;">
            <div class="section-title">TIMELINE INFORMATION</div>
            <div class="info-row">
              <span class="info-label">Created:</span>
              <span class="info-value">${new Date(parcel.createdAt).toLocaleString()}</span>
            </div>
            ${parcel.dispatchedAt ? `
            <div class="info-row">
              <span class="info-label">Dispatched:</span>
              <span class="info-value">${new Date(parcel.dispatchedAt).toLocaleString()}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Printed:</span>
              <span class="info-value">${new Date().toLocaleString()}</span>
            </div>
          </div>

          <!-- Signature Section -->
          <div class="signature-section">
            <div class="signature-box">
              <div style="height: 50px; border-bottom: 1px solid #000; margin-bottom: 5px;"></div>
              <div><strong>SENDER SIGNATURE</strong></div>
            </div>
            <div class="signature-box">
              <div style="height: 50px; border-bottom: 1px solid #000; margin-bottom: 5px;"></div>
              <div><strong>RECEIVER SIGNATURE</strong></div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div style="text-align: center; border: 1px solid #000; padding: 10px; margin-top: 20px;">
              <strong>NID LOGISTICS LTD - Efficiency in Motion</strong><br>
              This is an official computer-generated document.<br>
              For inquiries, contact your nearest branch office.<br>
              <strong>Document Generated: ${currentDate}</strong>
            </div>
          </div>

          <!-- Print Button (hidden when printing) -->
          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="background: #000; color: white; border: none; padding: 10px 20px; cursor: pointer; font-size: 14px;">
              Print A4 Consignment Note
            </button>
            <button onclick="window.close()" style="background: #666; color: white; border: none; padding: 10px 20px; cursor: pointer; font-size: 14px; margin-left: 10px;">
              Close
            </button>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(consignmentNote);
    printWindow.document.close();
    printWindow.focus();
  };

  const handleDownload80mmReceipt = async (parcel: Parcel) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;

    // Generate QR code for the waybill number
    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await generateQRCode(parcel.waybillNumber, { width: 80 });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }

    const thermalReceipt = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Thermal Receipt - ${parcel.waybillNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 11px; 
            line-height: 1.2; 
            color: #000; 
            background: #fff;
            width: 80mm;
            margin: 0;
            padding: 5mm;
          }
          .receipt { width: 100%; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .large { font-size: 14px; }
          .medium { font-size: 12px; }
          .small { font-size: 10px; }
          .divider { 
            border-top: 1px dashed #000; 
            margin: 8px 0; 
            width: 100%;
          }
          .line { margin: 2px 0; }
          .label { display: inline-block; width: 60px; }
          .qr-code { 
            border: 1px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          @media print {
            body { 
              margin: 0; 
              padding: 2mm;
              width: 80mm;
            }
            .no-print { display: none; }
            @page {
              size: 80mm auto;
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <!-- Header -->
          <div class="center bold large">NID LOGISTICS</div>
          <div class="center small">Reliable Delivery Solutions</div>
          <div class="divider"></div>
          
          <div class="center bold medium">CONSIGNMENT NOTE</div>
          
          <!-- Waybill and QR Code Section -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0;">
            <div>
              <div class="small">Waybill:</div>
              <div class="bold small">${parcel.waybillNumber}</div>
              <div class="small">Status: ${getStatusLabel(parcel.status)}</div>
            </div>
            ${qrCodeDataUrl ? `
            <div style="text-align: center;">
              <div class="qr-code" style="width: 40px; height: 40px; margin: 0;">
                <img src="${qrCodeDataUrl}" alt="QR Code for ${parcel.waybillNumber}" style="max-width: 100%; max-height: 100%;" />
              </div>
              <div style="font-size: 8px;">SCAN</div>
            </div>
            ` : `
            <div style="text-align: center;">
              <div class="qr-code" style="width: 40px; height: 40px; margin: 0; font-size: 8px;">
                N/A
              </div>
            </div>
            `}
          </div>
          <div class="divider"></div>
          
          <!-- Sender & Receiver -->
          <div class="bold small">FROM:</div>
          <div class="line small">${parcel.sender}</div>
          <div class="line small">${parcel.senderTelephone}</div>
          
          <div class="bold small" style="margin-top: 5px;">TO:</div>
          <div class="line small">${parcel.receiver}</div>
          <div class="line small">${parcel.receiverTelephone}</div>
          <div class="line small">Dest: ${parcel.destination}</div>
          <div class="divider"></div>
          
          <!-- Package Details -->
          <div class="bold small">PACKAGE DETAILS:</div>
          <div class="line small">Qty: ${parcel.quantity}</div>
          <div class="line small">Desc: ${parcel.description || 'N/A'}</div>
          <div class="divider"></div>
          
          <!-- Financial -->
          <div class="bold small">PAYMENT:</div>
          <div class="line small">Amount: ${formatCurrency(parcel.totalAmount)}</div>
          <div class="line small">Method: ${parcel.paymentMethods}</div>
          <div class="divider"></div>
          
          
          <!-- Dates -->
          <div class="small">Created: ${new Date(parcel.createdAt).toLocaleDateString()} ${new Date(parcel.createdAt).toLocaleTimeString()}</div>
          ${parcel.dispatchedAt ? `<div class="small">Dispatched: ${new Date(parcel.dispatchedAt).toLocaleDateString()}</div>` : ''}
          <div class="small">Printed: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          <div class="divider"></div>
          
          <!-- Footer -->
          <div class="center small">Created by: ${parcel.createdBy?.username || 'System'}</div>
          <div class="center small bold">THERMAL RECEIPT</div>
          <div class="center small">Thank you for choosing us!</div>
          
          <!-- Print Controls -->
          <div class="no-print" style="text-align: center; margin-top: 10px;">
            <button onclick="window.print()" style="background: #000; color: white; border: none; padding: 5px 10px; cursor: pointer; font-size: 10px;">
              Print 80mm Receipt
            </button>
            <button onclick="window.close()" style="background: #666; color: white; border: none; padding: 5px 10px; cursor: pointer; font-size: 10px; margin-left: 5px;">
              Close
            </button>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(thermalReceipt);
    printWindow.document.close();
    printWindow.focus();
  };

  const handleExportPDF = async () => {
    if (filteredParcels.length === 0) {
      alert('No parcels to export. Please adjust your filters or add some parcels.');
      return;
    }

    try {
      setIsExporting(true);
      
      const filterSummary = generateFilterSummary(filters);
      const exportDate = new Date().toISOString().split('T')[0];
      
      // Add a small delay to show loading state for large datasets
      await new Promise(resolve => setTimeout(resolve, 100));
      
      exportParcelsToPDF(filteredParcels, {
        title: 'Parcels Export Report',
        filename: `parcels-export-${exportDate}.pdf`,
        includeFilters: true,
        filterSummary: filterSummary
      });
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const fetchParcels = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError('');
      
      // Determine if we should filter by branch
      const branchName = isBranchManager() && user?.branch?.name ? user.branch.name : undefined;
      
      const data = await wmsApi.getParcels(branchName);
      
      // Populate user information for parcels that don't have createdBy populated
      try {
        const users = await wmsApi.getUsers();
        
        const updatedParcels = data.map(parcel => {
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
        
        setParcels(updatedParcels);
        
        // Extract unique destinations for filter dropdown
        const destinationSet = new Set(updatedParcels.map(p => p.destination).filter(Boolean));
        setDestinations(Array.from(destinationSet).sort());
      } catch (userErr) {
        setParcels(data);
        
        // Extract unique destinations even if user mapping fails
        const destinationSet = new Set(data.map(p => p.destination).filter(Boolean));
        setDestinations(Array.from(destinationSet).sort());
      }
    } catch (err) {
      setError('Failed to load parcels');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: number) => {
    const statusMap = {
      0: { label: 'Pending', variant: 'warning' as const },
      1: { label: 'Finalized', variant: 'primary' as const },
      2: { label: 'In Transit', variant: 'primary' as const },
      3: { label: 'Delivered', variant: 'success' as const },
      4: { label: 'Cancelled', variant: 'error' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: 'Unknown', variant: 'gray' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const handleFilterChange = (key: string, value: string | { from: string; to: string }) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      destination: '',
      paymentMethod: '',
      amountRange: { from: '', to: '' },
      dateRange: { from: '', to: '' },
      sender: '',
      receiver: ''
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
      const statusOptions = [
        { value: '0', label: 'Pending' },
        { value: '1', label: 'Finalized' },
        { value: '2', label: 'In Transit' },
        { value: '3', label: 'Delivered' },
        { value: '4', label: 'Cancelled' }
      ];
      const statusLabel = statusOptions.find(s => s.value === filters.status)?.label || filters.status;
      chips.push({
        key: 'status',
        label: 'Status',
        value: statusLabel,
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

    if (filters.paymentMethod) {
      chips.push({
        key: 'paymentMethod',
        label: 'Payment Method',
        value: filters.paymentMethod,
        onRemove: () => handleFilterChange('paymentMethod', '')
      });
    }

    if (filters.amountRange.from || filters.amountRange.to) {
      const rangeValue = `${filters.amountRange.from || '0'} - ${filters.amountRange.to || '∞'}`;
      chips.push({
        key: 'amountRange',
        label: 'Amount Range',
        value: rangeValue,
        onRemove: () => handleFilterChange('amountRange', { from: '', to: '' })
      });
    }

    if (filters.dateRange.from || filters.dateRange.to) {
      const rangeValue = `${filters.dateRange.from || 'Start'} to ${filters.dateRange.to || 'End'}`;
      chips.push({
        key: 'dateRange',
        label: 'Date Range',
        value: rangeValue,
        onRemove: () => handleFilterChange('dateRange', { from: '', to: '' })
      });
    }

    if (filters.sender) {
      chips.push({
        key: 'sender',
        label: 'Sender',
        value: filters.sender,
        onRemove: () => handleFilterChange('sender', '')
      });
    }

    if (filters.receiver) {
      chips.push({
        key: 'receiver',
        label: 'Receiver',
        value: filters.receiver,
        onRemove: () => handleFilterChange('receiver', '')
      });
    }

    return chips;
  };

  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Search by waybill, destination, sender, or receiver',
      icon: <Search className="w-4 h-4" />
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'Select status',
      icon: <Package className="w-4 h-4" />,
      options: [
        { value: '', label: 'All Statuses' },
        { value: '0', label: 'Pending' },
        { value: '1', label: 'Finalized' },
        { value: '2', label: 'In Transit' },
        { value: '3', label: 'Delivered' },
        { value: '4', label: 'Cancelled' }
      ]
    },
    {
      key: 'destination',
      label: 'Destination',
      type: 'select',
      placeholder: 'Select destination',
      icon: <MapPin className="w-4 h-4" />,
      options: [
        { value: '', label: 'All Destinations' },
        ...(destinations || []).map(dest => ({ value: dest, label: dest }))
      ]
    },
    {
      key: 'paymentMethod',
      label: 'Payment Method',
      type: 'text',
      placeholder: 'Filter by payment method',
      icon: <DollarSign className="w-4 h-4" />
    },
    {
      key: 'amountRange',
      label: 'Amount Range',
      type: 'numberRange',
      placeholder: 'Enter amount range',
      icon: <DollarSign className="w-4 h-4" />
    },
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'dateRange',
      placeholder: 'Select date range',
      icon: <Calendar className="w-4 h-4" />
    },
    {
      key: 'sender',
      label: 'Sender',
      type: 'text',
      placeholder: 'Filter by sender name',
      icon: <User className="w-4 h-4" />
    },
    {
      key: 'receiver',
      label: 'Receiver',
      type: 'text',
      placeholder: 'Filter by receiver name',
      icon: <User className="w-4 h-4" />
    }
  ], [destinations]);

  const filteredParcels = parcels.filter(parcel => {
    // Search filter
    const matchesSearch = !filters.search || 
      parcel.waybillNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
      parcel.destination.toLowerCase().includes(filters.search.toLowerCase()) ||
      parcel.sender.toLowerCase().includes(filters.search.toLowerCase()) ||
      parcel.receiver.toLowerCase().includes(filters.search.toLowerCase());
    
    // Status filter
    const matchesStatus = !filters.status || parcel.status.toString() === filters.status;
    
    // Destination filter
    const matchesDestination = !filters.destination || 
      parcel.destination.toLowerCase().includes(filters.destination.toLowerCase());
    
    // Payment method filter
    const matchesPaymentMethod = !filters.paymentMethod || 
      parcel.paymentMethods.toLowerCase().includes(filters.paymentMethod.toLowerCase());
    
    // Amount range filter
    const matchesAmountRange = (!filters.amountRange.from && !filters.amountRange.to) ||
      ((filters.amountRange.from ? parcel.totalAmount >= Number(filters.amountRange.from) : true) &&
       (filters.amountRange.to ? parcel.totalAmount <= Number(filters.amountRange.to) : true));
    
    // Date range filter
    const matchesDateRange = (!filters.dateRange.from && !filters.dateRange.to) ||
      ((filters.dateRange.from ? new Date(parcel.createdAt) >= new Date(filters.dateRange.from) : true) &&
       (filters.dateRange.to ? (() => {
         const endDate = new Date(filters.dateRange.to);
         endDate.setHours(23, 59, 59, 999); // Set to end of day
         return new Date(parcel.createdAt) <= endDate;
       })() : true));
    
    // Sender filter
    const matchesSender = !filters.sender || 
      parcel.sender.toLowerCase().includes(filters.sender.toLowerCase());
    
    // Receiver filter
    const matchesReceiver = !filters.receiver || 
      parcel.receiver.toLowerCase().includes(filters.receiver.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesDestination && matchesPaymentMethod && 
           matchesAmountRange && matchesDateRange && matchesSender && matchesReceiver;
  });

  // Virtual table columns
  const columns = [
    {
      key: 'waybillNumber',
      header: 'Waybill Number',
      width: 180,
      sortable: true,
      render: (parcel: Parcel) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {parcel.waybillNumber}
          </div>
          <div className="text-xs text-gray-500">
            ID: {parcel.id.substring(0, 8)}...
          </div>
        </div>
      )
    },
    {
      key: 'destination',
      header: 'Destination',
      width: 150,
      sortable: true,
      render: (parcel: Parcel) => (
        <div className="flex items-center text-gray-900 dark:text-white">
          <MapPin className="w-4 h-4 mr-1 text-gray-400" />
          {parcel.destination}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      sortable: true,
      render: (parcel: Parcel) => getStatusBadge(parcel.status)
    },
    {
      key: 'sender',
      header: 'Sender',
      width: 200,
      sortable: true,
      render: (parcel: Parcel) => (
        <div>
          <div className="text-gray-900 dark:text-white">{parcel.sender}</div>
          <div className="text-xs text-gray-500 flex items-center">
            <Phone className="w-3 h-3 mr-1" />
            {parcel.senderTelephone}
          </div>
        </div>
      )
    },
    {
      key: 'receiver',
      header: 'Receiver',
      width: 200,
      sortable: true,
      render: (parcel: Parcel) => (
        <div>
          <div className="text-gray-900 dark:text-white">{parcel.receiver}</div>
          <div className="text-xs text-gray-500 flex items-center">
            <Phone className="w-3 h-3 mr-1" />
            {parcel.receiverTelephone}
          </div>
        </div>
      )
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      width: 120,
      sortable: true,
      render: (parcel: Parcel) => (
        <div>
          <div className="font-medium">{formatCurrency(parcel.totalAmount)}</div>
          <div className="text-xs text-gray-500">Qty: {parcel.quantity}</div>
        </div>
      )
    },
    {
      key: 'paymentMethods',
      header: 'Payment',
      width: 120,
      sortable: true,
      render: (parcel: Parcel) => (
        <Badge variant="gray">
          {parcel.paymentMethods}
        </Badge>
      )
    },
    {
      key: 'createdAt',
      header: 'Created',
      width: 120,
      sortable: true,
      render: (parcel: Parcel) => (
        <div>
          <div className="text-xs text-gray-500">
            {new Date(parcel.createdAt).toLocaleDateString()}
          </div>
          <div className="text-xs text-gray-400">
            {new Date(parcel.createdAt).toLocaleTimeString()}
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 100,
      render: (parcel: Parcel) => (
        <div className="flex items-center space-x-1">
          <Button 
            variant="outline" 
            size="sm" 
            title="View Details"
            onClick={() => handleViewParcel(parcel)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            title="Download A4 Receipt"
            onClick={() => handleDownloadA4Receipt(parcel)}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

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
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
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
          <h1 className="text-title-md font-bold text-gray-900 dark:text-white">Parcels</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and track all parcels in the system
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
            onClick={() => fetchParcels(true)}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

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

      {/* Parcels Table */}
      <Card padding={false}>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Parcels ({filteredParcels.length})
            </h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPDF}
              disabled={isExporting || filteredParcels.length === 0}
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </Card.Header>
        
        <VirtualScrollTable
          data={filteredParcels}
          columns={columns}
          rowHeight={72}
          containerHeight={600}
          loading={loading}
          emptyMessage={
            Object.values(filters).some(filter => 
              typeof filter === 'string' ? filter : 
              typeof filter === 'object' && filter !== null ? 
                Object.values(filter).some(v => v) : false
            ) ? 'Try adjusting your filters' : 'No parcels have been created yet'
          }
          onRowClick={(parcel) => {
            // TODO: Navigate to parcel details
          }}
        />
      </Card>

      {/* Parcel Details Modal */}
      {showParcelModal && selectedParcel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
                {selectedParcel.waybillNumber}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ml-2"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {/* Basic Information */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <Package className="w-4 h-4 mr-2" />
                    Basic Info
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <div>{getStatusBadge(selectedParcel.status)}</div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Destination:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{selectedParcel.destination}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Created by:</span>
                      <span className="text-gray-900 dark:text-white">{selectedParcel.createdBy?.username || 'N/A'}</span>
                    </div>
                    {selectedParcel.description && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Description:</span>
                        <p className="text-gray-900 dark:text-white mt-1">{selectedParcel.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Contact Info
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400 mb-1">Sender:</div>
                      <div className="text-gray-900 dark:text-white font-medium">{selectedParcel.sender}</div>
                      <div className="text-gray-600 dark:text-gray-300 flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {selectedParcel.senderTelephone}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400 mb-1">Receiver:</div>
                      <div className="text-gray-900 dark:text-white font-medium">{selectedParcel.receiver}</div>
                      <div className="text-gray-600 dark:text-gray-300 flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {selectedParcel.receiverTelephone}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Financial Info
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                      <span className="text-gray-900 dark:text-white font-bold text-lg">
                        {formatCurrency(selectedParcel.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Quantity:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{selectedParcel.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Payment:</span>
                      <Badge variant="gray" className="text-xs">
                        {selectedParcel.paymentMethods}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Timeline Information */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Timeline
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="text-gray-500 dark:text-gray-400">Created:</div>
                      <div className="text-gray-900 dark:text-white">
                        {new Date(selectedParcel.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-gray-600 dark:text-gray-300 text-xs">
                        {new Date(selectedParcel.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    {selectedParcel.dispatchedAt && (
                      <div>
                        <div className="text-gray-500 dark:text-gray-400">Dispatched:</div>
                        <div className="text-gray-900 dark:text-white">
                          {new Date(selectedParcel.dispatchedAt).toLocaleDateString()}
                        </div>
                        <div className="text-gray-600 dark:text-gray-300 text-xs">
                          {new Date(selectedParcel.dispatchedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 space-y-2 sm:space-y-0 sm:space-x-3 bg-white dark:bg-gray-800">
              <Button variant="outline" onClick={handleCloseModal} className="order-3 sm:order-1">
                Close
              </Button>
              <Button variant="outline" onClick={() => handleDownloadA4Receipt(selectedParcel)} className="order-1 sm:order-2">
                <Download className="w-4 h-4 mr-2" />
                A4 Receipt
              </Button>
              <Button variant="primary" onClick={() => handleDownload80mmReceipt(selectedParcel)} className="order-2 sm:order-3">
                <Download className="w-4 h-4 mr-2" />
                80mm Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parcels;