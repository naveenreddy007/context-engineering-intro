import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eventCreateSchema, eventFilterSchema } from '@/lib/validations';
import { UserRole } from '@prisma/client';

// GET /api/events - List events with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams);
    
    // Validate query parameters
    const validatedParams = eventFilterSchema.parse(params);

    // Build where clause based on user role
    let whereClause: any = {};
    
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

    // Apply filters
    if (validatedParams.status) {
      whereClause.status = validatedParams.status;
    }
    if (validatedParams.type) {
      whereClause.type = validatedParams.type;
    }
    if (validatedParams.search) {
      whereClause.OR = [
        { name: { contains: validatedParams.search, mode: 'insensitive' } },
        { venue: { contains: validatedParams.search, mode: 'insensitive' } }
      ];
    }
    if (validatedParams.startDate) {
      whereClause.startDate = { gte: new Date(validatedParams.startDate) };
    }
    if (validatedParams.endDate) {
      whereClause.endDate = { lte: new Date(validatedParams.endDate) };
    }

    const page = parseInt(validatedParams.page || '1');
    const limit = parseInt(validatedParams.limit || '10');
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      db.event.findMany({
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
                select: { id: true, status: true }
              }
            }
          },
          _count: {
            select: { modules: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      db.event.count({ where: whereClause })
    ]);

    // Calculate progress for each event
    const eventsWithProgress = events.map(event => {
      const allTasks = event.modules.flatMap(module => module.tasks);
      const completedTasks = allTasks.filter(task => task.status === 'COMPLETED');
      const progress = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;
      
      return {
        ...event,
        progress,
        taskCount: allTasks.length,
        completedTaskCount: completedTasks.length
      };
    });

    return NextResponse.json({
      events: eventsWithProgress,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST /api/events - Create new event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can create events
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = eventCreateSchema.parse(body);

    // Verify client exists and belongs to the same company (for MANAGER)
    if (session.user.role === UserRole.MANAGER) {
      const client = await db.user.findFirst({
        where: {
          id: validatedData.clientId,
          role: UserRole.CLIENT,
          companyId: session.user.companyId
        }
      });
      if (!client) {
        return NextResponse.json({ error: 'Client not found or not accessible' }, { status: 404 });
      }
    }

    const event = await db.event.create({
      data: {
        ...validatedData,
        managerId: session.user.id,
        companyId: session.user.companyId!,
        status: 'PLANNING'
      },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true }
        },
        manager: {
          select: { id: true, name: true, email: true }
        },
        company: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}