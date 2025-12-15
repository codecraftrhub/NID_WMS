import React from 'react';
import { Invoice } from '../services/wmsApi';

interface InvoicePrintViewProps {
  invoice: Invoice;
}

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({ invoice }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE');
  };

  return (
    <div className="print-invoice bg-white">
      <style>{`
        @media print {
          .print-invoice {
            width: 210mm;
            margin: 0 auto;
            padding: 20mm;
            font-size: 12pt;
            line-height: 1.4;
            color: black;
          }
          
          .print-header {
            border-bottom: 2px solid #333;
            margin-bottom: 20px;
            padding-bottom: 15px;
          }
          
          .print-company-name {
            font-size: 24pt;
            font-weight: bold;
            color: #333;
          }
          
          .print-invoice-title {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 10px;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          .print-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          
          .print-summary {
            float: right;
            width: 300px;
            margin-top: 20px;
          }
          
          .print-summary-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
          }
          
          .print-total-row {
            font-weight: bold;
            font-size: 14pt;
            border-top: 2px solid #333 !important;
            border-bottom: 2px solid #333 !important;
            padding: 10px 0 !important;
          }
          
          .print-footer {
            position: fixed;
            bottom: 10mm;
            width: 100%;
            text-align: center;
            font-size: 10pt;
            color: #666;
          }
        }
        
        @page {
          margin: 15mm;
          size: A4;
        }
      `}</style>

      {/* Header */}
      <div className="print-header">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="print-company-name">NID LOGISTICS LTD</h1>
            <p className="text-gray-600">Efficiency in Motion</p>
            <p className="text-sm text-gray-500 mt-2">
              Tel: +254 700 000 000 | Email: info@nidlogistics.co.ke<br/>
              P.O. Box 12345-00100, Nairobi | www.nidlogistics.co.ke
            </p>
          </div>
          <div className="text-right">
            <h2 className="print-invoice-title">INVOICE</h2>
            <div className="space-y-1 text-sm">
              <div><strong>Invoice #:</strong> {invoice.invoiceNumber}</div>
              <div><strong>Date:</strong> {formatDate(invoice.issueDate)}</div>
              <div><strong>Due Date:</strong> {formatDate(invoice.dueDate)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bill To Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
        <div>
          <h3 className="font-bold text-lg mb-2">Bill To:</h3>
          <div className="space-y-1">
            <div className="font-semibold">{invoice.customer?.name || 'Unknown Customer'}</div>
            <div>{invoice.customer?.companyName}</div>
            <div>{invoice.customer?.address}</div>
            <div>Email: {invoice.customer?.email}</div>
            <div>Phone: {invoice.customer?.phone}</div>
          </div>
        </div>
        
        <div>
          <h3 className="font-bold text-lg mb-2">Invoice Details:</h3>
          <div className="space-y-1 text-sm">
            <div><strong>Billing Period:</strong></div>
            <div>{formatDate(invoice.billingPeriodStart)} to {formatDate(invoice.billingPeriodEnd)}</div>
            <div className="mt-2"><strong>Payment Terms:</strong> {invoice.customer?.paymentTerms || 'Net 30'}</div>
            <div><strong>Created By:</strong> {invoice.createdBy ? `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}` : 'System'}</div>
          </div>
        </div>
      </div>

      {/* Invoice Items Table */}
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-3">Items & Services</h3>
        <table className="print-table w-full">
          <thead>
            <tr>
              <th className="text-left">Waybill Number</th>
              <th className="text-left">Description</th>
              <th className="text-center">Qty</th>
              <th className="text-right">Unit Price</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.waybillNumber}</td>
                  <td>{item.description}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-4">
                  No items found for this invoice
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="flex justify-end">
        <div className="print-summary bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold text-lg mb-3">Invoice Summary</h3>
          
          <div className="print-summary-row">
            <span>Subtotal (excl. VAT):</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          
          <div className="print-summary-row">
            <span>VAT (16%):</span>
            <span>{formatCurrency(invoice.taxAmount)}</span>
          </div>
          
          <div className="print-summary-row print-total-row">
            <span>Total Amount:</span>
            <span>{formatCurrency(invoice.totalAmount)}</span>
          </div>
          
          <div className="print-summary-row">
            <span>Amount Paid:</span>
            <span className="text-green-600">{formatCurrency(invoice.paidAmount)}</span>
          </div>
          
          <div className="print-summary-row">
            <span>Outstanding Balance:</span>
            <span className={invoice.totalAmount - invoice.paidAmount > 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
              {formatCurrency(invoice.totalAmount - invoice.paidAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {invoice.notes && (
        <div className="mt-6">
          <h3 className="font-bold text-lg mb-2">Notes:</h3>
          <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
            <p>{invoice.notes}</p>
          </div>
        </div>
      )}

      {/* Payment Information */}
      <div className="mt-8 border-t pt-6">
        <h3 className="font-bold text-lg mb-3">Payment Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold mb-2">M-PESA Payment Details:</h4>
            <div className="space-y-1">
              <div><strong>Paybill:</strong> 522533</div>
              <div><strong>Account Number:</strong> 1329713648</div>
              <div><strong>Till Number:</strong> 4214115 (Direct-pay clients only)</div>
              <div><strong>Account Name:</strong> NID LOGISTICS</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Payment Instructions:</h4>
            <div className="space-y-1">
              <div>• Payment is due within {invoice.customer?.paymentTerms || 'Net 30'}</div>
              <div>• Paybill: 522533, Account: 1329713648</div>
              <div>• Mpesa Till: 4214115</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="print-footer">
        <div className="text-center border-t pt-4">
          <p>Thank you for your business!</p>
          <p>NID LOGISTICS LTD - Efficiency in Motion</p>
          <p>Generated on {new Date().toLocaleDateString('en-KE')} | Invoice #{invoice.invoiceNumber}</p>
        </div>
      </div>
    </div>
  );
};

// Utility function to print invoice
export const printInvoice = (invoice: Invoice) => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the invoice');
    return;
  }

  // Create the HTML content
  const printContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.4;
          color: #333;
        }
        
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          background: white;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .company-info h1 {
          font-size: 28px;
          color: #333;
          margin-bottom: 5px;
        }
        
        .invoice-info h2 {
          font-size: 24px;
          margin-bottom: 10px;
        }
        
        .billing-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 30px;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        .items-table th,
        .items-table td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        
        .items-table th {
          background-color: #f8f9fa;
          font-weight: bold;
        }
        
        .items-table .text-right {
          text-align: right;
        }
        
        .items-table .text-center {
          text-align: center;
        }
        
        .summary {
          float: right;
          width: 300px;
          margin-top: 20px;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        
        .summary-row.total {
          font-weight: bold;
          font-size: 16px;
          border-top: 2px solid #333;
          border-bottom: 2px solid #333;
          padding: 12px 0;
        }
        
        @media print {
          body {
            print-color-adjust: exact;
          }
          
          .invoice-container {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        ${generateInvoiceHTML(invoice)}
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
};

// Helper function to generate invoice HTML
const generateInvoiceHTML = (invoice: Invoice) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE');
  };

  return `
    <div class="header">
      <div class="company-info">
        <h1>NID LOGISTICS LTD</h1>
        <p>Efficiency in Motion</p>
        <p style="margin-top: 5px; color: #666;">Tel: +254 700 000 000 | Email: info@nidlogistics.co.ke<br/>P.O. Box 12345-00100, Nairobi | www.nidlogistics.co.ke</p>
      </div>
      <div class="invoice-info">
        <h2>INVOICE</h2>
        <div style="margin-top: 10px;">
          <div><strong>Invoice #:</strong> ${invoice.invoiceNumber}</div>
          <div><strong>Date:</strong> ${formatDate(invoice.issueDate)}</div>
          <div><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</div>
        </div>
      </div>
    </div>

    <div class="billing-section">
      <div>
        <h3 style="margin-bottom: 10px;">Bill To:</h3>
        <div style="line-height: 1.6;">
          <div style="font-weight: bold;">${invoice.customer?.name || 'Unknown Customer'}</div>
          <div>${invoice.customer?.companyName || ''}</div>
          <div>${invoice.customer?.address || ''}</div>
          <div>Email: ${invoice.customer?.email || ''}</div>
          <div>Phone: ${invoice.customer?.phone || ''}</div>
        </div>
      </div>
      
      <div>
        <h3 style="margin-bottom: 10px;">Invoice Details:</h3>
        <div style="line-height: 1.6;">
          <div><strong>Billing Period:</strong></div>
          <div>${formatDate(invoice.billingPeriodStart)} to ${formatDate(invoice.billingPeriodEnd)}</div>
          <div style="margin-top: 10px;"><strong>Payment Terms:</strong> ${invoice.customer?.paymentTerms || 'Net 30'}</div>
          <div><strong>Created By:</strong> ${invoice.createdBy ? `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}` : 'System'}</div>
        </div>
      </div>
    </div>

    <div>
      <h3 style="margin-bottom: 15px;">Items & Services</h3>
      <table class="items-table">
        <thead>
          <tr>
            <th>Waybill Number</th>
            <th>Description</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items && invoice.items.length > 0 ? 
            invoice.items.map(item => `
              <tr>
                <td>${item.waybillNumber}</td>
                <td>${item.description}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                <td class="text-right" style="font-weight: 500;">${formatCurrency(item.totalPrice)}</td>
              </tr>
            `).join('') :
            '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">No items found for this invoice</td></tr>'
          }
        </tbody>
      </table>
    </div>

    <div class="summary">
      <h3 style="margin-bottom: 15px;">Invoice Summary</h3>
      
      <div class="summary-row">
        <span>Subtotal (excl. VAT):</span>
        <span>${formatCurrency(invoice.subtotal)}</span>
      </div>
      
      <div class="summary-row">
        <span>VAT (16%):</span>
        <span>${formatCurrency(invoice.taxAmount)}</span>
      </div>
      
      <div class="summary-row total">
        <span>Total Amount:</span>
        <span>${formatCurrency(invoice.totalAmount)}</span>
      </div>
      
      <div class="summary-row">
        <span>Amount Paid:</span>
        <span style="color: #059669;">${formatCurrency(invoice.paidAmount)}</span>
      </div>
      
      <div class="summary-row">
        <span>Outstanding Balance:</span>
        <span style="color: ${invoice.totalAmount - invoice.paidAmount > 0 ? '#dc2626' : '#059669'}; font-weight: bold;">
          ${formatCurrency(invoice.totalAmount - invoice.paidAmount)}
        </span>
      </div>
    </div>

    <div style="clear: both; margin-top: 40px;">
      ${invoice.notes ? `
        <div style="margin-bottom: 30px;">
          <h3 style="margin-bottom: 10px;">Notes:</h3>
          <div style="background-color: #fefce8; padding: 15px; border-left: 4px solid #facc15; border-radius: 4px;">
            <p>${invoice.notes}</p>
          </div>
        </div>
      ` : ''}

      <div style="border-top: 1px solid #ddd; padding-top: 30px;">
        <h3 style="margin-bottom: 15px;">Payment Information</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <div>
            <h4 style="margin-bottom: 10px; font-weight: 600;">M-PESA Payment Details:</h4>
            <div style="line-height: 1.6; font-size: 14px;">
              <div><strong>Paybill:</strong> 522533</div>
              <div><strong>Account Number:</strong> 1329713648</div>
              <div><strong>Till Number:</strong> 4214115 (Direct-pay clients only)</div>
              <div><strong>Account Name:</strong> NID LOGISTICS</div>
            </div>
          </div>
          
          <div>
            <h4 style="margin-bottom: 10px; font-weight: 600;">Payment Instructions:</h4>
            <div style="line-height: 1.6; font-size: 14px;">
              <div>• Payment is due within ${invoice.customer?.paymentTerms || 'Net 30'}</div>
              <div>• Paybill: 522533, Account: 1329713648</div>
              <div>• Mpesa Till: 4214115</div>
            </div>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 12px;">
        <p>Thank you for your business!</p>
        <p>NID LOGISTICS LTD - Efficiency in Motion</p>
        <p>Generated on ${new Date().toLocaleDateString('en-KE')} | Invoice #${invoice.invoiceNumber}</p>
      </div>
    </div>
  `;
};