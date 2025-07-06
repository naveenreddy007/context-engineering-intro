import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  type: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED']).optional(),
  userId: z.string().optional()
});

// GET /api/ai/commands - Get AI command history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    // Build where clause based on user role
    let whereClause: any = {};
    
    if (session.user.role === UserRole.ADMIN) {
      // Admins can see all commands in their company
      whereClause.companyId = session.user.companyId;
      if (query.userId) {
        whereClause.userId = query.userId;
      }
    } else if (session.user.role === UserRole.MANAGER) {
      // Managers can see commands from their company
      whereClause.companyId = session.user.companyId;
      if (query.userId) {
        // Verify the user belongs to the same company
        const targetUser = await db.user.findFirst({
          where: {
            id: query.userId,
            companyId: session.user.companyId
          }
        });
        if (targetUser) {
          whereClause.userId = query.userId;
        }
      }
    } else {
      // Other roles can only see their own commands
      whereClause.userId = session.user.id;
    }

    // Add additional filters
    if (query.type) {
      whereClause.type = query.type;
    }
    if (query.status) {
      whereClause.status = query.status;
    }

    const skip = (query.page - 1) * query.limit;

    const [commands, total] = await Promise.all([
      db.aICommand.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: query.limit
      }),
      db.aICommand.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return NextResponse.json({
      commands: commands.map(command => ({
        id: command.id,
        type: command.type,
        prompt: command.prompt.substring(0, 200) + (command.prompt.length > 200 ? '...' : ''),
        status: command.status,
        error: command.error,
        createdAt: command.createdAt,
        user: command.user,
        hasResponse: !!command.response
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching AI commands:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI commands' },
      { status: 500 }
    );
  }
}

// DELETE /api/ai/commands - Delete AI command history (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const commandId = searchParams.get('id');
    const olderThan = searchParams.get('olderThan'); // ISO date string

    if (commandId) {
      // Delete specific command
      const command = await db.aICommand.findFirst({
        where: {
          id: commandId,
          companyId: session.user.companyId
        }
      });

      if (!command) {
        return NextResponse.json({ error: 'Command not found' }, { status: 404 });
      }

      await db.aICommand.delete({
        where: { id: commandId }
      });

      return NextResponse.json({ message: 'Command deleted successfully' });
    } else if (olderThan) {
      // Delete commands older than specified date
      const cutoffDate = new Date(olderThan);
      if (isNaN(cutoffDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }

      const result = await db.aICommand.deleteMany({
        where: {
          companyId: session.user.companyId,
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      return NextResponse.json({ 
        message: `Deleted ${result.count} commands`,
        deletedCount: result.count
      });
    } else {
      return NextResponse.json({ error: 'Command ID or olderThan parameter required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error deleting AI commands:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI commands' },
      { status: 500 }
    );
  }
}