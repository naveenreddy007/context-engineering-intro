'use client'

import { useQuery } from '@tanstack/react-query'
import { Calendar, CheckCircle, Clock, Users } from 'lucide-react'

interface DashboardStatsProps {
  userId: string
  userRole: string
}

interface StatsData {
  totalEvents: number
  activeEvents: number
  completedTasks: number
  pendingTasks: number
  totalUsers: number
  upcomingDeadlines: number
}

export function DashboardStats({ userId, userRole }: DashboardStatsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', userId, userRole],
    queryFn: async (): Promise<StatsData> => {
      const response = await fetch(`/api/dashboard/stats?userId=${userId}&role=${userRole}`)
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }
      return response.json()
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Events',
      value: stats?.totalEvents || 0,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Events this month'
    },
    {
      title: 'Active Events',
      value: stats?.activeEvents || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Currently in progress'
    },
    {
      title: 'Completed Tasks',
      value: stats?.completedTasks || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Tasks finished'
    },
    {
      title: userRole === 'ADMIN' ? 'Total Users' : 'Pending Tasks',
      value: userRole === 'ADMIN' ? (stats?.totalUsers || 0) : (stats?.pendingTasks || 0),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: userRole === 'ADMIN' ? 'System users' : 'Tasks to complete'
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const IconComponent = stat.icon
        return (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <IconComponent className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}