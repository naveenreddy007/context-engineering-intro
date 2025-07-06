import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserRole, NotificationType, NotificationPriority } from '@prisma/client';

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  type: z.nativeEnum(NotificationType).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  read: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  eventId: z.string().optional(),
  taskId: z.string().optional()
});

const createNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.nativeEnum(NotificationType),
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.MEDIUM),
  recipientIds: z.array(z.string()).min(1, 'At least one recipient is required'),
  eventId: z.string().optional(),
  taskId: z.string().optional(),
  moduleId: z.string().optional(),
  actionUrl: z.string().optional(),
  scheduledFor: z.string().optional().transform(val => val ? new Date(val) : undefined),
  metadata: z.record(z.any()).optional()
});

// GET /api/notifications - Get notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    const whereClause: any = {
      recipientId: session.user.id
    };

    // Add filters
    if (query.type) {
      whereClause.type = query.type;
    }
    if (query.priority) {
      whereClause.priority = query.priority;
    }
    if (query.read !== undefined) {
      whereClause.read = query.read;
    }
    if (query.eventId) {
      whereClause.eventId = query.eventId;
    }
    if (query.taskId) {
      whereClause.taskId = query.taskId;
    }

    const skip = (query.page - 1) * query.limit;

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: whereClause,
        include: {
          event: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          task: {
            select: {
              id: true,
              name: true,
              priority: true
            }
          },
          module: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: query.limit
      }),
      db.notification.count({ where: whereClause }),
      db.notification.count({
        where: {
          recipientId: session.user.id,
          read: false
        }
      })
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return NextResponse.json({
      notifications,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create new notification (Admin/Manager only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can create notifications
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createNotificationSchema.parse(body);

    // Verify all recipients belong to the same company
    const recipients = await db.user.findMany({
      where: {
        id: { in: validatedData.recipientIds },
        companyId: session.user.companyId
      },
      select: { id: true }
    });

    if (recipients.length !== validatedData.recipientIds.length) {
      return NextResponse.json(
        { error: 'Some recipients do not exist or belong to different company' },
        { status: 400 }
      );
    }

    // Verify event/task/module belong to the same company if specified
    if (validatedData.eventId) {
      const event = await db.event.findFirst({
        where: {
          id: validatedData.eventId,
          companyId: session.user.companyId
        }
      });
      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
    }

    if (validatedData.taskId) {
      const task = await db.task.findFirst({
        where: {
          id: validatedData.taskId,
          module: {
            event: {
              companyId: session.user.companyId
            }
          }
        }
      });
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
    }

    if (validatedData.moduleId) {
      const module = await db.eventModule.findFirst({
        where: {
          id: validatedData.moduleId,
          event: {
            companyId: session.user.companyId
          }
        }
      });
      if (!module) {
        return NextResponse.json({ error: 'Module not found' }, { status: 404 });
      }
    }

    // Create notifications for all recipients
    const notifications = await Promise.all(
      validatedData.recipientIds.map(recipientId =>
        db.notification.create({
          data: {
            title: validatedData.title,
            message: validatedData.message,
            type: validatedData.type,
            priority: validatedData.priority,
            recipientId,
            eventId: validatedData.eventId,
            taskId: validatedData.taskId,
            moduleId: validatedData.moduleId,
            actionUrl: validatedData.actionUrl,
            scheduledFor: validatedData.scheduledFor,
            metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
            createdById: session.user.id
          }
        })
      )
    );

    return NextResponse.json({
      message: 'Notifications created successfully',
      count: notifications.length,
      notifications: notifications.map(n => ({
        id: n.id,
        recipientId: n.recipientId,
        title: n.title,
        type: n.type,
        priority: n.priority
      }))
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating notifications:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create notifications' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications - Mark notifications as read/unread
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, read, markAll } = body;

    if (markAll) {
      // Mark all notifications as read for the user
      const result = await db.notification.updateMany({
        where: {
          recipientId: session.user.id,
          read: false
        },
        data: {
          read: true,
          readAt: new Date()
        }
      });

      return NextResponse.json({
        message: 'All notifications marked as read',
        updatedCount: result.count
      });
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'notificationIds array is required' },
        { status: 400 }
      );
    }

    // Update specific notifications
    const result = await db.notification.updateMany({
      where: {
        id: { in: notificationIds },
        recipientId: session.user.id
      },
      data: {
        read: read !== false,
        readAt: read !== false ? new Date() : null
      }
    });

    return NextResponse.json({
      message: `${result.count} notifications updated`,
      updatedCount: result.count
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}