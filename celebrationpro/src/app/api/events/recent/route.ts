import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateProgress } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const role = searchParams.get('role')
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Build where clause based on user role
    const getWhereClause = () => {
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

    const whereClause = getWhereClause()

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            name: true
          }
        },
        modules: {
          include: {
            tasks: {
              select: {
                status: true,
                percentComplete: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Calculate progress for each event
    const eventsWithProgress = events.map(event => {
      const allTasks = event.modules.flatMap(module => module.tasks)
      const progress = calculateProgress(allTasks)
      
      return {
        id: event.id,
        name: event.name,
        type: event.type,
        date: event.date.toISOString(),
        venue: event.venue,
        status: event.status,
        clientName: event.client.name,
        progress,
        createdAt: event.createdAt.toISOString()
      }
    })

    return NextResponse.json(eventsWithProgress)
  } catch (error) {
    console.error('Error fetching recent events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}