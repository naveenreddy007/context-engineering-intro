// Dashboard Analytics Widgets for Event Management
// Demonstrates React components for event analytics, progress tracking, and KPI monitoring

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// Main Dashboard Component
const EventManagementDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchDashboardData(timeRange);
  }, [timeRange]);

  const fetchDashboardData = async (range) => {
    setLoading(true);
    try {
      // Mock API call - replace with actual API
      const data = await mockDashboardAPI(range);
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dashboard-container p-6 bg-gray-50 min-h-screen">
      <DashboardHeader 
        timeRange={timeRange} 
        onTimeRangeChange={setTimeRange}
        totalEvents={dashboardData.summary.totalEvents}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard 
          title="Total Events" 
          value={dashboardData.summary.totalEvents}
          change={dashboardData.summary.eventsChange}
          icon="📅"
        />
        <KPICard 
          title="Active Events" 
          value={dashboardData.summary.activeEvents}
          change={dashboardData.summary.activeEventsChange}
          icon="🎉"
        />
        <KPICard 
          title="Completed Tasks" 
          value={dashboardData.summary.completedTasks}
          change={dashboardData.summary.tasksChange}
          icon="✅"
        />
        <KPICard 
          title="Revenue" 
          value={`₹${dashboardData.summary.revenue.toLocaleString()}`}
          change={dashboardData.summary.revenueChange}
          icon="💰"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <EventProgressChart data={dashboardData.eventProgress} />
        <TaskStatusDistribution data={dashboardData.taskDistribution} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <VendorPerformanceChart data={dashboardData.vendorPerformance} />
        <RevenueByEventType data={dashboardData.revenueByType} />
        <UpcomingDeadlines data={dashboardData.upcomingDeadlines} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivities data={dashboardData.recentActivities} />
        <EventCalendarWidget data={dashboardData.upcomingEvents} />
      </div>
    </div>
  );
};

// Dashboard Header Component
const DashboardHeader = ({ timeRange, onTimeRangeChange, totalEvents }) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Event Management Dashboard</h1>
        <p className="text-gray-600 mt-2">Managing {totalEvents} events across all categories</p>
      </div>
      <div className="flex items-center space-x-4">
        <select 
          value={timeRange} 
          onChange={(e) => onTimeRangeChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Export Report
        </button>
      </div>
    </div>
  );
};

// KPI Card Component
const KPICard = ({ title, value, change, icon }) => {
  const isPositive = change >= 0;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
      <div className="mt-4 flex items-center">
        <span className={`text-sm font-medium ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          {isPositive ? '↗' : '↘'} {Math.abs(change)}%
        </span>
        <span className="text-sm text-gray-500 ml-2">vs last period</span>
      </div>
    </div>
  );
};

// Event Progress Chart
const EventProgressChart = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Progress Overview</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="eventName" angle={-45} textAnchor="end" height={80} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
          <Bar dataKey="inProgress" stackId="a" fill="#f59e0b" name="In Progress" />
          <Bar dataKey="pending" stackId="a" fill="#ef4444" name="Pending" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Task Status Distribution
const TaskStatusDistribution = ({ data }) => {
  const COLORS = {
    completed: '#10b981',
    inProgress: '#f59e0b',
    pending: '#ef4444',
    blocked: '#8b5cf6'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Vendor Performance Chart
const VendorPerformanceChart = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vendor Performance</h3>
      <div className="space-y-4">
        {data.map((vendor, index) => (
          <div key={vendor.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                {index + 1}
              </div>
              <div>
                <p className="font-medium text-gray-900">{vendor.name}</p>
                <p className="text-sm text-gray-500">{vendor.category}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-900">{vendor.completionRate}%</p>
              <p className="text-sm text-gray-500">{vendor.tasksCompleted} tasks</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Revenue by Event Type
const RevenueByEventType = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Event Type</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="revenue"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Upcoming Deadlines Widget
const UpcomingDeadlines = ({ data }) => {
  const getUrgencyColor = (daysLeft) => {
    if (daysLeft <= 1) return 'text-red-600 bg-red-50';
    if (daysLeft <= 3) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h3>
      <div className="space-y-3">
        {data.map((deadline) => (
          <div key={deadline.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">{deadline.taskName}</p>
              <p className="text-sm text-gray-500">{deadline.eventName}</p>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              getUrgencyColor(deadline.daysLeft)
            }`}>
              {deadline.daysLeft === 0 ? 'Today' : 
               deadline.daysLeft === 1 ? 'Tomorrow' : 
               `${deadline.daysLeft} days`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Recent Activities Widget
const RecentActivities = ({ data }) => {
  const getActivityIcon = (type) => {
    const icons = {
      task_completed: '✅',
      task_assigned: '📋',
      event_created: '🎉',
      payment_received: '💰',
      vendor_assigned: '👥'
    };
    return icons[type] || '📝';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
      <div className="space-y-4">
        {data.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className="text-xl">{getActivityIcon(activity.type)}</div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">{activity.description}</p>
              <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Event Calendar Widget
const EventCalendarWidget = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
      <div className="space-y-4">
        {data.map((event) => (
          <div key={event.id} className="border-l-4 border-blue-500 pl-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">{event.name}</p>
                <p className="text-sm text-gray-500">{event.type} • {event.guestCount} guests</p>
                <p className="text-sm text-gray-500">{event.venue}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{event.date}</p>
                <p className="text-xs text-gray-500">{event.time}</p>
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${event.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{event.progress}% complete</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Loading Skeleton
const DashboardSkeleton = () => {
  return (
    <div className="dashboard-container p-6 bg-gray-50 min-h-screen animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-1/3 mb-8"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-300 rounded w-3/4"></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Mock API function
const mockDashboardAPI = async (timeRange) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    summary: {
      totalEvents: 45,
      eventsChange: 12,
      activeEvents: 18,
      activeEventsChange: 8,
      completedTasks: 234,
      tasksChange: 15,
      revenue: 2450000,
      revenueChange: 22
    },
    eventProgress: [
      { eventName: 'Rajesh Wedding', completed: 15, inProgress: 8, pending: 3 },
      { eventName: 'Priya Birthday', completed: 12, inProgress: 4, pending: 2 },
      { eventName: 'Corporate Event', completed: 20, inProgress: 5, pending: 1 },
      { eventName: 'Anniversary', completed: 8, inProgress: 6, pending: 4 }
    ],
    taskDistribution: [
      { name: 'completed', value: 156 },
      { name: 'inProgress', value: 45 },
      { name: 'pending', value: 23 },
      { name: 'blocked', value: 8 }
    ],
    vendorPerformance: [
      { id: 1, name: 'Floral Decorators Ltd', category: 'Decoration', completionRate: 95, tasksCompleted: 28 },
      { id: 2, name: 'Spice Garden Catering', category: 'Food', completionRate: 92, tasksCompleted: 35 },
      { id: 3, name: 'Light & Sound Pro', category: 'Lighting', completionRate: 88, tasksCompleted: 22 },
      { id: 4, name: 'Capture Moments', category: 'Photography', completionRate: 85, tasksCompleted: 18 }
    ],
    revenueByType: [
      { name: 'Weddings', revenue: 1500000 },
      { name: 'Birthdays', revenue: 450000 },
      { name: 'Corporate', revenue: 350000 },
      { name: 'Anniversaries', revenue: 150000 }
    ],
    upcomingDeadlines: [
      { id: 1, taskName: 'Stage Setup', eventName: 'Rajesh Wedding', daysLeft: 0 },
      { id: 2, taskName: 'Menu Finalization', eventName: 'Priya Birthday', daysLeft: 1 },
      { id: 3, taskName: 'Venue Booking', eventName: 'Corporate Event', daysLeft: 3 },
      { id: 4, taskName: 'Invitation Printing', eventName: 'Anniversary', daysLeft: 5 }
    ],
    recentActivities: [
      { id: 1, type: 'task_completed', description: 'Stage decoration completed for Rajesh Wedding', timestamp: '2 hours ago' },
      { id: 2, type: 'payment_received', description: 'Payment received from Priya Birthday event', timestamp: '4 hours ago' },
      { id: 3, type: 'vendor_assigned', description: 'Photographer assigned to Corporate Event', timestamp: '6 hours ago' },
      { id: 4, type: 'event_created', description: 'New anniversary event created', timestamp: '1 day ago' }
    ],
    upcomingEvents: [
      { 
        id: 1, 
        name: 'Rajesh & Priya Wedding', 
        type: 'Wedding', 
        date: 'Feb 15, 2024', 
        time: '10:00 AM',
        venue: 'Grand Palace, Hyderabad', 
        guestCount: 500, 
        progress: 75 
      },
      { 
        id: 2, 
        name: 'Arjun Birthday Party', 
        type: 'Birthday', 
        date: 'Feb 20, 2024', 
        time: '6:00 PM',
        venue: 'Community Hall', 
        guestCount: 50, 
        progress: 45 
      },
      { 
        id: 3, 
        name: 'Tech Corp Annual Meet', 
        type: 'Corporate', 
        date: 'Feb 25, 2024', 
        time: '9:00 AM',
        venue: 'Convention Center', 
        guestCount: 200, 
        progress: 30 
      }
    ]
  };
};

export default EventManagementDashboard;
export {
  KPICard,
  EventProgressChart,
  TaskStatusDistribution,
  VendorPerformanceChart,
  RevenueByEventType,
  UpcomingDeadlines,
  RecentActivities,
  EventCalendarWidget
};