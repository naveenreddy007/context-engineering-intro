'use client'

import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Clock, AlertTriangle, User } from 'lucide-react'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'

interface TaskOverviewProps {
  userId: string
  userRole: string
}

interface Task {
  id: string
  name: string
  status: string
  priority: string
  dueDate: string
  assignedTo: {
    name: string
    email: string
  }
  event: {
    id: string
    name: string
  }
  module: {
    name: string
  }
  percentComplete: number
}

interface TaskStats {
  pending: number
  inProgress: number
  completed: number
  overdue: number
}

export function TaskOverview({ userId, userRole }: TaskOverviewProps) {
  const { data: taskData, isLoading } = useQuery({
    queryKey: ['task-overview', userId, userRole],
    queryFn: async (): Promise<{ tasks: Task[]; stats: TaskStats }> => {
      const response = await fetch(`/api/tasks/overview?userId=${userId}&role=${userRole}&limit=8`)
      if (!response.ok) {
        throw new Error('Failed to fetch task overview')
      }
      return response.json()
    },
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Task Overview</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const { tasks = [], stats = { pending: 0, inProgress: 0, completed: 0, overdue: 0 } } = taskData || {}

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'blocked':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
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

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />
      case 'medium':
        return <Clock className="h-4 w-4" />
      case 'low':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && dueDate !== null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Task Overview</h3>
          <Link
            href="/tasks"
            className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
          >
            View all
          </Link>
        </div>
      </div>
      
      {/* Task Stats */}
      <div className="p-6 border-b bg-gray-50">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {!tasks || tasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No tasks found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className={`border rounded-lg p-4 hover:shadow-sm transition-shadow ${
                isOverdue(task.dueDate) ? 'border-red-200 bg-red-50' : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {task.name}
                      </Link>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      {isOverdue(task.dueDate) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Overdue
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <span>Event:</span>
                        <Link
                          href={`/events/${task.event.id}`}
                          className="text-indigo-600 hover:text-indigo-500"
                        >
                          {task.event.name}
                        </Link>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>Module:</span>
                        <span className="font-medium">{task.module.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{task.assignedTo.name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <span className={`flex items-center space-x-1 ${getPriorityColor(task.priority)}`}>
                          {getPriorityIcon(task.priority)}
                          <span className="text-sm font-medium">{task.priority}</span>
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{task.percentComplete}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${task.percentComplete}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right text-xs text-gray-500 ml-4">
                    <div>Due: {formatRelativeTime(task.dueDate)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}