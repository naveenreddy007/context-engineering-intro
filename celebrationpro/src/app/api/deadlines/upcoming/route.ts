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
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const now = new Date()
    const futureLimit = new Date()
    futureLimit.setDate(futureLimit.getDate() + 30) // Look ahead 30 days

    // Build where clause based on user role for tasks
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

    // Build where clause based on user role for events
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

    const taskWhereClause = getTaskWhereClause()
    const eventWhereClause = getEventWhereClause()

    // Get upcoming task deadlines
    const tasks = await prisma.task.findMany({
      where: {
        ...taskWhereClause,
        dueDate: {
          lte: futureLimit
        },
        status: {
          not: 'COMPLETED'
        }
      },
      include: {
        module: {
          select: {
            name: true,
            event: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    })

    // Get upcoming event deadlines
    const events = await prisma.event.findMany({
      where: {
        ...eventWhereClause,
        date: {
          gte: now,
          lte: futureLimit
        },
        status: {
          not: 'COMPLETED'
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Combine and format deadlines
    const deadlines = []

    // Add task deadlines
    tasks.forEach(task => {
      if (task.dueDate) {
        const daysUntilDue = Math.ceil((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const isOverdue = task.dueDate < now
        
        deadlines.push({
          id: task.id,
          type: 'task' as const,
          title: task.name,
          dueDate: task.dueDate.toISOString(),
          priority: task.priority,
          status: task.status,
          eventName: task.module.event.name,
          eventId: task.module.event.id,
          isOverdue,
          daysUntilDue: Math.abs(daysUntilDue)
        })
      }
    })

    // Add event deadlines
    events.forEach(event => {
      const daysUntilDue = Math.ceil((event.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const isOverdue = event.date < now
      
      deadlines.push({
        id: event.id,
        type: 'event' as const,
        title: event.name,
        dueDate: event.date.toISOString(),
        priority: 'HIGH', // Events are always high priority
        status: event.status,
        isOverdue,
        daysUntilDue: Math.abs(daysUntilDue)
      })
    })

    // Sort by urgency: overdue first, then by days until due
    deadlines.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1
      if (!a.isOverdue && b.isOverdue) return 1
      if (a.isOverdue && b.isOverdue) return b.daysUntilDue - a.daysUntilDue // More overdue first
      return a.daysUntilDue - b.daysUntilDue // Sooner deadlines first
    })

    // Limit results
    const limitedDeadlines = deadlines.slice(0, limit)

    return NextResponse.json(limitedDeadlines)
  } catch (error) {
    console.error('Error fetching upcoming deadlines:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}