'use client'

import { useQuery } from '@tanstack/react-query'
import { Clock, AlertTriangle, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatRelativeTime, formatDate } from '@/lib/utils'

interface UpcomingDeadlinesProps {
  userId: string
  userRole: string
}

interface Deadline {
  id: string
  type: 'task' | 'event'
  title: string
  dueDate: string
  priority: string
  status: string
  eventName?: string
  eventId?: string
  isOverdue: boolean
  daysUntilDue: number
}

export function UpcomingDeadlines({ userId, userRole }: UpcomingDeadlinesProps) {
  const { data: deadlines, isLoading } = useQuery({
    queryKey: ['upcoming-deadlines', userId, userRole],
    queryFn: async (): Promise<Deadline[]> => {
      const response = await fetch(`/api/deadlines/upcoming?userId=${userId}&role=${userRole}&limit=10`)
      if (!response.ok) {
        throw new Error('Failed to fetch upcoming deadlines')
      }
      return response.json()
    },
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const getPriorityColor = (priority: string, isOverdue: boolean) => {
    if (isOverdue) return 'text-red-600'
    
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const getPriorityIcon = (priority: string, isOverdue: boolean) => {
    if (isOverdue) return <AlertTriangle className="h-4 w-4" />
    
    switch (priority.toLowerCase()) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />
      case 'medium':
        return <Clock className="h-4 w-4" />
      case 'low':
        return <Calendar className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getUrgencyColor = (daysUntilDue: number, isOverdue: boolean) => {
    if (isOverdue) return 'border-l-red-500 bg-red-50'
    if (daysUntilDue <= 1) return 'border-l-red-500 bg-red-50'
    if (daysUntilDue <= 3) return 'border-l-yellow-500 bg-yellow-50'
    if (daysUntilDue <= 7) return 'border-l-blue-500 bg-blue-50'
    return 'border-l-gray-300 bg-white'
  }

  const getTimeText = (deadline: Deadline) => {
    if (deadline.isOverdue) {
      return `Overdue by ${Math.abs(deadline.daysUntilDue)} day${Math.abs(deadline.daysUntilDue) !== 1 ? 's' : ''}`
    }
    if (deadline.daysUntilDue === 0) {
      return 'Due today'
    }
    if (deadline.daysUntilDue === 1) {
      return 'Due tomorrow'
    }
    return `Due in ${deadline.daysUntilDue} days`
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
          <Link
            href="/deadlines"
            className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
          >
            View all
          </Link>
        </div>
        <p className="text-sm text-gray-600 mt-1">Tasks and events due soon</p>
      </div>
      
      <div className="p-6">
        {!deadlines || deadlines.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No upcoming deadlines</p>
            <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deadlines.map((deadline) => (
              <div
                key={`${deadline.type}-${deadline.id}`}
                className={`border-l-4 pl-4 py-3 rounded-r-lg transition-colors hover:shadow-sm ${
                  getUrgencyColor(deadline.daysUntilDue, deadline.isOverdue)
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Link
                        href={deadline.type === 'task' ? `/tasks/${deadline.id}` : `/events/${deadline.id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600 text-sm"
                      >
                        {deadline.title}
                      </Link>
                      <span className={`flex items-center space-x-1 ${getPriorityColor(deadline.priority, deadline.isOverdue)}`}>
                        {getPriorityIcon(deadline.priority, deadline.isOverdue)}
                      </span>
                    </div>
                    
                    {deadline.eventName && deadline.type === 'task' && (
                      <div className="text-xs text-gray-600 mb-2">
                        Event: 
                        <Link
                          href={`/events/${deadline.eventId}`}
                          className="text-indigo-600 hover:text-indigo-500 ml-1"
                        >
                          {deadline.eventName}
                        </Link>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          deadline.type === 'task' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {deadline.type}
                        </span>
                        <span className={`text-xs font-medium ${
                          deadline.isOverdue ? 'text-red-600' : 
                          deadline.daysUntilDue <= 1 ? 'text-red-600' :
                          deadline.daysUntilDue <= 3 ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {getTimeText(deadline)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-1">
                      Due: {formatDate(deadline.dueDate)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Summary at bottom */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {deadlines.filter(d => d.isOverdue).length} overdue, 
                  {deadlines.filter(d => !d.isOverdue && d.daysUntilDue <= 3).length} urgent
                </span>
                <Link
                  href="/calendar"
                  className="text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  View Calendar
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}