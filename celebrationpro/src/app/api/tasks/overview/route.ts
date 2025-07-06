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
    const limit = parseInt(searchParams.get('limit') || '8')

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Build where clause based on user role
    const getWhereClause = () => {
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

    const whereClause = getWhereClause()

    // Get task statistics
    const [pending, inProgress, completed, overdue] = await Promise.all([
      prisma.task.count({
        where: {
          ...whereClause,
          status: 'PENDING'
        }
      }),
      prisma.task.count({
        where: {
          ...whereClause,
          status: 'IN_PROGRESS'
        }
      }),
      prisma.task.count({
        where: {
          ...whereClause,
          status: 'COMPLETED'
        }
      }),
      prisma.task.count({
        where: {
          ...whereClause,
          dueDate: {
            lt: new Date()
          },
          status: {
            not: 'COMPLETED'
          }
        }
      })
    ])

    const stats = {
      pending,
      inProgress,
      completed,
      overdue
    }

    // Get recent tasks
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignedTo: {
          select: {
            name: true,
            email: true
          }
        },
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
      orderBy: [
        {
          status: 'asc' // Show pending/in-progress first
        },
        {
          dueDate: 'asc' // Then by due date
        },
        {
          createdAt: 'desc' // Finally by creation date
        }
      ],
      take: limit
    })

    const formattedTasks = tasks.map(task => ({
      id: task.id,
      name: task.name,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate?.toISOString() || null,
      assignedTo: {
        name: task.assignedTo.name,
        email: task.assignedTo.email
      },
      event: {
        id: task.module.event.id,
        name: task.module.event.name
      },
      module: {
        name: task.module.name
      },
      percentComplete: task.percentComplete
    }))

    return NextResponse.json({
      tasks: formattedTasks,
      stats
    })
  } catch (error) {
    console.error('Error fetching task overview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}