'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { MainLayout } from '@/components/layout/main-layout'
import {
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  CheckSquare,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ReportData {
  summary: {
    totalRevenue: number
    totalEvents: number
    totalClients: number
    completedTasks: number
    revenueGrowth: number
    eventsGrowth: number
    clientsGrowth: number
    tasksGrowth: number
  }
  monthlyRevenue: Array<{
    month: string
    revenue: number
    events: number
  }>
  eventsByType: Array<{
    type: string
    count: number
    revenue: number
  }>
  topClients: Array<{
    id: string
    name: string
    totalSpent: number
    eventsCount: number
  }>
  taskCompletion: Array<{
    date: string
    completed: number
    pending: number
  }>
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const [dateRange, setDateRange] = useState('last_30_days')
  const [reportType, setReportType] = useState('overview')

  const { data: reportData, isLoading, error, refetch } = useQuery({
    queryKey: ['reports', dateRange, reportType],
    queryFn: async (): Promise<ReportData> => {
      const params = new URLSearchParams({
        dateRange,
        type: reportType
      })
      
      const response = await fetch(`/api/reports?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch report data')
      }
      return response.json()
    },
    enabled: !!session?.user
  })

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await fetch(`/api/reports/export?format=${format}&dateRange=${dateRange}&type=${reportType}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `report_${dateRange}_${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <MainLayout title="Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">
              Track performance and gain insights into your business
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_3_months">Last 3 Months</option>
                <option value="last_6_months">Last 6 Months</option>
                <option value="last_year">Last Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="overview">Overview</option>
                <option value="revenue">Revenue Analysis</option>
                <option value="events">Events Performance</option>
                <option value="clients">Client Analysis</option>
                <option value="tasks">Task Performance</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <p className="text-red-600">Error loading report data. Please try again.</p>
          </div>
        ) : reportData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(reportData.summary.totalRevenue)}
                    </p>
                    <p className={`text-sm ${reportData.summary.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      {reportData.summary.revenueGrowth >= 0 ? '+' : ''}{reportData.summary.revenueGrowth.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Events</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.summary.totalEvents}
                    </p>
                    <p className={`text-sm ${reportData.summary.eventsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      {reportData.summary.eventsGrowth >= 0 ? '+' : ''}{reportData.summary.eventsGrowth.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Clients</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.summary.totalClients}
                    </p>
                    <p className={`text-sm ${reportData.summary.clientsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      {reportData.summary.clientsGrowth >= 0 ? '+' : ''}{reportData.summary.clientsGrowth.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckSquare className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.summary.completedTasks}
                    </p>
                    <p className={`text-sm ${reportData.summary.tasksGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      {reportData.summary.tasksGrowth >= 0 ? '+' : ''}{reportData.summary.tasksGrowth.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Revenue Chart */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Revenue Trend</h3>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {reportData.monthlyRevenue.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-indigo-600 rounded-t"
                        style={{
                          height: `${(item.revenue / Math.max(...reportData.monthlyRevenue.map(r => r.revenue))) * 200}px`
                        }}
                        title={`${item.month}: ${formatCurrency(item.revenue)}`}
                      ></div>
                      <span className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-left">
                        {item.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events by Type */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Events by Type</h3>
                <div className="space-y-4">
                  {reportData.eventsByType.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 rounded-full bg-indigo-600"></div>
                        <span className="text-sm font-medium text-gray-900 capitalize">{item.type}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{item.count} events</div>
                        <div className="text-xs text-gray-600">{formatCurrency(item.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tables Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Clients */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Top Clients</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {reportData.topClients.map((client, index) => (
                    <div key={client.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-600">{client.eventsCount} events</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(client.totalSpent)}
                        </p>
                        <p className="text-xs text-gray-600">#{index + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Completion Trend */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Task Completion Trend</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {reportData.taskCompletion.slice(-7).map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{formatDate(item.date)}</span>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-sm text-gray-900">{item.completed} completed</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className="text-sm text-gray-900">{item.pending} pending</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </MainLayout>
  )
}