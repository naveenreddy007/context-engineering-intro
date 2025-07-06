import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const replySchema = z.object({
  content: z.string().min(1, 'Reply content is required'),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    size: z.number().optional(),
    type: z.string().optional()
  })).optional()
});

// GET /api/client/messages/[id]/replies - Get replies for a message
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.id;

    // First, verify the user has access to the original message
    const originalMessage = await db.message.findFirst({
      where: {
        id: messageId,
        OR: [
          { senderId: session.user.id },
          { recipientId: session.user.id }
        ]
      },
      include: {
        event: {
          select: {
            id: true,
            clientId: true,
            companyId: true
          }
        }
      }
    });

    if (!originalMessage) {
      return NextResponse.json(
        { error: 'Message not found or access denied' },
        { status: 404 }
      );
    }

    // Additional role-based access check
    if (session.user.role === UserRole.CLIENT) {
      if (originalMessage.event.clientId !== session.user.id) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    } else if ([UserRole.ADMIN, UserRole.MANAGER, UserRole.VENDOR].includes(session.user.role as UserRole)) {
      if (originalMessage.event.companyId !== session.user.companyId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Get all replies for this message
    const replies = await db.message.findMany({
      where: {
        conversationId: messageId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return NextResponse.json({
      originalMessage: {
        id: originalMessage.id,
        subject: originalMessage.subject,
        content: originalMessage.content,
        priority: originalMessage.priority,
        createdAt: originalMessage.createdAt,
        attachments: originalMessage.attachments ? JSON.parse(originalMessage.attachments) : null
      },
      replies: replies.map(reply => ({
        id: reply.id,
        content: reply.content,
        createdAt: reply.createdAt,
        isRead: reply.isRead,
        readAt: reply.readAt,
        sender: reply.sender,
        recipient: reply.recipient,
        attachments: reply.attachments ? JSON.parse(reply.attachments) : null
      }))
    });
  } catch (error) {
    console.error('Error fetching message replies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message replies' },
      { status: 500 }
    );
  }
}

// POST /api/client/messages/[id]/replies - Reply to a message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.id;
    const body = await request.json();
    const data = replySchema.parse(body);

    // First, verify the user has access to the original message
    const originalMessage = await db.message.findFirst({
      where: {
        id: messageId,
        OR: [
          { senderId: session.user.id },
          { recipientId: session.user.id }
        ]
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            clientId: true,
            companyId: true
          }
        },
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!originalMessage) {
      return NextResponse.json(
        { error: 'Message not found or access denied' },
        { status: 404 }
      );
    }

    // Additional role-based access check
    if (session.user.role === UserRole.CLIENT) {
      if (originalMessage.event.clientId !== session.user.id) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    } else if ([UserRole.ADMIN, UserRole.MANAGER, UserRole.VENDOR].includes(session.user.role as UserRole)) {
      if (originalMessage.event.companyId !== session.user.companyId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Determine the recipient (the other party in the conversation)
    let recipientId: string;
    if (originalMessage.senderId === session.user.id) {
      recipientId = originalMessage.recipientId;
    } else {
      recipientId = originalMessage.senderId;
    }

    // Create the reply
    const reply = await db.message.create({
      data: {
        eventId: originalMessage.eventId,
        senderId: session.user.id,
        recipientId,
        subject: `Re: ${originalMessage.subject}`,
        content: data.content,
        priority: originalMessage.priority,
        conversationId: messageId,
        attachments: data.attachments ? JSON.stringify(data.attachments) : null
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        event: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true
          }
        }
      }
    });

    // Create notification for recipient
    await db.notification.create({
      data: {
        userId: recipientId,
        type: 'message_reply',
        title: 'New Reply',
        message: `${session.user.name} replied to your message about ${originalMessage.event.name}`,
        relatedEntityType: 'message',
        relatedEntityId: reply.id
      }
    });

    return NextResponse.json({
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      isRead: reply.isRead,
      readAt: reply.readAt,
      sender: reply.sender,
      recipient: reply.recipient,
      attachments: reply.attachments ? JSON.parse(reply.attachments) : null
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating message reply:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    );
  }
}