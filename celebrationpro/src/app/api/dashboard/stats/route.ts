import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const role = searchParams.get('role')

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Get current date for filtering
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    let stats = {
      totalEvents: 0,
      activeEvents: 0,
      completedTasks: 0,
      pendingTasks: 0,
      totalUsers: 0,
      upcomingDeadlines: 0
    }

    // Build where clause based on user role
    const getEventWhereClause = () => {
      switch (role) {
        case 'ADMIN':
          return {} // Admin can see all events
        case 'MANAGER':
          return { managerId: userId }
        case 'CLIENT':
          return { clientId: userId }
        case 'VENDOR':
          return {
            modules: {
              some: {
                tasks: {
                  some: {
                    assignedToId: userId
                  }
                }
              }
            }
          }
        default:
          return { id: 'never-match' } // Fallback to no access
      }
    }

    const getTaskWhereClause = () => {
      switch (role) {
        case 'ADMIN':
          return {} // Admin can see all tasks
        case 'MANAGER':
          return {
            module: {
              event: {
                managerId: userId
              }
            }
          }
        case 'CLIENT':
          return {
            module: {
              event: {
                clientId: userId
              }
            }
          }
        case 'VENDOR':
          return { assignedToId: userId }
        default:
          return { id: 'never-match' } // Fallback to no access
      }
    }

    const eventWhereClause = getEventWhereClause()
    const taskWhereClause = getTaskWhereClause()

    // Get total events this month
    stats.totalEvents = await prisma.event.count({
      where: {
        ...eventWhereClause,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    })

    // Get active events (in progress)
    stats.activeEvents = await prisma.event.count({
      where: {
        ...eventWhereClause,
        status: 'IN_PROGRESS'
      }
    })

    // Get completed tasks
    stats.completedTasks = await prisma.task.count({
      where: {
        ...taskWhereClause,
        status: 'COMPLETED'
      }
    })

    // Get pending tasks
    stats.pendingTasks = await prisma.task.count({
      where: {
        ...taskWhereClause,
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      }
    })

    // Get upcoming deadlines (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    stats.upcomingDeadlines = await prisma.task.count({
      where: {
        ...taskWhereClause,
        dueDate: {
          gte: now,
          lte: nextWeek
        },
        status: {
          not: 'COMPLETED'
        }
      }
    })

    // Get total users (only for admin)
    if (role === 'ADMIN') {
      stats.totalUsers = await prisma.user.count()
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}