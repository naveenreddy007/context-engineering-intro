import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserRole, EventStatus, TaskStatus } from '@prisma/client';

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  companyId: z.string().optional()
});

// GET /api/analytics/overview - Get analytics overview
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    // Determine date range
    const now = new Date();
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    const startDate = new Date(now.getTime() - periodDays[query.period] * 24 * 60 * 60 * 1000);

    // Determine company scope
    let companyId = session.user.companyId!;
    if (query.companyId && session.user.role === UserRole.ADMIN) {
      companyId = query.companyId;
    }

    // Build base where clauses
    const eventWhereClause = {
      companyId,
      createdAt: {
        gte: startDate
      }
    };

    const taskWhereClause = {
      module: {
        event: {
          companyId
        }
      },
      createdAt: {
        gte: startDate
      }
    };

    // Get overview statistics
    const [eventStats, taskStats, userStats, revenueStats] = await Promise.all([
      // Event statistics
      db.event.groupBy({
        by: ['status'],
        where: eventWhereClause,
        _count: {
          id: true
        }
      }),
      
      // Task statistics
      db.task.groupBy({
        by: ['status'],
        where: taskWhereClause,
        _count: {
          id: true
        }
      }),
      
      // User activity statistics
      db.user.findMany({
        where: {
          companyId,
          lastLoginAt: {
            gte: startDate
          }
        },
        select: {
          id: true,
          lastLoginAt: true,
          _count: {
            select: {
              assignedTasks: {
                where: {
                  createdAt: {
                    gte: startDate
                  }
                }
              },
              createdEvents: {
                where: {
                  createdAt: {
                    gte: startDate
                  }
                }
              }
            }
          }
        }
      }),
      
      // Revenue statistics (if available)
      db.event.aggregate({
        where: {
          ...eventWhereClause,
          budget: {
            not: null
          }
        },
        _sum: {
          budget: true
        },
        _avg: {
          budget: true
        },
        _count: {
          id: true
        }
      })
    ]);

    // Process event statistics
    const eventStatsMap = eventStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Process task statistics
    const taskStatsMap = taskStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Get time series data for events and tasks
    const timeSeriesData = await getTimeSeriesData(companyId, startDate, query.period);

    // Get top performing metrics
    const topMetrics = await getTopMetrics(companyId, startDate);

    return NextResponse.json({
      period: query.period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      overview: {
        events: {
          total: Object.values(eventStatsMap).reduce((sum, count) => sum + count, 0),
          byStatus: {
            DRAFT: eventStatsMap[EventStatus.DRAFT] || 0,
            PLANNING: eventStatsMap[EventStatus.PLANNING] || 0,
            CONFIRMED: eventStatsMap[EventStatus.CONFIRMED] || 0,
            IN_PROGRESS: eventStatsMap[EventStatus.IN_PROGRESS] || 0,
            COMPLETED: eventStatsMap[EventStatus.COMPLETED] || 0,
            CANCELLED: eventStatsMap[EventStatus.CANCELLED] || 0
          }
        },
        tasks: {
          total: Object.values(taskStatsMap).reduce((sum, count) => sum + count, 0),
          byStatus: {
            PENDING: taskStatsMap[TaskStatus.PENDING] || 0,
            IN_PROGRESS: taskStatsMap[TaskStatus.IN_PROGRESS] || 0,
            COMPLETED: taskStatsMap[TaskStatus.COMPLETED] || 0,
            CANCELLED: taskStatsMap[TaskStatus.CANCELLED] || 0
          }
        },
        users: {
          activeUsers: userStats.length,
          totalTasksAssigned: userStats.reduce((sum, user) => sum + user._count.assignedTasks, 0),
          totalEventsCreated: userStats.reduce((sum, user) => sum + user._count.createdEvents, 0)
        },
        revenue: {
          totalBudget: revenueStats._sum.budget || 0,
          averageBudget: revenueStats._avg.budget || 0,
          eventsWithBudget: revenueStats._count.id
        }
      },
      timeSeries: timeSeriesData,
      topMetrics
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics overview' },
      { status: 500 }
    );
  }
}

async function getTimeSeriesData(companyId: string, startDate: Date, period: string) {
  const intervals = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const intervalSize = period === '7d' ? 1 : period === '30d' ? 1 : period === '90d' ? 3 : 30; // days per interval
  
  const timeSeriesData = [];
  
  for (let i = 0; i < intervals; i += intervalSize) {
    const intervalStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const intervalEnd = new Date(intervalStart.getTime() + intervalSize * 24 * 60 * 60 * 1000);
    
    const [eventCount, taskCount] = await Promise.all([
      db.event.count({
        where: {
          companyId,
          createdAt: {
            gte: intervalStart,
            lt: intervalEnd
          }
        }
      }),
      db.task.count({
        where: {
          module: {
            event: {
              companyId
            }
          },
          createdAt: {
            gte: intervalStart,
            lt: intervalEnd
          }
        }
      })
    ]);
    
    timeSeriesData.push({
      date: intervalStart.toISOString().split('T')[0],
      events: eventCount,
      tasks: taskCount
    });
  }
  
  return timeSeriesData;
}

async function getTopMetrics(companyId: string, startDate: Date) {
  const [topEventTypes, topUsers, upcomingDeadlines] = await Promise.all([
    // Top event types
    db.event.groupBy({
      by: ['type'],
      where: {
        companyId,
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    }),
    
    // Top performing users
    db.user.findMany({
      where: {
        companyId,
        assignedTasks: {
          some: {
            status: TaskStatus.COMPLETED,
            completedAt: {
              gte: startDate
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            assignedTasks: {
              where: {
                status: TaskStatus.COMPLETED,
                completedAt: {
                  gte: startDate
                }
              }
            }
          }
        }
      },
      orderBy: {
        assignedTasks: {
          _count: 'desc'
        }
      },
      take: 5
    }),
    
    // Upcoming deadlines
    db.task.findMany({
      where: {
        module: {
          event: {
            companyId
          }
        },
        status: {
          in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]
        },
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      },
      select: {
        id: true,
        name: true,
        dueDate: true,
        priority: true,
        status: true,
        module: {
          select: {
            name: true,
            event: {
              select: {
                name: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      },
      take: 10
    })
  ]);
  
  return {
    topEventTypes: topEventTypes.map(item => ({
      type: item.type,
      count: item._count.id
    })),
    topUsers: topUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      completedTasks: user._count.assignedTasks
    })),
    upcomingDeadlines
  };
}