import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { taskCreateSchema, taskFilterSchema } from '@/lib/validations';
import { UserRole } from '@prisma/client';

// GET /api/tasks - List tasks with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams);
    
    // Validate query parameters
    const validatedParams = taskFilterSchema.parse(params);

    // Build where clause based on user role
    let whereClause: any = {};
    
    if (session.user.role === UserRole.CLIENT) {
      whereClause.module = {
        event: {
          clientId: session.user.id
        }
      };
    } else if (session.user.role === UserRole.VENDOR) {
      whereClause.OR = [
        { assignedToId: session.user.id },
        {
          module: {
            event: {
              managerId: session.user.id
            }
          }
        }
      ];
    } else if (session.user.role === UserRole.MANAGER) {
      whereClause.module = {
        event: {
          OR: [
            { managerId: session.user.id },
            { companyId: session.user.companyId }
          ]
        }
      };
    }
    // ADMIN can see all tasks

    // Apply filters
    if (validatedParams.status) {
      whereClause.status = validatedParams.status;
    }
    if (validatedParams.priority) {
      whereClause.priority = validatedParams.priority;
    }
    if (validatedParams.assignedToId) {
      whereClause.assignedToId = validatedParams.assignedToId;
    }
    if (validatedParams.moduleId) {
      whereClause.moduleId = validatedParams.moduleId;
    }
    if (validatedParams.eventId) {
      whereClause.module = {
        eventId: validatedParams.eventId
      };
    }
    if (validatedParams.search) {
      whereClause.OR = [
        { name: { contains: validatedParams.search, mode: 'insensitive' } },
        { description: { contains: validatedParams.search, mode: 'insensitive' } }
      ];
    }
    if (validatedParams.dueDateFrom) {
      whereClause.dueDate = { gte: new Date(validatedParams.dueDateFrom) };
    }
    if (validatedParams.dueDateTo) {
      whereClause.dueDate = { ...whereClause.dueDate, lte: new Date(validatedParams.dueDateTo) };
    }
    if (validatedParams.overdue === 'true') {
      whereClause.dueDate = { lt: new Date() };
      whereClause.status = { not: 'COMPLETED' };
    }

    const page = parseInt(validatedParams.page || '1');
    const limit = parseInt(validatedParams.limit || '20');
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where: whereClause,
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true, phone: true }
          },
          module: {
            select: {
              id: true,
              name: true,
              category: true,
              event: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  startDate: true,
                  client: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          },
          dependencies: {
            select: { id: true, name: true, status: true }
          },
          dependentTasks: {
            select: { id: true, name: true, status: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      db.task.count({ where: whereClause })
    ]);

    // Add computed fields
    const tasksWithComputedFields = tasks.map(task => {
      const isOverdue = task.dueDate && task.dueDate < new Date() && task.status !== 'COMPLETED';
      const canStart = task.dependencies.every(dep => dep.status === 'COMPLETED');
      
      return {
        ...task,
        isOverdue,
        canStart,
        daysUntilDue: task.dueDate ? Math.ceil((task.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
      };
    });

    return NextResponse.json({
      tasks: tasksWithComputedFields,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can create tasks
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = taskCreateSchema.parse(body);

    // Verify module exists and user has access
    const module = await db.module.findFirst({
      where: {
        id: validatedData.moduleId,
        event: session.user.role === UserRole.ADMIN ? undefined : {
          OR: [
            { managerId: session.user.id },
            { companyId: session.user.companyId }
          ]
        }
      },
      include: {
        event: {
          select: { id: true, name: true, companyId: true }
        }
      }
    });

    if (!module) {
      return NextResponse.json({ error: 'Module not found or not accessible' }, { status: 404 });
    }

    // Verify assigned user exists and belongs to the same company
    if (validatedData.assignedToId) {
      const assignedUser = await db.user.findFirst({
        where: {
          id: validatedData.assignedToId,
          companyId: module.event.companyId
        }
      });
      if (!assignedUser) {
        return NextResponse.json({ error: 'Assigned user not found or not in the same company' }, { status: 404 });
      }
    }

    // Verify dependencies exist and belong to the same event
    if (validatedData.dependencyIds && validatedData.dependencyIds.length > 0) {
      const dependencies = await db.task.findMany({
        where: {
          id: { in: validatedData.dependencyIds },
          module: {
            eventId: module.event.id
          }
        }
      });
      if (dependencies.length !== validatedData.dependencyIds.length) {
        return NextResponse.json({ error: 'Some dependencies not found or not in the same event' }, { status: 404 });
      }
    }

    const task = await db.task.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        priority: validatedData.priority,
        dueDate: validatedData.dueDate,
        estimatedHours: validatedData.estimatedHours,
        moduleId: validatedData.moduleId,
        assignedToId: validatedData.assignedToId,
        dependencies: validatedData.dependencyIds ? {
          connect: validatedData.dependencyIds.map(id => ({ id }))
        } : undefined,
        status: 'PENDING'
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, phone: true }
        },
        module: {
          select: {
            id: true,
            name: true,
            category: true,
            event: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        dependencies: {
          select: { id: true, name: true, status: true }
        }
      }
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}