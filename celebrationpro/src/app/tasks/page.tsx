'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  User,
  Plus,
  Search,
  Filter,
  Calendar,
  Flag,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  dueDate: string
  assignedTo: string
  assignedToName: string
  eventId: string
  eventName: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

interface TasksResponse {
  tasks: Task[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function TasksPage() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const { data: tasksData, isLoading, error } = useQuery({
    queryKey: ['tasks', currentPage, searchTerm, statusFilter, priorityFilter],
    queryFn: async (): Promise<TasksResponse> => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(priorityFilter !== 'all' && { priority: priorityFilter })
      })
      
      const response = await fetch(`/api/tasks?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      return response.json()
    },
    enabled: !!session?.user
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'overdue':
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
        return <Flag className="h-4 w-4" />
      case 'low':
        return <Flag className="h-4 w-4" />
      default:
        return <Flag className="h-4 w-4" />
    }
  }

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== 'completed'
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <MainLayout title="Tasks">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600 mt-1">
              Manage and track all your tasks
            </p>
          </div>
          <Link
            href="/tasks/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-sm border">
          {isLoading ? (
            <div className="p-8">
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
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">Error loading tasks. Please try again.</p>
            </div>
          ) : !tasksData?.tasks?.length ? (
            <div className="p-8 text-center">
              <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No tasks found</p>
              <Link
                href="/tasks/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Task
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {tasksData.total} Tasks
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {tasksData.tasks.map((task) => (
                  <div key={task.id} className={`p-6 hover:bg-gray-50 ${isOverdue(task.dueDate, task.status) ? 'border-l-4 border-red-500' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="text-lg font-medium text-gray-900 hover:text-indigo-600"
                          >
                            {task.title}
                          </Link>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          {isOverdue(task.dueDate, task.status) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Overdue
                            </span>
                          )}
                        </div>
                        
                        {task.description && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {formatDate(task.dueDate)}</span>
                            <span className="text-gray-400">({formatRelativeTime(task.dueDate)})</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>{task.assignedToName}</span>
                          </div>
                          {task.eventName && (
                            <div className="flex items-center space-x-1">
                              <span>Event:</span>
                              <Link
                                href={`/events/${task.eventId}`}
                                className="text-indigo-600 hover:text-indigo-800"
                              >
                                {task.eventName}
                              </Link>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center space-x-1 ${getPriorityColor(task.priority)}`}>
                            {getPriorityIcon(task.priority)}
                            <span className="text-sm font-medium capitalize">
                              {task.priority} Priority
                            </span>
                          </div>
                          {task.completedAt && (
                            <span className="text-sm text-gray-600">
                              Completed: {formatDate(task.completedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="View Task"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/tasks/${task.id}/edit`}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Edit Task"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          className="p-2 text-gray-400 hover:text-red-600"
                          title="Delete Task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {tasksData.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, tasksData.total)} of {tasksData.total} results
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(tasksData.totalPages, currentPage + 1))}
                        disabled={currentPage === tasksData.totalPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}