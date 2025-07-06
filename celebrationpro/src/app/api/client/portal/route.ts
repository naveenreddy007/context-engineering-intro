import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { UserRole, EventStatus, TaskStatus } from '@prisma/client';

// GET /api/client/portal - Get client portal data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only CLIENT role can access this endpoint
    if (session.user.role !== UserRole.CLIENT) {
      return NextResponse.json({ error: 'Access denied. Client access only.' }, { status: 403 });
    }

    const clientId = session.user.id;

    // Get client's events with detailed information
    const events = await db.event.findMany({
      where: {
        clientId
      },
      include: {
        modules: {
          include: {
            tasks: {
              select: {
                id: true,
                name: true,
                status: true,
                priority: true,
                dueDate: true,
                completedAt: true,
                assignedTo: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              },
              orderBy: {
                dueDate: 'asc'
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        },
        createdBy: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    // Calculate progress and metrics for each event
    const eventsWithProgress = events.map(event => {
      const allTasks = event.modules.flatMap(module => module.tasks);
      const completedTasks = allTasks.filter(task => task.status === TaskStatus.COMPLETED);
      const inProgressTasks = allTasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
      const overdueTasks = allTasks.filter(task => 
        task.dueDate && task.status !== TaskStatus.COMPLETED && new Date() > task.dueDate
      );
      const upcomingTasks = allTasks.filter(task => 
        task.dueDate && task.status !== TaskStatus.COMPLETED && 
        new Date() <= task.dueDate && 
        task.dueDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
      );

      const progress = event._count.tasks > 0 ? (completedTasks.length / event._count.tasks) * 100 : 0;
      
      return {
        id: event.id,
        name: event.name,
        type: event.type,
        status: event.status,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        venue: event.venue,
        guestCount: event.guestCount,
        budget: event.budget,
        createdBy: event.createdBy,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        progress: Math.round(progress),
        totalTasks: event._count.tasks,
        completedTasks: completedTasks.length,
        inProgressTasks: inProgressTasks.length,
        overdueTasks: overdueTasks.length,
        upcomingTasks: upcomingTasks.length,
        modules: event.modules.map(module => {
          const moduleTasks = module.tasks;
          const moduleCompletedTasks = moduleTasks.filter(task => task.status === TaskStatus.COMPLETED);
          const moduleProgress = moduleTasks.length > 0 ? (moduleCompletedTasks.length / moduleTasks.length) * 100 : 0;
          
          return {
            id: module.id,
            name: module.name,
            category: module.category,
            description: module.description,
            order: module.order,
            progress: Math.round(moduleProgress),
            totalTasks: moduleTasks.length,
            completedTasks: moduleCompletedTasks.length,
            tasks: moduleTasks.map(task => ({
              ...task,
              isOverdue: task.dueDate && task.status !== TaskStatus.COMPLETED && new Date() > task.dueDate
            }))
          };
        })
      };
    });

    // Get recent notifications for the client
    const notifications = await db.notification.findMany({
      where: {
        userId: clientId,
        isRead: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Get upcoming deadlines across all events
    const upcomingDeadlines = await db.task.findMany({
      where: {
        module: {
          event: {
            clientId
          }
        },
        status: {
          not: TaskStatus.COMPLETED
        },
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
        }
      },
      include: {
        module: {
          select: {
            name: true,
            event: {
              select: {
                name: true,
                type: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      },
      take: 20
    });

    // Calculate overall statistics
    const totalEvents = events.length;
    const activeEvents = events.filter(event => 
      [EventStatus.PLANNING, EventStatus.IN_PROGRESS].includes(event.status)
    ).length;
    const completedEvents = events.filter(event => event.status === EventStatus.COMPLETED).length;
    const upcomingEvents = events.filter(event => 
      event.startDate && event.startDate > new Date()
    ).length;

    const allTasks = events.flatMap(event => event.modules.flatMap(module => module.tasks));
    const totalTasks = allTasks.length;
    const completedTasksCount = allTasks.filter(task => task.status === TaskStatus.COMPLETED).length;
    const overdueTasks = allTasks.filter(task => 
      task.dueDate && task.status !== TaskStatus.COMPLETED && new Date() > task.dueDate
    ).length;

    const overallProgress = totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0;

    return NextResponse.json({
      client: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email
      },
      statistics: {
        totalEvents,
        activeEvents,
        completedEvents,
        upcomingEvents,
        totalTasks,
        completedTasks: completedTasksCount,
        overdueTasks,
        overallProgress: Math.round(overallProgress)
      },
      events: eventsWithProgress,
      notifications,
      upcomingDeadlines: upcomingDeadlines.map(task => {
        const daysUntilDue = task.dueDate ? 
          Math.ceil((task.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
        
        return {
          id: task.id,
          name: task.name,
          priority: task.priority,
          dueDate: task.dueDate,
          daysUntilDue,
          module: task.module,
          assignedTo: task.assignedTo,
          urgency: daysUntilDue !== null ? (
            daysUntilDue <= 1 ? 'critical' :
            daysUntilDue <= 3 ? 'high' :
            daysUntilDue <= 7 ? 'medium' : 'low'
          ) : 'unknown'
        };
      })
    });
  } catch (error) {
    console.error('Error fetching client portal data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client portal data' },
      { status: 500 }
    );
  }
}