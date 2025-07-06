'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  Calendar,
  CheckSquare,
  Users,
  FileText,
  BarChart3,
  Settings,
  Home,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  User,
  Building2,
  Layout,
  MessageSquare,
  CreditCard,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
  badge?: number
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
    roles: ['ADMIN', 'MANAGER', 'VENDOR', 'CLIENT']
  },
  {
    name: 'Events',
    href: '/events',
    icon: Calendar,
    roles: ['ADMIN', 'MANAGER', 'VENDOR', 'CLIENT']
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: CheckSquare,
    roles: ['ADMIN', 'MANAGER', 'VENDOR']
  },
  {
    name: 'Templates',
    href: '/templates',
    icon: Layout,
    roles: ['ADMIN', 'MANAGER']
  },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
    roles: ['ADMIN', 'MANAGER']
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: User,
    roles: ['ADMIN', 'MANAGER']
  },
  {
    name: 'Messages',
    href: '/messages',
    icon: MessageSquare,
    roles: ['ADMIN', 'MANAGER', 'VENDOR', 'CLIENT']
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['ADMIN', 'MANAGER']
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
    roles: ['ADMIN', 'MANAGER']
  },
  {
    name: 'Billing',
    href: '/billing',
    icon: CreditCard,
    roles: ['ADMIN', 'MANAGER']
  },
  {
    name: 'Company',
    href: '/company',
    icon: Building2,
    roles: ['ADMIN']
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['ADMIN', 'MANAGER', 'VENDOR', 'CLIENT']
  },
  {
    name: 'Help',
    href: '/help',
    icon: HelpCircle,
    roles: ['ADMIN', 'MANAGER', 'VENDOR', 'CLIENT']
  }
]

const clientNavigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/client/dashboard',
    icon: Home,
    roles: ['CLIENT']
  },
  {
    name: 'My Events',
    href: '/client/events',
    icon: Calendar,
    roles: ['CLIENT']
  },
  {
    name: 'Messages',
    href: '/client/messages',
    icon: MessageSquare,
    roles: ['CLIENT']
  },
  {
    name: 'Feedback',
    href: '/client/feedback',
    icon: FileText,
    roles: ['CLIENT']
  },
  {
    name: 'Profile',
    href: '/client/profile',
    icon: User,
    roles: ['CLIENT']
  },
  {
    name: 'Help',
    href: '/help',
    icon: HelpCircle,
    roles: ['CLIENT']
  }
]

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  
  if (!session?.user) return null

  const userRole = session.user.role
  const isClient = userRole === 'CLIENT'
  const navItems = isClient ? clientNavigation : navigation
  
  const filteredNavigation = navItems.filter(item => 
    item.roles.includes(userRole)
  )

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  return (
    <div className={cn(
      'flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">CelebrationPro</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
        >
          {isCollapsed ? (
            <Menu className="h-5 w-5 text-gray-600" />
          ) : (
            <X className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {session.user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {session.user.role} • {session.user.companyName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={cn(
                'flex-shrink-0',
                isCollapsed ? 'h-6 w-6' : 'h-5 w-5 mr-3'
              )} />
              {!isCollapsed && (
                <span className="truncate">{item.name}</span>
              )}
              {!isCollapsed && item.badge && (
                <span className="ml-auto bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className={cn(
            'flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors',
            isCollapsed && 'justify-center'
          )}
          title={isCollapsed ? 'Sign Out' : undefined}
        >
          <LogOut className={cn(
            'flex-shrink-0',
            isCollapsed ? 'h-6 w-6' : 'h-5 w-5 mr-3'
          )} />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  )
}