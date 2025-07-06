import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserRole, EventStatus, TaskStatus, TaskPriority } from '@prisma/client';

const querySchema = z.object({
  reportType: z.enum(['events', 'tasks', 'users', 'financial', 'performance']),
  startDate: z.string().transform(val => new Date(val)),
  endDate: z.string().transform(val => new Date(val)),
  companyId: z.string().optional(),
  eventId: z.string().optional(),
  userId: z.string().optional(),
  format: z.enum(['json', 'csv']).default('json')
});

// GET /api/analytics/reports - Generate analytics reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can access reports
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    // Determine company scope
    let companyId = session.user.companyId!;
    if (query.companyId && session.user.role === UserRole.ADMIN) {
      companyId = query.companyId;
    }

    let reportData;
    
    switch (query.reportType) {
      case 'events':
        reportData = await generateEventsReport(companyId, query.startDate, query.endDate, query.eventId);
        break;
      case 'tasks':
        reportData = await generateTasksReport(companyId, query.startDate, query.endDate, query.eventId, query.userId);
        break;
      case 'users':
        reportData = await generateUsersReport(companyId, query.startDate, query.endDate, query.userId);
        break;
      case 'financial':
        reportData = await generateFinancialReport(companyId, query.startDate, query.endDate, query.eventId);
        break;
      case 'performance':
        reportData = await generatePerformanceReport(companyId, query.startDate, query.endDate);
        break;
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    if (query.format === 'csv') {
      const csv = convertToCSV(reportData, query.reportType);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${query.reportType}_report_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({
      reportType: query.reportType,
      dateRange: {
        start: query.startDate.toISOString(),
        end: query.endDate.toISOString()
      },
      generatedAt: new Date().toISOString(),
      data: reportData
    });
  } catch (error) {
    console.error('Error generating report:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function generateEventsReport(companyId: string, startDate: Date, endDate: Date, eventId?: string) {
  const whereClause: any = {
    companyId,
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  };

  if (eventId) {
    whereClause.id = eventId;
  }

  const events = await db.event.findMany({
    where: whereClause,
    include: {
      client: {
        select: {
          name: true,
          email: true,
          phone: true
        }
      },
      createdBy: {
        select: {
          name: true,
          email: true
        }
      },
      modules: {
        include: {
          tasks: {
            select: {
              status: true,
              priority: true,
              estimatedHours: true,
              actualHours: true
            }
          }
        }
      },
      _count: {
        select: {
          modules: true,
          tasks: true
        }
      }
    },
    orderBy: {
      startDate: 'desc'
    }
  });

  return events.map(event => {
    const allTasks = event.modules.flatMap(module => module.tasks);
    const completedTasks = allTasks.filter(task => task.status === TaskStatus.COMPLETED);
    const totalEstimatedHours = allTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    const totalActualHours = allTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
    
    return {
      id: event.id,
      name: event.name,
      type: event.type,
      status: event.status,
      startDate: event.startDate,
      endDate: event.endDate,
      venue: event.venue,
      guestCount: event.guestCount,
      budget: event.budget,
      client: event.client,
      createdBy: event.createdBy,
      createdAt: event.createdAt,
      progress: event._count.tasks > 0 ? (completedTasks.length / event._count.tasks) * 100 : 0,
      modules: event._count.modules,
      tasks: event._count.tasks,
      completedTasks: completedTasks.length,
      estimatedHours: totalEstimatedHours,
      actualHours: totalActualHours,
      efficiency: totalEstimatedHours > 0 ? (totalEstimatedHours / totalActualHours) * 100 : 0
    };
  });
}

async function generateTasksReport(companyId: string, startDate: Date, endDate: Date, eventId?: string, userId?: string) {
  const whereClause: any = {
    module: {
      event: {
        companyId
      }
    },
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  };

  if (eventId) {
    whereClause.module.event.id = eventId;
  }

  if (userId) {
    whereClause.assignedToId = userId;
  }

  const tasks = await db.task.findMany({
    where: whereClause,
    include: {
      module: {
        select: {
          name: true,
          category: true,
          event: {
            select: {
              name: true,
              type: true,
              startDate: true
            }
          }
        }
      },
      assignedTo: {
        select: {
          name: true,
          email: true
        }
      },
      createdBy: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return tasks.map(task => {
    const isOverdue = task.dueDate && task.status !== TaskStatus.COMPLETED && new Date() > task.dueDate;
    const daysToComplete = task.completedAt && task.createdAt ? 
      Math.ceil((task.completedAt.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : null;
    
    return {
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      priority: task.priority,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      isOverdue,
      daysToComplete,
      efficiency: task.estimatedHours && task.actualHours ? 
        (task.estimatedHours / task.actualHours) * 100 : null,
      module: task.module,
      assignedTo: task.assignedTo,
      createdBy: task.createdBy,
      createdAt: task.createdAt
    };
  });
}

async function generateUsersReport(companyId: string, startDate: Date, endDate: Date, userId?: string) {
  const whereClause: any = {
    companyId
  };

  if (userId) {
    whereClause.id = userId;
  }

  const users = await db.user.findMany({
    where: whereClause,
    include: {
      _count: {
        select: {
          assignedTasks: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            }
          },
          createdEvents: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            }
          },
          createdTasks: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            }
          }
        }
      },
      assignedTasks: {
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          status: true,
          priority: true,
          estimatedHours: true,
          actualHours: true,
          completedAt: true,
          dueDate: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  return users.map(user => {
    const completedTasks = user.assignedTasks.filter(task => task.status === TaskStatus.COMPLETED);
    const overdueTasks = user.assignedTasks.filter(task => 
      task.dueDate && task.status !== TaskStatus.COMPLETED && new Date() > task.dueDate
    );
    const totalEstimatedHours = user.assignedTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    const totalActualHours = user.assignedTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      tasksAssigned: user._count.assignedTasks,
      tasksCompleted: completedTasks.length,
      tasksOverdue: overdueTasks.length,
      eventsCreated: user._count.createdEvents,
      tasksCreated: user._count.createdTasks,
      completionRate: user._count.assignedTasks > 0 ? 
        (completedTasks.length / user._count.assignedTasks) * 100 : 0,
      estimatedHours: totalEstimatedHours,
      actualHours: totalActualHours,
      efficiency: totalEstimatedHours > 0 ? (totalEstimatedHours / totalActualHours) * 100 : 0
    };
  });
}

async function generateFinancialReport(companyId: string, startDate: Date, endDate: Date, eventId?: string) {
  const whereClause: any = {
    companyId,
    createdAt: {
      gte: startDate,
      lte: endDate
    },
    budget: {
      not: null
    }
  };

  if (eventId) {
    whereClause.id = eventId;
  }

  const events = await db.event.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      budget: true,
      startDate: true,
      endDate: true,
      client: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      startDate: 'desc'
    }
  });

  const totalBudget = events.reduce((sum, event) => sum + (event.budget || 0), 0);
  const averageBudget = events.length > 0 ? totalBudget / events.length : 0;
  
  const budgetByStatus = events.reduce((acc, event) => {
    if (!acc[event.status]) {
      acc[event.status] = 0;
    }
    acc[event.status] += event.budget || 0;
    return acc;
  }, {} as Record<string, number>);

  const budgetByType = events.reduce((acc, event) => {
    if (!acc[event.type]) {
      acc[event.type] = 0;
    }
    acc[event.type] += event.budget || 0;
    return acc;
  }, {} as Record<string, number>);

  return {
    summary: {
      totalEvents: events.length,
      totalBudget,
      averageBudget,
      budgetByStatus,
      budgetByType
    },
    events: events.map(event => ({
      id: event.id,
      name: event.name,
      type: event.type,
      status: event.status,
      budget: event.budget,
      startDate: event.startDate,
      endDate: event.endDate,
      client: event.client?.name
    }))
  };
}

async function generatePerformanceReport(companyId: string, startDate: Date, endDate: Date) {
  const [eventMetrics, taskMetrics, userMetrics] = await Promise.all([
    // Event performance metrics
    db.event.findMany({
      where: {
        companyId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        _count: {
          select: {
            tasks: true
          }
        },
        tasks: {
          select: {
            status: true,
            estimatedHours: true,
            actualHours: true
          }
        }
      }
    }),
    
    // Task performance metrics
    db.task.groupBy({
      by: ['status', 'priority'],
      where: {
        module: {
          event: {
            companyId
          }
        },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      },
      _avg: {
        estimatedHours: true,
        actualHours: true
      }
    }),
    
    // User performance metrics
    db.user.findMany({
      where: {
        companyId,
        assignedTasks: {
          some: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      },
      include: {
        _count: {
          select: {
            assignedTasks: {
              where: {
                createdAt: {
                  gte: startDate,
                  lte: endDate
                },
                status: TaskStatus.COMPLETED
              }
            }
          }
        },
        assignedTasks: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          },
          select: {
            estimatedHours: true,
            actualHours: true
          }
        }
      }
    })
  ]);

  return {
    eventPerformance: eventMetrics.map(event => {
      const completedTasks = event.tasks.filter(task => task.status === TaskStatus.COMPLETED);
      const totalEstimated = event.tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
      const totalActual = event.tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
      
      return {
        eventId: event.id,
        eventName: event.name,
        completionRate: event._count.tasks > 0 ? (completedTasks.length / event._count.tasks) * 100 : 0,
        efficiency: totalEstimated > 0 ? (totalEstimated / totalActual) * 100 : 0,
        totalTasks: event._count.tasks,
        completedTasks: completedTasks.length
      };
    }),
    taskPerformance: taskMetrics,
    userPerformance: userMetrics.map(user => {
      const totalEstimated = user.assignedTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
      const totalActual = user.assignedTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
      
      return {
        userId: user.id,
        userName: user.name,
        completedTasks: user._count.assignedTasks,
        efficiency: totalEstimated > 0 ? (totalEstimated / totalActual) * 100 : 0,
        totalHours: totalActual
      };
    })
  };
}

function convertToCSV(data: any, reportType: string): string {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return 'No data available';
  }

  let rows: any[] = [];
  
  if (reportType === 'financial' && data.events) {
    rows = data.events;
  } else if (reportType === 'performance') {
    rows = data.eventPerformance || [];
  } else if (Array.isArray(data)) {
    rows = data;
  } else {
    rows = [data];
  }

  if (rows.length === 0) {
    return 'No data available';
  }

  const headers = Object.keys(rows[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of rows) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'object') {
        return JSON.stringify(value).replace(/"/g, '""');
      }
      return String(value).replace(/"/g, '""');
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}