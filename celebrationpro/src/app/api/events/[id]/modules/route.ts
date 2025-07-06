import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { moduleCreateSchema } from '@/lib/validations';
import { UserRole } from '@prisma/client';

interface RouteParams {
  params: { id: string };
}

// POST /api/events/[id]/modules - Add module to event
export async function POST(
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
    const validatedData = moduleCreateSchema.parse(body);

    // Check if user can modify this event
    const event = await db.event.findFirst({
      where: {
        id: eventId,
        OR: session.user.role === UserRole.ADMIN ? undefined : [
          { managerId: session.user.id },
          { companyId: session.user.companyId }
        ]
      },
      include: {
        modules: {
          select: { order: true }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found or not accessible' }, { status: 404 });
    }

    // Only ADMIN and MANAGER can add modules
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate next order
    const maxOrder = event.modules.reduce((max, module) => Math.max(max, module.order), 0);
    const nextOrder = maxOrder + 1;

    const module = await db.module.create({
      data: {
        ...validatedData,
        eventId,
        order: validatedData.order || nextOrder
      },
      include: {
        tasks: {
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return NextResponse.json(module, { status: 201 });
  } catch (error) {
    console.error('Error creating module:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create module' },
      { status: 500 }
    );
  }
}

// GET /api/events/[id]/modules - Get event modules
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

    // Check if user can access this event
    const event = await db.event.findFirst({
      where: {
        id: eventId,
        OR: session.user.role === UserRole.ADMIN ? undefined : [
          { clientId: session.user.id },
          { managerId: session.user.id },
          { companyId: session.user.companyId },
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
        ]
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found or not accessible' }, { status: 404 });
    }

    const modules = await db.module.findMany({
      where: { eventId },
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
    });

    // Calculate progress for each module
    const modulesWithProgress = modules.map(module => {
      const tasks = module.tasks;
      const completedTasks = tasks.filter(task => task.status === 'COMPLETED');
      const progress = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
      
      return {
        ...module,
        progress,
        taskCount: tasks.length,
        completedTaskCount: completedTasks.length
      };
    });

    return NextResponse.json(modulesWithProgress);
  } catch (error) {
    console.error('Error fetching modules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modules' },
      { status: 500 }
    );
  }
}