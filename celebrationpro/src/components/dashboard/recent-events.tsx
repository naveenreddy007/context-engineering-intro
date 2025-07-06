'use client'

import { useQuery } from '@tanstack/react-query'
import { Calendar, MapPin, User } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatRelativeTime } from '@/lib/utils'

interface RecentEventsProps {
  userId: string
  userRole: string
}

interface Event {
  id: string
  name: string
  type: string
  date: string
  venue: string
  status: string
  clientName: string
  progress: number
  createdAt: string
}

export function RecentEvents({ userId, userRole }: RecentEventsProps) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['recent-events', userId, userRole],
    queryFn: async (): Promise<Event[]> => {
      const response = await fetch(`/api/events/recent?userId=${userId}&role=${userRole}&limit=5`)
      if (!response.ok) {
        throw new Error('Failed to fetch recent events')
      }
      return response.json()
    },
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Events</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
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
      case 'marriage':
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

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Events</h3>
          <Link
            href="/events"
            className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
          >
            View all
          </Link>
        </div>
      </div>
      
      <div className="p-6">
        {!events || events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No recent events found</p>
            <Link
              href="/events/new"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create Event
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <div key={event.id} className="border-l-4 border-indigo-500 pl-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
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
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
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
                    
                    <div className="flex items-center space-x-3">
                      <span className={`text-sm font-medium ${getEventTypeColor(event.type)}`}>
                        {event.type}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{event.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${event.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right text-xs text-gray-500">
                    {formatRelativeTime(event.createdAt)}
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