'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import {
  Users,
  Phone,
  Mail,
  MapPin,
  Plus,
  Search,
  Filter,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Building
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  address: string
  city: string
  state: string
  pincode: string
  totalEvents: number
  totalSpent: number
  lastEventDate?: string
  status: string
  createdAt: string
  updatedAt: string
}

interface ClientsResponse {
  clients: Client[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function ClientsPage() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const { data: clientsData, isLoading, error } = useQuery({
    queryKey: ['clients', currentPage, searchTerm, statusFilter],
    queryFn: async (): Promise<ClientsResponse> => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      })
      
      const response = await fetch(`/api/clients?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch clients')
      }
      return response.json()
    },
    enabled: !!session?.user
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'potential':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
    <MainLayout title="Clients">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600 mt-1">
              Manage your client relationships and information
            </p>
          </div>
          <Link
            href="/clients/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Client
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
                  placeholder="Search clients..."
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
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="potential">Potential</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clients List */}
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
              <p className="text-red-600">Error loading clients. Please try again.</p>
            </div>
          ) : !clientsData?.clients?.length ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No clients found</p>
              <Link
                href="/clients/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Client
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {clientsData.total} Clients
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {clientsData.clients.map((client) => (
                  <div key={client.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-lg font-medium text-gray-900 hover:text-indigo-600"
                          >
                            {client.name}
                          </Link>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                            {client.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              <a href={`mailto:${client.email}`} className="hover:text-indigo-600">
                                {client.email}
                              </a>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Phone className="h-4 w-4" />
                              <a href={`tel:${client.phone}`} className="hover:text-indigo-600">
                                {client.phone}
                              </a>
                            </div>
                            {client.company && (
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Building className="h-4 w-4" />
                                <span>{client.company}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-start space-x-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4 mt-0.5" />
                              <div>
                                <div>{client.address}</div>
                                <div>{client.city}, {client.state} {client.pincode}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm">
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-600">Events:</span>
                            <span className="font-medium text-gray-900">{client.totalEvents}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-600">Total Spent:</span>
                            <span className="font-medium text-gray-900">{formatCurrency(client.totalSpent)}</span>
                          </div>
                          {client.lastEventDate && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">Last Event:</span>
                              <span className="text-gray-900">{formatDate(client.lastEventDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/clients/${client.id}`}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="View Client"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/clients/${client.id}/edit`}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Edit Client"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          className="p-2 text-gray-400 hover:text-red-600"
                          title="Delete Client"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {clientsData.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, clientsData.total)} of {clientsData.total} results
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
                        onClick={() => setCurrentPage(Math.min(clientsData.totalPages, currentPage + 1))}
                        disabled={currentPage === clientsData.totalPages}
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