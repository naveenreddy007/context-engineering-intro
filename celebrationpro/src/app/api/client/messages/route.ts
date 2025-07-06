import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const messageSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  recipientId: z.string().optional(),
  subject: z.string().min(1, 'Subject is required').max(200),
  content: z.string().min(1, 'Message content is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    size: z.number().optional(),
    type: z.string().optional()
  })).optional()
});

const querySchema = z.object({
  eventId: z.string().optional(),
  conversationId: z.string().optional(),
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 50)),
  unreadOnly: z.string().transform(val => val === 'true').optional()
});

// GET /api/client/messages - Get client messages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    let whereClause: any = {
      OR: [
        { senderId: session.user.id },
        { recipientId: session.user.id }
      ]
    };

    // Role-based filtering
    if (session.user.role === UserRole.CLIENT) {
      // Clients can only see messages related to their events
      whereClause.event = {
        clientId: session.user.id
      };
    } else if ([UserRole.ADMIN, UserRole.MANAGER, UserRole.VENDOR].includes(session.user.role as UserRole)) {
      // Team members can see messages for events in their company
      whereClause.event = {
        companyId: session.user.companyId
      };
    }

    // Apply filters
    if (query.eventId) {
      whereClause.eventId = query.eventId;
    }

    if (query.conversationId) {
      whereClause.conversationId = query.conversationId;
    }

    if (query.unreadOnly) {
      whereClause.isRead = false;
      whereClause.recipientId = session.user.id;
    }

    const [messages, totalCount] = await Promise.all([
      db.message.findMany({
        where: whereClause,
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
          },
          replies: {
            include: {
              sender: {
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
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      db.message.count({ where: whereClause })
    ]);

    // Group messages by conversation
    const conversations = messages.reduce((acc, message) => {
      const conversationId = message.conversationId || message.id;
      if (!acc[conversationId]) {
        acc[conversationId] = {
          id: conversationId,
          subject: message.subject,
          event: message.event,
          participants: new Set(),
          messages: [],
          lastMessageAt: message.createdAt,
          unreadCount: 0
        };
      }
      
      acc[conversationId].participants.add(message.sender);
      if (message.recipient) {
        acc[conversationId].participants.add(message.recipient);
      }
      
      acc[conversationId].messages.push(message);
      
      if (message.createdAt > acc[conversationId].lastMessageAt) {
        acc[conversationId].lastMessageAt = message.createdAt;
      }
      
      if (!message.isRead && message.recipientId === session.user.id) {
        acc[conversationId].unreadCount++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Convert participants Set to Array
    Object.values(conversations).forEach((conversation: any) => {
      conversation.participants = Array.from(conversation.participants);
    });

    return NextResponse.json({
      conversations: Object.values(conversations),
      messages,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / query.limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/client/messages - Send new message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = messageSchema.parse(body);

    // Verify the event exists and user has access
    let event;
    if (session.user.role === UserRole.CLIENT) {
      event = await db.event.findFirst({
        where: {
          id: data.eventId,
          clientId: session.user.id
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          company: {
            include: {
              users: {
                where: {
                  role: {
                    in: [UserRole.ADMIN, UserRole.MANAGER]
                  },
                  isActive: true
                },
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      });
    } else {
      event = await db.event.findFirst({
        where: {
          id: data.eventId,
          companyId: session.user.companyId
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or access denied' },
        { status: 404 }
      );
    }

    // Determine recipient
    let recipientId = data.recipientId;
    if (!recipientId) {
      if (session.user.role === UserRole.CLIENT) {
        // Client sending to event manager or first available admin/manager
        recipientId = event.createdBy.id || event.company?.users[0]?.id;
      } else {
        // Team member sending to client
        recipientId = event.client?.id;
      }
    }

    if (!recipientId) {
      return NextResponse.json(
        { error: 'No valid recipient found' },
        { status: 400 }
      );
    }

    // Verify recipient has access to the event
    const recipient = await db.user.findFirst({
      where: {
        id: recipientId,
        OR: [
          { id: event.clientId },
          { companyId: event.companyId }
        ]
      }
    });

    if (!recipient) {
      return NextResponse.json(
        { error: 'Invalid recipient' },
        { status: 400 }
      );
    }

    // Create the message
    const message = await db.message.create({
      data: {
        eventId: data.eventId,
        senderId: session.user.id,
        recipientId,
        subject: data.subject,
        content: data.content,
        priority: data.priority,
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
        type: 'message_received',
        title: 'New Message',
        message: `${session.user.name} sent you a message about ${event.name}`,
        relatedEntityType: 'message',
        relatedEntityId: message.id
      }
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// PUT /api/client/messages - Mark messages as read
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageIds, conversationId, markAsRead = true } = body;

    let whereClause: any = {
      recipientId: session.user.id
    };

    if (messageIds && Array.isArray(messageIds)) {
      whereClause.id = {
        in: messageIds
      };
    } else if (conversationId) {
      whereClause.OR = [
        { id: conversationId },
        { conversationId }
      ];
    } else {
      return NextResponse.json(
        { error: 'Either messageIds or conversationId is required' },
        { status: 400 }
      );
    }

    const updatedMessages = await db.message.updateMany({
      where: whereClause,
      data: {
        isRead: markAsRead,
        readAt: markAsRead ? new Date() : null
      }
    });

    return NextResponse.json({
      success: true,
      updatedCount: updatedMessages.count
    });
  } catch (error) {
    console.error('Error updating messages:', error);
    return NextResponse.json(
      { error: 'Failed to update messages' },
      { status: 500 }
    );
  }
}