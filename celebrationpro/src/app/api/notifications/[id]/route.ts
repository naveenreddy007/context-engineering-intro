import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';

// GET /api/notifications/[id] - Get specific notification
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = params.id;

    const notification = await db.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: session.user.id
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            type: true,
            startDate: true,
            endDate: true,
            status: true
          }
        },
        task: {
          select: {
            id: true,
            name: true,
            priority: true,
            status: true,
            dueDate: true
          }
        },
        module: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Parse metadata if it exists
    let parsedMetadata = null;
    if (notification.metadata) {
      try {
        parsedMetadata = JSON.parse(notification.metadata);
      } catch (error) {
        console.warn('Failed to parse notification metadata:', error);
        parsedMetadata = notification.metadata;
      }
    }

    return NextResponse.json({
      ...notification,
      metadata: parsedMetadata
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/[id] - Update specific notification
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = params.id;
    const body = await request.json();

    // Check if notification exists and belongs to user
    const notification = await db.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: session.user.id
      }
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Only allow updating read status and adding notes
    const allowedUpdates: any = {};
    
    if (body.read !== undefined) {
      allowedUpdates.read = body.read;
      allowedUpdates.readAt = body.read ? new Date() : null;
    }
    
    if (body.notes !== undefined) {
      allowedUpdates.notes = body.notes;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    const updatedNotification = await db.notification.update({
      where: { id: notificationId },
      data: allowedUpdates,
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
      }
    });

    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete specific notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = params.id;

    // Check if notification exists and belongs to user or user has admin rights
    let whereClause: any = { id: notificationId };
    
    if (session.user.role === UserRole.ADMIN) {
      // Admins can delete any notification in their company
      whereClause = {
        id: notificationId,
        recipient: {
          companyId: session.user.companyId
        }
      };
    } else {
      // Users can only delete their own notifications
      whereClause.recipientId = session.user.id;
    }

    const notification = await db.notification.findFirst({
      where: whereClause
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await db.notification.delete({
      where: { id: notificationId }
    });

    return NextResponse.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}