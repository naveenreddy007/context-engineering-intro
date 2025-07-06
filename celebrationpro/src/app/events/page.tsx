'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import {
  Calendar,
  MapPin,
  User,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Event {
  id: string
  name: string
  type: string
  date: string
  venue: string
  status: string
  clientName: string
  clientEmail: string
  budget: number
  progress: number
  createdAt: string
  updatedAt: string
}

interface EventsResponse {
  events: Event[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function EventsPage() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const { data: eventsData, isLoading, error } = useQuery({
    queryKey: ['events', currentPage, searchTerm, statusFilter, typeFilter],
    queryFn: async (): Promise<EventsResponse> => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter })
      })
      
      const response = await fetch(`/api/events?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }
      return response.json()
    },
    enabled: !!session?.user
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'planning':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'wedding':
        return 'text-pink-600'
      case 'birthday':
        return 'text-purple-600'
      case 'corporate':
        return 'text-blue-600'
      case 'anniversary':
        return 'text-green-600'
      default:
        return 'text-gray-600'
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
    <MainLayout title="Events">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
            <p className="text-gray-600 mt-1">
              Manage and track all your events
            </p>
          </div>
          <Link
            href="/events/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Event
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
                  placeholder="Search events..."
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
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Types</option>
                    <option value="wedding">Wedding</option>
                    <option value="birthday">Birthday</option>
                    <option value="corporate">Corporate</option>
                    <option value="anniversary">Anniversary</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Events List */}
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
              <p className="text-red-600">Error loading events. Please try again.</p>
            </div>
          ) : !eventsData?.events?.length ? (
            <div className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No events found</p>
              <Link
                href="/events/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Event
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {eventsData.total} Events
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {eventsData.events.map((event) => (
                  <div key={event.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Link
                            href={`/events/${event.id}`}
                            className="text-lg font-medium text-gray-900 hover:text-indigo-600"
                          >
                            {event.name}
                          </Link>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                            {event.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(event.date)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.venue}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>{event.clientName}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <span className={`text-sm font-medium ${getEventTypeColor(event.type)}`}>
                            {event.type}
                          </span>
                          <span className="text-sm text-gray-600">
                            Budget: {formatCurrency(event.budget)}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Progress:</span>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${event.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{event.progress}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/events/${event.id}`}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="View Event"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/events/${event.id}/edit`}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Edit Event"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          className="p-2 text-gray-400 hover:text-red-600"
                          title="Delete Event"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {eventsData.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, eventsData.total)} of {eventsData.total} results
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
                        onClick={() => setCurrentPage(Math.min(eventsData.totalPages, currentPage + 1))}
                        disabled={currentPage === eventsData.totalPages}
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