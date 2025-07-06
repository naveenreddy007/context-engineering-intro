'use client'

import { useSession } from 'next-auth/react'
import { MainLayout } from '@/components/layout/main-layout'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { RecentEvents } from '@/components/dashboard/recent-events'
import { TaskOverview } from '@/components/dashboard/task-overview'
import { UpcomingDeadlines } from '@/components/dashboard/upcoming-deadlines'
import { QuickActions } from '@/components/dashboard/quick-actions'

export default function HomePage() {
  const { data: session } = useSession()

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome back, {session.user.name}!
              </h2>
              <p className="text-gray-600 mt-1">
                Here's what's happening with your events today.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {session.user.role} • {session.user.companyName}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Main Dashboard */}
          <div className="lg:col-span-3 space-y-8">
            {/* Stats Overview */}
            <DashboardStats userId={session.user.id} userRole={session.user.role} />
            
            {/* Recent Events */}
            <RecentEvents userId={session.user.id} userRole={session.user.role} />
            
            {/* Task Overview */}
            <TaskOverview userId={session.user.id} userRole={session.user.role} />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <QuickActions userRole={session.user.role} />
            
            {/* Upcoming Deadlines */}
            <UpcomingDeadlines userId={session.user.id} userRole={session.user.role} />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
