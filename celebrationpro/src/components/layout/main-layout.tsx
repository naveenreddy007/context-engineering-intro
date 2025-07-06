'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { cn } from '@/lib/utils'

interface MainLayoutProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export function MainLayout({ children, title, className }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session, status } = useSession()

  // Show loading state while session is loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Redirect to signin if not authenticated
  if (status === 'unauthenticated') {
    window.location.href = '/auth/signin'
    return null
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}

      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out lg:hidden',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <Sidebar />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          title={title}
          showMenuButton={true}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Main content */}
        <main className={cn(
          'flex-1 overflow-y-auto focus:outline-none',
          className
        )}>
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// Higher-order component for pages that need the main layout
export function withMainLayout<P extends object>(
  Component: React.ComponentType<P>,
  title?: string
) {
  return function WrappedComponent(props: P) {
    return (
      <MainLayout title={title}>
        <Component {...props} />
      </MainLayout>
    )
  }
}