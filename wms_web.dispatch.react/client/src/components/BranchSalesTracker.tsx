import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { Card } from './ui';
import Chart from 'react-apexcharts';
import { wmsApi } from '../services/wmsApi';

interface BranchSalesData {
  branchId: number;
  branchName: string;
  dailySales: number;
  monthlySales: number;
  dailyParcels: number;
  monthlyParcels: number;
  dailyGrowth?: number;
  monthlyGrowth?: number;
}

interface BranchSalesTrackerProps {
  selectedPeriod?: 'daily' | 'monthly' | 'both';
  showCharts?: boolean;
  maxBranches?: number;
}

const BranchSalesTracker: React.FC<BranchSalesTrackerProps> = ({ 
  selectedPeriod = 'both',
  showCharts = true,
  maxBranches = 10
}) => {
  const [branchSalesData, setBranchSalesData] = useState<BranchSalesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  const loadBranchSalesData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Use the new optimized API methods
      const [dailySales, monthlySales] = await Promise.all([
        wmsApi.getDailySalesByBranch(),
        wmsApi.getMonthlySalesByBranch()
      ]);

      // Combine daily and monthly data
      const branchSales: BranchSalesData[] = monthlySales.map(monthlyBranch => {
        const dailyBranch = dailySales.find(d => d.branchId === monthlyBranch.branchId);
        
        // Calculate growth rates (simplified - comparing to previous periods)
        // You could enhance this with actual historical data
        const previousDaySales = 0; // Would need to calculate from actual data
        const previousMonthSales = 0; // Would need to calculate from actual data

        return {
          branchId: monthlyBranch.branchId,
          branchName: monthlyBranch.branchName,
          dailySales: dailyBranch?.dailySales || 0,
          monthlySales: monthlyBranch.monthlySales,
          dailyParcels: dailyBranch?.dailyParcels || 0,
          monthlyParcels: monthlyBranch.monthlyParcels,
          dailyGrowth: previousDaySales > 0 ? ((dailyBranch?.dailySales || 0 - previousDaySales) / previousDaySales) * 100 : 0,
          monthlyGrowth: previousMonthSales > 0 ? ((monthlyBranch.monthlySales - previousMonthSales) / previousMonthSales) * 100 : 0
        };
      });

      // Sort by monthly sales (highest first) and limit results
      const sortedBranchSales = branchSales
        .sort((a, b) => b.monthlySales - a.monthlySales)
        .slice(0, maxBranches);

      setBranchSalesData(sortedBranchSales);
    } catch (error) {
      console.error('Failed to load branch sales data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [maxBranches]);

  useEffect(() => {
    loadBranchSalesData();
  }, [loadBranchSalesData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatGrowth = (growth: number) => {
    return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
  };

  // Chart data for monthly sales
  const monthlyChartOptions = {
    chart: {
      type: 'bar' as const,
      height: 350,
      toolbar: { show: false }
    },
    colors: ['#3B82F6'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: branchSalesData.map(d => d.branchName)
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
    }
  };

  const monthlyChartSeries = [{
    name: 'Monthly Sales',
    data: branchSalesData.map(d => d.monthlySales)
  }];

  // Chart data for daily sales
  const dailyChartOptions = {
    chart: {
      type: 'bar' as const,
      height: 350,
      toolbar: { show: false }
    },
    colors: ['#10B981'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: branchSalesData.map(d => d.branchName)
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
    }
  };

  const dailyChartSeries = [{
    name: "Today's Sales",
    data: branchSalesData.map(d => d.dailySales)
  }];

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Branch Sales Performance</h2>
          <p className="text-gray-600 text-sm">Sales from parcels sent TO each branch (destination-based)</p>
        </div>
        
        {showCharts && (
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                viewMode === 'table'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                viewMode === 'chart'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Chart View
            </button>
          </div>
        )}
      </div>

      {viewMode === 'table' ? (
        /* Table View */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  {(selectedPeriod === 'daily' || selectedPeriod === 'both') && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Today's Sales
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parcels TO Branch
                      </th>
                    </>
                  )}
                  {(selectedPeriod === 'monthly' || selectedPeriod === 'both') && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monthly Sales
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monthly Parcels TO Branch
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {branchSalesData.map((branch) => (
                  <tr key={branch.branchId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                        <span className="text-sm font-medium text-gray-900">
                          {branch.branchName}
                        </span>
                      </div>
                    </td>
                    
                    {(selectedPeriod === 'daily' || selectedPeriod === 'both') && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(branch.dailySales)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {branch.dailyParcels} parcels
                        </td>
                      </>
                    )}
                    
                    {(selectedPeriod === 'monthly' || selectedPeriod === 'both') && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {formatCurrency(branch.monthlySales)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {branch.monthlyParcels} parcels
                        </td>
                      </>
                    )}
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-600">
                          {formatGrowth(branch.monthlyGrowth || 0)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Chart View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(selectedPeriod === 'daily' || selectedPeriod === 'both') && (
            <Card className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-green-500" />
                Daily Sales by Branch (Destination)
              </h3>
              <Chart
                options={dailyChartOptions}
                series={dailyChartSeries}
                type="bar"
                height={350}
              />
            </Card>
          )}

          {(selectedPeriod === 'monthly' || selectedPeriod === 'both') && (
            <Card className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                Monthly Sales by Branch (Destination)
              </h3>
              <Chart
                options={monthlyChartOptions}
                series={monthlyChartSeries}
                type="bar"
                height={350}
              />
            </Card>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Top Branch (Monthly)</p>
              <p className="text-lg font-bold text-blue-600">
                {branchSalesData[0]?.branchName || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                {formatCurrency(branchSalesData[0]?.monthlySales || 0)}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Branches</p>
              <p className="text-lg font-bold text-green-600">{branchSalesData.length}</p>
              <p className="text-sm text-gray-500">Active branches</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Daily Sales</p>
              <p className="text-lg font-bold text-purple-600">
                {formatCurrency(
                  branchSalesData.length > 0
                    ? branchSalesData.reduce((sum, b) => sum + b.dailySales, 0) / branchSalesData.length
                    : 0
                )}
              </p>
              <p className="text-sm text-gray-500">Per branch</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BranchSalesTracker;