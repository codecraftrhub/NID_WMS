import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  FileText,
  AlertTriangle,
  Building2,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { Card, Button } from '../components/ui';
import Chart from 'react-apexcharts';
import { wmsApi, Invoice, ContractCustomer } from '../services/wmsApi';
import { useAuth } from '../context/AuthContext';
import BranchSalesTracker from '../components/BranchSalesTracker';

interface FinancialSummary {
  totalRevenue: number;
  monthlyRevenue: number;
  dailySales: number;
  outstandingInvoices: number;
  overdueAmount: number;
  codTotal: number;
  paidTotal: number;
  totalExpenses: number;
  netProfit: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
}

const FinancialDashboard: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    dailySales: 0,
    outstandingInvoices: 0,
    overdueAmount: 0,
    codTotal: 0,
    paidTotal: 0,
    totalExpenses: 0,
    netProfit: 0
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setIsLoading(true);

      // Load invoices, parcels, and expenses data
      const [invoices, parcels, expensesSummary] = await Promise.all([
        wmsApi.getInvoices(),
        wmsApi.getParcels(),
        wmsApi.getExpensesSummary()
      ]);

      // Calculate financial summary
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const totalRevenue = parcels.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const monthlyRevenue = parcels
        .filter(p => {
          if (!p.createdAt) return false;
          const pDate = new Date(p.createdAt);
          return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

      // Calculate daily sales (current day from parcels)
      const today = new Date().toISOString().split('T')[0];
      const dailySales = parcels
        .filter(p => {
          if (!p.createdAt) return false;
          const parcelDate = new Date(p.createdAt).toISOString().split('T')[0];
          return parcelDate === today;
        })
        .reduce((sum, p) => sum + p.totalAmount, 0);

      const outstandingInvoices = invoices
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

      const overdueAmount = invoices
        .filter(inv =>
          inv.status === 'overdue' ||
          (inv.status === 'sent' && new Date(inv.dueDate) < now)
        )
        .reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

      // Calculate COD and Paid totals from parcels
      const codTotal = parcels
        .filter(p => p.paymentMethods === 'COD')
        .reduce((sum, p) => sum + p.totalAmount, 0);

      const paidTotal = parcels
        .filter(p => p.paymentMethods === 'Paid')
        .reduce((sum, p) => sum + p.totalAmount, 0);

      // Use real expense data
      const totalExpenses = expensesSummary.monthlyTotal; // Current month approved expenses
      const netProfit = monthlyRevenue - totalExpenses;

      setSummary({
        totalRevenue,
        monthlyRevenue,
        dailySales,
        outstandingInvoices,
        overdueAmount,
        codTotal,
        paidTotal,
        totalExpenses,
        netProfit
      });

      // Generate revenue chart data for last 6 months
      const chartData: RevenueData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const monthRevenue = parcels
          .filter(p => {
            if (!p.createdAt) return false;
            const pDate = new Date(p.createdAt);
            return pDate.getMonth() === date.getMonth() && pDate.getFullYear() === date.getFullYear();
          })
          .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

        // Use real expense data for current month, estimate for previous months
        const monthExpenses = (date.getMonth() === currentMonth && date.getFullYear() === currentYear) 
          ? expensesSummary.monthlyTotal 
          : monthRevenue * 0.25; // Conservative 25% estimate for historical months

        chartData.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          revenue: monthRevenue,
          expenses: monthExpenses
        });
      }
      setRevenueData(chartData);

      // Get recent invoices
      setRecentInvoices(
        invoices
          .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
          .slice(0, 5)
      );

    } catch (error) {
      console.error('Failed to load financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Chart options for revenue chart
  const chartOptions = {
    chart: {
      type: 'area' as const,
      height: 350,
      toolbar: { show: false }
    },
    colors: ['#3B82F6', '#EF4444'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' as const },
    xaxis: {
      categories: revenueData.map(d => d.month)
    },
    yaxis: {
      labels: {
        formatter: (value: number) => formatCurrency(value)
      }
    },
    tooltip: {
      y: {
        formatter: (value: number) => formatCurrency(value)
      }
    },
    legend: {
      position: 'top' as const
    }
  };

  const chartSeries = [
    {
      name: 'Revenue',
      data: revenueData.map(d => d.revenue)
    },
    {
      name: 'Expenses',
      data: revenueData.map(d => d.expenses)
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your warehouse financial performance</p>
        </div>
        <Button
          onClick={loadFinancialData}
          className="flex items-center space-x-2"
          variant="outline"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.monthlyRevenue)}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 ml-1">+12%</span>
              </div>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Sales</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.dailySales)}</p>
              <p className="text-sm text-gray-500 mt-1">Current day total</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Outstanding</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.outstandingInvoices)}</p>
              <p className="text-sm text-gray-500 mt-1">Pending collection</p>
            </div>
            <FileText className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.overdueAmount)}</p>
              <p className="text-sm text-gray-500 mt-1">Requires attention</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Profit</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.netProfit)}</p>
              <div className="flex items-center mt-1">
                <ArrowUpRight className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 ml-1">+8%</span>
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Payment Method Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">COD Collections</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.codTotal)}</p>
              <p className="text-sm text-gray-500 mt-1">Cash on delivery</p>
            </div>
            <CreditCard className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Prepaid Parcels</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.paidTotal)}</p>
              <p className="text-sm text-gray-500 mt-1">Advance payments</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
              <p className="text-sm text-gray-500 mt-1">Operational costs</p>
            </div>
            <ArrowDownRight className="w-8 h-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue vs Expenses</h3>
          <Chart
            options={chartOptions}
            series={chartSeries}
            type="area"
            height={350}
          />
        </Card>

        {/* Recent Invoices */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Invoices</h3>
          <div className="space-y-3">
            {recentInvoices.map(invoice => (
              <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">{invoice.customer?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
                  <p className={`text-sm ${invoice.status === 'paid' ? 'text-green-600' :
                      invoice.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                    {invoice.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Branch Sales Tracker */}
      <BranchSalesTracker 
        selectedPeriod="both" 
        showCharts={true}
        maxBranches={10}
        autoRefresh={true}
        refreshInterval={30000}
      />
    </div>
  );
};

export default FinancialDashboard;