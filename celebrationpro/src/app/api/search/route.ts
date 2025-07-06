import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserRole, EventStatus, TaskStatus } from '@prisma/client';

const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  types: z.array(z.enum(['events', 'tasks', 'templates', 'users', 'clients'])).default(['events', 'tasks']),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 50)),
  eventId: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  dateFrom: z.string().transform(val => val ? new Date(val) : undefined).optional(),
  dateTo: z.string().transform(val => val ? new Date(val) : undefined).optional()
});

// GET /api/search - Global search across the platform
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchSchema.parse({
      q: searchParams.get('q'),
      types: searchParams.get('types')?.split(',') || undefined,
      limit: searchParams.get('limit'),
      eventId: searchParams.get('eventId'),
      status: searchParams.get('status'),
      priority: searchParams.get('priority'),
      assignedTo: searchParams.get('assignedTo'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo')
    });

    const searchTerm = query.q.toLowerCase();
    const results: any = {
      query: query.q,
      totalResults: 0,
      results: {}
    };

    // Search Events
    if (query.types.includes('events')) {
      const eventWhereClause: any = {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { venue: { contains: searchTerm, mode: 'insensitive' } },
          { type: { contains: searchTerm, mode: 'insensitive' } }
        ]
      };

      // Role-based filtering
      if (session.user.role === UserRole.CLIENT) {
        eventWhereClause.clientId = session.user.id;
      } else if ([UserRole.ADMIN, UserRole.MANAGER, UserRole.VENDOR].includes(session.user.role as UserRole)) {
        eventWhereClause.companyId = session.user.companyId;
      }

      // Apply additional filters
      if (query.status) {
        eventWhereClause.status = query.status;
      }

      if (query.dateFrom || query.dateTo) {
        eventWhereClause.startDate = {};
        if (query.dateFrom) eventWhereClause.startDate.gte = query.dateFrom;
        if (query.dateTo) eventWhereClause.startDate.lte = query.dateTo;
      }

      const events = await db.event.findMany({
        where: eventWhereClause,
        include: {
          client: {
            select: {
              name: true,
              email: true
            }
          },
          createdBy: {
            select: {
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              tasks: true,
              modules: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: query.limit
      });

      results.results.events = events.map(event => ({
        id: event.id,
        name: event.name,
        type: event.type,
        status: event.status,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        venue: event.venue,
        guestCount: event.guestCount,
        budget: event.budget,
        client: event.client,
        createdBy: event.createdBy,
        taskCount: event._count.tasks,
        moduleCount: event._count.modules,
        relevanceScore: calculateRelevanceScore(searchTerm, [
          event.name,
          event.description,
          event.venue,
          event.type
        ])
      }));
      
      results.totalResults += events.length;
    }

    // Search Tasks
    if (query.types.includes('tasks')) {
      const taskWhereClause: any = {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      };

      // Role-based filtering
      if (session.user.role === UserRole.CLIENT) {
        taskWhereClause.module = {
          event: {
            clientId: session.user.id
          }
        };
      } else if ([UserRole.ADMIN, UserRole.MANAGER, UserRole.VENDOR].includes(session.user.role as UserRole)) {
        taskWhereClause.module = {
          event: {
            companyId: session.user.companyId
          }
        };
      }

      // Apply additional filters
      if (query.eventId) {
        taskWhereClause.module.eventId = query.eventId;
      }

      if (query.status) {
        taskWhereClause.status = query.status;
      }

      if (query.priority) {
        taskWhereClause.priority = query.priority;
      }

      if (query.assignedTo) {
        taskWhereClause.assignedToId = query.assignedTo;
      }

      if (query.dateFrom || query.dateTo) {
        taskWhereClause.dueDate = {};
        if (query.dateFrom) taskWhereClause.dueDate.gte = query.dateFrom;
        if (query.dateTo) taskWhereClause.dueDate.lte = query.dateTo;
      }

      const tasks = await db.task.findMany({
        where: taskWhereClause,
        include: {
          module: {
            select: {
              name: true,
              category: true,
              event: {
                select: {
                  name: true,
                  type: true,
                  status: true
                }
              }
            }
          },
          assignedTo: {
            select: {
              name: true,
              email: true
            }
          },
          createdBy: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: query.limit
      });

      results.results.tasks = tasks.map(task => {
        const isOverdue = task.dueDate && task.status !== TaskStatus.COMPLETED && new Date() > task.dueDate;
        
        return {
          id: task.id,
          name: task.name,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
          actualHours: task.actualHours,
          isOverdue,
          module: task.module,
          assignedTo: task.assignedTo,
          createdBy: task.createdBy,
          relevanceScore: calculateRelevanceScore(searchTerm, [
            task.name,
            task.description
          ])
        };
      });
      
      results.totalResults += tasks.length;
    }

    // Search Templates (ADMIN/MANAGER only)
    if (query.types.includes('templates') && [UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      const templateWhereClause: any = {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { category: { contains: searchTerm, mode: 'insensitive' } }
        ]
      };

      // Non-admins can only see public templates or their company's templates
      if (session.user.role !== UserRole.ADMIN) {
        templateWhereClause.OR.push(
          { isPublic: true },
          { companyId: session.user.companyId }
        );
      }

      const templates = await db.eventTemplate.findMany({
        where: templateWhereClause,
        include: {
          createdBy: {
            select: {
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              modules: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: query.limit
      });

      results.results.templates = templates.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        isPublic: template.isPublic,
        estimatedDuration: template.estimatedDuration,
        estimatedBudget: template.estimatedBudget,
        createdBy: template.createdBy,
        moduleCount: template._count.modules,
        relevanceScore: calculateRelevanceScore(searchTerm, [
          template.name,
          template.description,
          template.category
        ])
      }));
      
      results.totalResults += templates.length;
    }

    // Search Users (ADMIN/MANAGER only)
    if (query.types.includes('users') && [UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      const userWhereClause: any = {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { department: { contains: searchTerm, mode: 'insensitive' } }
        ]
      };

      // Role-based filtering
      if (session.user.role === UserRole.MANAGER) {
        userWhereClause.companyId = session.user.companyId;
      }

      const users = await db.user.findMany({
        where: userWhereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true
        },
        orderBy: {
          name: 'asc'
        },
        take: query.limit
      });

      results.results.users = users.map(user => ({
        ...user,
        relevanceScore: calculateRelevanceScore(searchTerm, [
          user.name || '',
          user.email,
          user.department || ''
        ])
      }));
      
      results.totalResults += users.length;
    }

    // Search Clients (for company team members)
    if (query.types.includes('clients') && [UserRole.ADMIN, UserRole.MANAGER, UserRole.VENDOR].includes(session.user.role as UserRole)) {
      const clientWhereClause: any = {
        role: UserRole.CLIENT,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } }
        ]
      };

      const clients = await db.user.findMany({
        where: clientWhereClause,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              clientEvents: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        },
        take: query.limit
      });

      results.results.clients = clients.map(client => ({
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        isActive: client.isActive,
        createdAt: client.createdAt,
        eventCount: client._count.clientEvents,
        relevanceScore: calculateRelevanceScore(searchTerm, [
          client.name || '',
          client.email,
          client.phone || ''
        ])
      }));
      
      results.totalResults += clients.length;
    }

    // Sort all results by relevance score
    Object.keys(results.results).forEach(key => {
      if (results.results[key]) {
        results.results[key].sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
      }
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error performing search:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

// Calculate relevance score based on search term matches
function calculateRelevanceScore(searchTerm: string, fields: (string | null | undefined)[]): number {
  let score = 0;
  const term = searchTerm.toLowerCase();
  
  fields.forEach((field, index) => {
    if (!field) return;
    
    const fieldValue = field.toLowerCase();
    
    // Exact match gets highest score
    if (fieldValue === term) {
      score += 100;
    }
    // Starts with search term
    else if (fieldValue.startsWith(term)) {
      score += 75;
    }
    // Contains search term
    else if (fieldValue.includes(term)) {
      score += 50;
    }
    // Fuzzy match (words contain search term)
    else {
      const words = fieldValue.split(' ');
      const matchingWords = words.filter(word => word.includes(term));
      score += (matchingWords.length / words.length) * 25;
    }
    
    // First field (usually name) gets higher weight
    if (index === 0) {
      score *= 1.5;
    }
  });
  
  return Math.round(score);
}