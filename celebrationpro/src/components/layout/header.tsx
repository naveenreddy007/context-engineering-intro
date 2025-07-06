'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Search, Menu, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
  title?: string
  className?: string
}

export function Header({ 
  onMenuClick, 
  showMenuButton = false, 
  title,
  className 
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const { data: session } = useSession()

  if (!session?.user) return null

  return (
    <header className={cn(
      'bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8',
      className
    )}>
      <div className="flex items-center justify-between h-16">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}
          
          {title && (
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            </div>
          )}
        </div>

        {/* Center - Search */}
        <div className="hidden md:block flex-1 max-w-lg mx-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search events, tasks, clients..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Search button for mobile */}
          <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 md:hidden">
            <Search className="h-6 w-6" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 relative"
            >
              <Bell className="h-6 w-6" />
              {/* Notification badge */}
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
            </button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">New task assigned</p>
                        <p className="text-sm text-gray-500">Wedding decoration setup for Johnson event</p>
                        <p className="text-xs text-gray-400 mt-1">2 minutes ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Event approved</p>
                        <p className="text-sm text-gray-500">Birthday celebration for Sarah has been approved</p>
                        <p className="text-xs text-gray-400 mt-1">1 hour ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Deadline approaching</p>
                        <p className="text-sm text-gray-500">Venue booking confirmation due tomorrow</p>
                        <p className="text-xs text-gray-400 mt-1">3 hours ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <button className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                      View all notifications
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-3 p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {session.user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                <p className="text-xs text-gray-500">{session.user.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {/* Profile dropdown menu */}
            {showProfile && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                    <p className="text-xs text-gray-500">{session.user.email}</p>
                    <p className="text-xs text-gray-500">{session.user.role} • {session.user.companyName}</p>
                  </div>
                  <a
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Your Profile
                  </a>
                  <a
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </a>
                  <a
                    href="/help"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Help & Support
                  </a>
                  <div className="border-t border-gray-200">
                    <button
                      onClick={() => {
                        // Handle sign out
                        window.location.href = '/auth/signin'
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}