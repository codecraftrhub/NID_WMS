import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Parcel } from '../services/wmsApi';

export interface ExportOptions {
  title?: string;
  filename?: string;
  includeFilters?: boolean;
  filterSummary?: string;
}

/**
 * Export parcels data to PDF
 * @param parcels - Array of parcel data to export
 * @param options - Export configuration options
 */
export const exportParcelsToPDF = (parcels: Parcel[], options: ExportOptions = {}) => {
  const {
    title = 'Parcels Export Report',
    filename = 'parcels-export.pdf',
    includeFilters = false,
    filterSummary = ''
  } = options;

  // Create new PDF document
  const doc = new jsPDF('landscape', 'mm', 'a4');

  // Add header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 22);

  // Add company info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('NID Logistics Dispatch System', 14, 30);
  
  // Add export date
  const exportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Exported on: ${exportDate}`, 14, 36);

  // Add filter summary if provided
  let yPosition = 42;
  if (includeFilters && filterSummary) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`Filters Applied: ${filterSummary}`, 14, yPosition);
    yPosition += 6;
  }

  // Add summary statistics
  const totalParcels = parcels.length;

  // Calculate payment method distribution
  const paymentDistribution = parcels.reduce((acc, p) => {
    const paymentMethod = p.paymentMethods?.toLowerCase() || 'unknown';
    const amount = p.totalAmount || 0;
    
    if (paymentMethod.includes('cod')) {
      acc.cod += amount;
    } else if (paymentMethod.includes('contract')) {
      acc.contract += amount;
    } else if (paymentMethod.includes('paid')) {
      acc.paid += amount;
    } else {
      acc.other += amount;
    }
    return acc;
  }, { cod: 0, contract: 0, paid: 0, other: 0 });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Parcels: ${totalParcels}`, 14, yPosition);
  yPosition += 6;

  // Helper function to get status label
  function getStatusLabel(status: number): string {
    const statusMap = {
      0: 'Pending',
      1: 'Finalized', 
      2: 'In Transit',
      3: 'Delivered',
      4: 'Cancelled'
    };
    return statusMap[status as keyof typeof statusMap] || 'Unknown';
  }

  // Prepare table data
  const tableHeaders = [
    'Waybill',
    'Date',
    'Sender',
    'Receiver', 
    'Destination',
    'Quantity',
    'Amount (KES)',
    'Payment',
    'Status',
    'Created By',
    'Delivered By',
    'Receiver Signature'
  ];

  const tableData = parcels.map(parcel => [
    parcel.waybillNumber || '',
    new Date(parcel.createdAt).toLocaleDateString('en-US'),
    `${parcel.sender || ''}${parcel.senderTelephone ? '\n' + parcel.senderTelephone : ''}`,
    `${parcel.receiver || ''}${parcel.receiverTelephone ? '\n' + parcel.receiverTelephone : ''}`,
    parcel.destination || '',
    parcel.quantity?.toString() || '0',
    (parcel.totalAmount || 0).toLocaleString(),
    parcel.paymentMethods || '',
    getStatusLabel(parcel.status),
    parcel.createdBy?.name || parcel.createdBy?.username || parcel.createdBy?.firstName || (typeof parcel.createdBy === 'string' ? parcel.createdBy : '') || '',
    '', // Delivered By - empty for now
    '' // Receiver Signature - empty for now
  ]);

  // Add table
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: yPosition,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [41, 128, 185], // Blue header
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245] // Light gray for alternate rows
    },
    columnStyles: {
      0: { cellWidth: 20 }, // Waybill
      1: { cellWidth: 18 }, // Date
      2: { cellWidth: 25 }, // Sender
      3: { cellWidth: 25 }, // Receiver
      4: { cellWidth: 20 }, // Destination
      5: { cellWidth: 12 }, // Quantity
      6: { cellWidth: 18 }, // Amount
      7: { cellWidth: 15 }, // Payment
      8: { cellWidth: 15 }, // Status
      9: { cellWidth: 18 }, // Created By
      10: { cellWidth: 18 }, // Delivered By
      11: { cellWidth: 20 }  // Receiver Signature
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Add page numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = data.pageNumber;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 10
      );
    }
  });

  // Add footer with summary on last page
  const finalY = (doc as any).lastAutoTable.finalY || yPosition + 50;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary:', 14, finalY + 15);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method Distribution:', 14, finalY + 22);
  
  doc.setFont('helvetica', 'normal');
  let summaryY = finalY + 28;
  
  if (paymentDistribution.cod > 0) {
    doc.text(`COD: KES ${paymentDistribution.cod.toLocaleString()}`, 14, summaryY);
    summaryY += 5;
  }
  if (paymentDistribution.contract > 0) {
    doc.text(`Contract: KES ${paymentDistribution.contract.toLocaleString()}`, 14, summaryY);
    summaryY += 5;
  }
  if (paymentDistribution.paid > 0) {
    doc.text(`Paid: KES ${paymentDistribution.paid.toLocaleString()}`, 14, summaryY);
    summaryY += 5;
  }
  if (paymentDistribution.other > 0) {
    doc.text(`Other: KES ${paymentDistribution.other.toLocaleString()}`, 14, summaryY);
    summaryY += 5;
  }

  // Save the PDF
  doc.save(filename);
};

/**
 * Generate filter summary text from filter state
 * @param filters - Current filter state
 * @returns Human readable filter summary
 */
export const generateFilterSummary = (filters: any): string => {
  const activeFilters: string[] = [];

  if (filters.search) {
    activeFilters.push(`Search: "${filters.search}"`);
  }
  
  if (filters.status && filters.status !== 'all') {
    const statusMap: Record<string, string> = {
      '0': 'Pending',
      '1': 'Finalized',
      '2': 'In Transit', 
      '3': 'Delivered',
      '4': 'Cancelled'
    };
    activeFilters.push(`Status: ${statusMap[filters.status] || filters.status}`);
  }

  if (filters.destination) {
    activeFilters.push(`Destination: ${filters.destination}`);
  }

  if (filters.paymentMethod && filters.paymentMethod !== 'all') {
    activeFilters.push(`Payment: ${filters.paymentMethod}`);
  }

  if (filters.dateRange.from || filters.dateRange.to) {
    const from = filters.dateRange.from || 'Start';
    const to = filters.dateRange.to || 'End';
    activeFilters.push(`Date: ${from} to ${to}`);
  }

  if (filters.amountRange.from || filters.amountRange.to) {
    const from = filters.amountRange.from || '0';
    const to = filters.amountRange.to || '∞';
    activeFilters.push(`Amount: KES ${from} to ${to}`);
  }

  if (filters.sender) {
    activeFilters.push(`Sender: ${filters.sender}`);
  }

  if (filters.receiver) {
    activeFilters.push(`Receiver: ${filters.receiver}`);
  }

  return activeFilters.length > 0 ? activeFilters.join(', ') : 'No filters applied';
};