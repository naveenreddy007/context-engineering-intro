'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/main-layout'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Copy,
  Eye,
  Edit,
  Trash2,
  Star,
  Calendar,
  User,
  Tag
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Template {
  id: string
  name: string
  description: string
  type: string
  category: string
  content: any
  isPublic: boolean
  isFavorite: boolean
  usageCount: number
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
  tags: string[]
}

interface TemplatesResponse {
  templates: Template[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function TemplatesPage() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const { data: templatesData, isLoading, error } = useQuery({
    queryKey: ['templates', currentPage, searchTerm, typeFilter, categoryFilter],
    queryFn: async (): Promise<TemplatesResponse> => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(searchTerm && { search: searchTerm }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter })
      })
      
      const response = await fetch(`/api/templates?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      return response.json()
    },
    enabled: !!session?.user
  })

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'event':
        return 'bg-blue-100 text-blue-800'
      case 'task':
        return 'bg-green-100 text-green-800'
      case 'email':
        return 'bg-purple-100 text-purple-800'
      case 'proposal':
        return 'bg-orange-100 text-orange-800'
      case 'contract':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'wedding':
        return '💒'
      case 'birthday':
        return '🎂'
      case 'corporate':
        return '🏢'
      case 'anniversary':
        return '💕'
      case 'graduation':
        return '🎓'
      default:
        return '🎉'
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
    <MainLayout title="Templates">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
            <p className="text-gray-600 mt-1">
              Create and manage reusable templates for events, tasks, and communications
            </p>
          </div>
          <Link
            href="/templates/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Template
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
                  placeholder="Search templates..."
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
                    Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Types</option>
                    <option value="event">Event</option>
                    <option value="task">Task</option>
                    <option value="email">Email</option>
                    <option value="proposal">Proposal</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="wedding">Wedding</option>
                    <option value="birthday">Birthday</option>
                    <option value="corporate">Corporate</option>
                    <option value="anniversary">Anniversary</option>
                    <option value="graduation">Graduation</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Templates Grid */}
        <div className="bg-white rounded-lg shadow-sm border">
          {isLoading ? (
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">Error loading templates. Please try again.</p>
            </div>
          ) : !templatesData?.templates?.length ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No templates found</p>
              <Link
                href="/templates/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Template
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {templatesData.total} Templates
                </h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templatesData.templates.map((template) => (
                    <div key={template.id} className="bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(template.type)}`}>
                                {template.type}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            {template.isFavorite && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                            {template.isPublic && (
                              <span className="text-xs text-gray-500">Public</span>
                            )}
                          </div>
                        </div>
                        
                        <Link
                          href={`/templates/${template.id}`}
                          className="block mb-3"
                        >
                          <h3 className="text-lg font-medium text-gray-900 hover:text-indigo-600 line-clamp-2">
                            {template.name}
                          </h3>
                        </Link>
                        
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {template.description}
                        </p>
                        
                        {template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {template.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-200 text-gray-700"
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                            {template.tags.length > 3 && (
                              <span className="text-xs text-gray-500">+{template.tags.length - 3} more</span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>{template.createdByName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Copy className="h-4 w-4" />
                            <span>{template.usageCount} uses</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Created {formatDate(template.createdAt)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/templates/${template.id}`}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                          <button
                            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            title="Use Template"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/templates/${template.id}/edit`}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            title="Edit Template"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-red-50 hover:text-red-600"
                            title="Delete Template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Pagination */}
              {templatesData.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * 12) + 1} to {Math.min(currentPage * 12, templatesData.total)} of {templatesData.total} results
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
                        onClick={() => setCurrentPage(Math.min(templatesData.totalPages, currentPage + 1))}
                        disabled={currentPage === templatesData.totalPages}
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