import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eventUpdateSchema } from '@/lib/validations';
import { UserRole } from '@prisma/client';

interface RouteParams {
  params: { id: string };
}

// GET /api/events/[id] - Get event details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;

    // Build where clause based on user role
    let whereClause: any = { id: eventId };
    
    if (session.user.role === UserRole.CLIENT) {
      whereClause.clientId = session.user.id;
    } else if (session.user.role === UserRole.VENDOR) {
      whereClause.OR = [
        { managerId: session.user.id },
        { 
          modules: {
            some: {
              tasks: {
                some: {
                  assignedToId: session.user.id
                }
              }
            }
          }
        }
      ];
    } else if (session.user.role === UserRole.MANAGER) {
      whereClause.OR = [
        { managerId: session.user.id },
        { companyId: session.user.companyId }
      ];
    }
    // ADMIN can see all events

    const event = await db.event.findFirst({
      where: whereClause,
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true }
        },
        manager: {
          select: { id: true, name: true, email: true }
        },
        company: {
          select: { id: true, name: true }
        },
        modules: {
          include: {
            tasks: {
              include: {
                assignedTo: {
                  select: { id: true, name: true, email: true }
                },
                dependencies: {
                  select: { id: true, name: true, status: true }
                }
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        notifications: {
          where: { userId: session.user.id },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Calculate progress
    const allTasks = event.modules.flatMap(module => module.tasks);
    const completedTasks = allTasks.filter(task => task.status === 'COMPLETED');
    const progress = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

    // Calculate module progress
    const modulesWithProgress = event.modules.map(module => {
      const moduleTasks = module.tasks;
      const moduleCompletedTasks = moduleTasks.filter(task => task.status === 'COMPLETED');
      const moduleProgress = moduleTasks.length > 0 ? Math.round((moduleCompletedTasks.length / moduleTasks.length) * 100) : 0;
      
      return {
        ...module,
        progress: moduleProgress,
        taskCount: moduleTasks.length,
        completedTaskCount: moduleCompletedTasks.length
      };
    });

    return NextResponse.json({
      ...event,
      modules: modulesWithProgress,
      progress,
      taskCount: allTasks.length,
      completedTaskCount: completedTasks.length
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

// PUT /api/events/[id] - Update event
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;
    const body = await request.json();
    const validatedData = eventUpdateSchema.parse(body);

    // Check if user can update this event
    const existingEvent = await db.event.findFirst({
      where: {
        id: eventId,
        OR: session.user.role === UserRole.ADMIN ? undefined : [
          { managerId: session.user.id },
          { companyId: session.user.companyId }
        ]
      }
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found or not accessible' }, { status: 404 });
    }

    // Only ADMIN and MANAGER can update events
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedEvent = await db.event.update({
      where: { id: eventId },
      data: validatedData,
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true }
        },
        manager: {
          select: { id: true, name: true, email: true }
        },
        company: {
          select: { id: true, name: true }
        },
        modules: {
          include: {
            tasks: {
              select: { id: true, status: true }
            }
          }
        }
      }
    });

    // Calculate progress
    const allTasks = updatedEvent.modules.flatMap(module => module.tasks);
    const completedTasks = allTasks.filter(task => task.status === 'COMPLETED');
    const progress = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

    return NextResponse.json({
      ...updatedEvent,
      progress,
      taskCount: allTasks.length,
      completedTaskCount: completedTasks.length
    });
  } catch (error) {
    console.error('Error updating event:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id] - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;

    // Check if user can delete this event
    const existingEvent = await db.event.findFirst({
      where: {
        id: eventId,
        OR: session.user.role === UserRole.ADMIN ? undefined : [
          { managerId: session.user.id },
          { companyId: session.user.companyId }
        ]
      }
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found or not accessible' }, { status: 404 });
    }

    // Only ADMIN and MANAGER can delete events
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if event can be deleted (not in progress or completed)
    if (['IN_PROGRESS', 'COMPLETED'].includes(existingEvent.status)) {
      return NextResponse.json(
        { error: 'Cannot delete event that is in progress or completed' },
        { status: 400 }
      );
    }

    await db.event.delete({
      where: { id: eventId }
    });

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}