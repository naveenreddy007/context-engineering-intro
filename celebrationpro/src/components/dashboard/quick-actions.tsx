'use client'

import Link from 'next/link'
import { Plus, Calendar, Users, FileText, Settings, BarChart3 } from 'lucide-react'

interface QuickActionsProps {
  userRole: string
}

export function QuickActions({ userRole }: QuickActionsProps) {
  const getActionsForRole = () => {
    const commonActions = [
      {
        title: 'Create Event',
        description: 'Start a new event',
        href: '/events/new',
        icon: Plus,
        color: 'bg-indigo-600 hover:bg-indigo-700',
        textColor: 'text-white'
      },
      {
        title: 'View Calendar',
        description: 'Check schedule',
        href: '/calendar',
        icon: Calendar,
        color: 'bg-blue-600 hover:bg-blue-700',
        textColor: 'text-white'
      }
    ]

    const roleSpecificActions = {
      ADMIN: [
        {
          title: 'Manage Users',
          description: 'User administration',
          href: '/admin/users',
          icon: Users,
          color: 'bg-purple-600 hover:bg-purple-700',
          textColor: 'text-white'
        },
        {
          title: 'System Settings',
          description: 'Configure system',
          href: '/admin/settings',
          icon: Settings,
          color: 'bg-gray-600 hover:bg-gray-700',
          textColor: 'text-white'
        },
        {
          title: 'Analytics',
          description: 'View reports',
          href: '/analytics',
          icon: BarChart3,
          color: 'bg-green-600 hover:bg-green-700',
          textColor: 'text-white'
        }
      ],
      MANAGER: [
        {
          title: 'My Events',
          description: 'Manage events',
          href: '/events',
          icon: FileText,
          color: 'bg-orange-600 hover:bg-orange-700',
          textColor: 'text-white'
        },
        {
          title: 'Team Tasks',
          description: 'Assign & track',
          href: '/tasks',
          icon: Users,
          color: 'bg-teal-600 hover:bg-teal-700',
          textColor: 'text-white'
        },
        {
          title: 'Reports',
          description: 'Generate reports',
          href: '/reports',
          icon: BarChart3,
          color: 'bg-green-600 hover:bg-green-700',
          textColor: 'text-white'
        }
      ],
      VENDOR: [
        {
          title: 'My Tasks',
          description: 'View assignments',
          href: '/tasks/assigned',
          icon: FileText,
          color: 'bg-orange-600 hover:bg-orange-700',
          textColor: 'text-white'
        },
        {
          title: 'Update Status',
          description: 'Report progress',
          href: '/tasks/update',
          icon: Settings,
          color: 'bg-blue-600 hover:bg-blue-700',
          textColor: 'text-white'
        }
      ],
      CLIENT: [
        {
          title: 'My Events',
          description: 'View events',
          href: '/client/events',
          icon: FileText,
          color: 'bg-pink-600 hover:bg-pink-700',
          textColor: 'text-white'
        },
        {
          title: 'Approvals',
          description: 'Review & approve',
          href: '/client/approvals',
          icon: Users,
          color: 'bg-purple-600 hover:bg-purple-700',
          textColor: 'text-white'
        }
      ]
    }

    return [
      ...commonActions,
      ...(roleSpecificActions[userRole as keyof typeof roleSpecificActions] || [])
    ]
  }

  const actions = getActionsForRole()

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <p className="text-sm text-gray-600 mt-1">Common tasks and shortcuts</p>
      </div>
      
      <div className="p-6">
        <div className="space-y-3">
          {actions.map((action, index) => {
            const IconComponent = action.icon
            return (
              <Link
                key={index}
                href={action.href}
                className={`flex items-center p-4 rounded-lg transition-colors ${action.color} group`}
              >
                <div className="flex-shrink-0">
                  <IconComponent className={`h-6 w-6 ${action.textColor}`} />
                </div>
                <div className="ml-4 flex-1">
                  <h4 className={`text-sm font-medium ${action.textColor}`}>
                    {action.title}
                  </h4>
                  <p className={`text-xs ${action.textColor} opacity-90`}>
                    {action.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
        
        {/* Additional Help Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h4>
            <div className="space-y-2">
              <Link
                href="/help"
                className="block text-sm text-indigo-600 hover:text-indigo-500"
              >
                View Documentation
              </Link>
              <Link
                href="/support"
                className="block text-sm text-indigo-600 hover:text-indigo-500"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}