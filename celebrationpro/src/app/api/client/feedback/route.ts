import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserRole, EventStatus } from '@prisma/client';

const feedbackSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  category: z.enum(['overall', 'communication', 'quality', 'timeliness', 'value']).default('overall'),
  isPublic: z.boolean().default(false)
});

const querySchema = z.object({
  eventId: z.string().optional(),
  category: z.string().optional(),
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 50))
});

// GET /api/client/feedback - Get client's feedback history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    let whereClause: any = {};

    // Role-based access control
    if (session.user.role === UserRole.CLIENT) {
      whereClause.event = {
        clientId: session.user.id
      };
    } else if ([UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      whereClause.event = {
        companyId: session.user.companyId
      };
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Apply filters
    if (query.eventId) {
      whereClause.eventId = query.eventId;
    }

    if (query.category) {
      whereClause.category = query.category;
    }

    const [feedback, totalCount] = await Promise.all([
      db.feedback.findMany({
        where: whereClause,
        include: {
          event: {
            select: {
              id: true,
              name: true,
              type: true,
              startDate: true,
              status: true
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      db.feedback.count({ where: whereClause })
    ]);

    return NextResponse.json({
      feedback,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / query.limit)
      }
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

// POST /api/client/feedback - Submit new feedback
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only clients can submit feedback
    if (session.user.role !== UserRole.CLIENT) {
      return NextResponse.json({ error: 'Only clients can submit feedback' }, { status: 403 });
    }

    const body = await request.json();
    const data = feedbackSchema.parse(body);

    // Verify the event exists and belongs to the client
    const event = await db.event.findFirst({
      where: {
        id: data.eventId,
        clientId: session.user.id
      },
      select: {
        id: true,
        name: true,
        status: true,
        companyId: true
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or access denied' },
        { status: 404 }
      );
    }

    // Check if feedback already exists for this event and category
    const existingFeedback = await db.feedback.findFirst({
      where: {
        eventId: data.eventId,
        clientId: session.user.id,
        category: data.category
      }
    });

    if (existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback already submitted for this event and category' },
        { status: 409 }
      );
    }

    // Create the feedback
    const feedback = await db.feedback.create({
      data: {
        eventId: data.eventId,
        clientId: session.user.id,
        rating: data.rating,
        comment: data.comment,
        category: data.category,
        isPublic: data.isPublic
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            type: true,
            startDate: true,
            status: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create notification for the company team
    await db.notification.create({
      data: {
        userId: event.companyId, // This should be updated to notify specific users
        type: 'feedback_received',
        title: 'New Client Feedback',
        message: `${session.user.name} submitted feedback for ${event.name}`,
        relatedEntityType: 'feedback',
        relatedEntityId: feedback.id
      }
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error('Error creating feedback:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create feedback' },
      { status: 500 }
    );
  }
}