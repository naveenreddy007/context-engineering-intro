import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { taskUpdateSchema } from '@/lib/validations';
import { UserRole } from '@prisma/client';

interface RouteParams {
  params: { id: string };
}

// GET /api/tasks/[id] - Get task details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskId = params.id;

    // Build where clause based on user role
    let whereClause: any = { id: taskId };
    
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

    const task = await db.task.findFirst({
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
                  select: { id: true, name: true, email: true }
                },
                manager: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        },
        dependencies: {
          select: { id: true, name: true, status: true, dueDate: true }
        },
        dependentTasks: {
          select: { id: true, name: true, status: true, assignedTo: {
            select: { id: true, name: true }
          }}
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Add computed fields
    const isOverdue = task.dueDate && task.dueDate < new Date() && task.status !== 'COMPLETED';
    const canStart = task.dependencies.every(dep => dep.status === 'COMPLETED');
    const blockedTasks = task.dependentTasks.filter(dep => dep.status === 'PENDING');
    
    return NextResponse.json({
      ...task,
      isOverdue,
      canStart,
      blockedTasks,
      daysUntilDue: task.dueDate ? Math.ceil((task.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskId = params.id;
    const body = await request.json();
    const validatedData = taskUpdateSchema.parse(body);

    // Check if user can update this task
    const existingTask = await db.task.findFirst({
      where: {
        id: taskId,
        OR: session.user.role === UserRole.ADMIN ? undefined : [
          { assignedToId: session.user.id }, // Assigned user can update
          {
            module: {
              event: {
                OR: [
                  { managerId: session.user.id }, // Manager can update
                  { companyId: session.user.companyId } // Same company
                ]
              }
            }
          }
        ]
      },
      include: {
        dependencies: true,
        module: {
          include: {
            event: true
          }
        }
      }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found or not accessible' }, { status: 404 });
    }

    // Check permissions for different update types
    const isAssignedUser = existingTask.assignedToId === session.user.id;
    const isManager = [UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole);

    // Assigned users can only update status and progress
    if (isAssignedUser && !isManager) {
      const allowedFields = ['status', 'progress', 'actualHours', 'notes'];
      const updateFields = Object.keys(validatedData);
      const hasDisallowedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasDisallowedFields) {
        return NextResponse.json(
          { error: 'You can only update status, progress, actual hours, and notes' },
          { status: 403 }
        );
      }
    }

    // Validate status transitions
    if (validatedData.status && validatedData.status !== existingTask.status) {
      // Check if dependencies are completed before starting
      if (validatedData.status === 'IN_PROGRESS') {
        const incompleteDependencies = existingTask.dependencies.filter(dep => dep.status !== 'COMPLETED');
        if (incompleteDependencies.length > 0) {
          return NextResponse.json(
            { error: 'Cannot start task until all dependencies are completed' },
            { status: 400 }
          );
        }
      }
    }

    // Verify assigned user if being updated
    if (validatedData.assignedToId && validatedData.assignedToId !== existingTask.assignedToId) {
      if (!isManager) {
        return NextResponse.json({ error: 'Only managers can reassign tasks' }, { status: 403 });
      }
      
      const assignedUser = await db.user.findFirst({
        where: {
          id: validatedData.assignedToId,
          companyId: existingTask.module.event.companyId
        }
      });
      if (!assignedUser) {
        return NextResponse.json({ error: 'Assigned user not found or not in the same company' }, { status: 404 });
      }
    }

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        ...validatedData,
        updatedAt: new Date()
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
        },
        dependentTasks: {
          select: { id: true, name: true, status: true }
        }
      }
    });

    // Add computed fields
    const isOverdue = updatedTask.dueDate && updatedTask.dueDate < new Date() && updatedTask.status !== 'COMPLETED';
    const canStart = updatedTask.dependencies.every(dep => dep.status === 'COMPLETED');
    
    return NextResponse.json({
      ...updatedTask,
      isOverdue,
      canStart,
      daysUntilDue: updatedTask.dueDate ? Math.ceil((updatedTask.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
    });
  } catch (error) {
    console.error('Error updating task:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskId = params.id;

    // Only ADMIN and MANAGER can delete tasks
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if user can delete this task
    const existingTask = await db.task.findFirst({
      where: {
        id: taskId,
        module: {
          event: session.user.role === UserRole.ADMIN ? undefined : {
            OR: [
              { managerId: session.user.id },
              { companyId: session.user.companyId }
            ]
          }
        }
      },
      include: {
        dependentTasks: true
      }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found or not accessible' }, { status: 404 });
    }

    // Check if task can be deleted (no dependent tasks or they are also being handled)
    if (existingTask.dependentTasks.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete task that has dependent tasks' },
        { status: 400 }
      );
    }

    // Check if task is not in progress or completed
    if (['IN_PROGRESS', 'COMPLETED'].includes(existingTask.status)) {
      return NextResponse.json(
        { error: 'Cannot delete task that is in progress or completed' },
        { status: 400 }
      );
    }

    await db.task.delete({
      where: { id: taskId }
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}