import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { UserRole } from '@prisma/client';

// GET /api/ai/commands/[id] - Get specific AI command details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const commandId = params.id;

    // Build where clause based on user role
    let whereClause: any = { id: commandId };
    
    if (session.user.role === UserRole.ADMIN) {
      // Admins can see all commands in their company
      whereClause.companyId = session.user.companyId;
    } else if (session.user.role === UserRole.MANAGER) {
      // Managers can see commands from their company
      whereClause.companyId = session.user.companyId;
    } else {
      // Other roles can only see their own commands
      whereClause.userId = session.user.id;
    }

    const command = await db.aICommand.findFirst({
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
      }
    });

    if (!command) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
    }

    // Parse response and context if they exist
    let parsedResponse = null;
    let parsedContext = null;

    try {
      if (command.response) {
        parsedResponse = JSON.parse(command.response);
      }
    } catch (error) {
      console.warn('Failed to parse command response:', error);
      parsedResponse = command.response;
    }

    try {
      if (command.context) {
        parsedContext = JSON.parse(command.context);
      }
    } catch (error) {
      console.warn('Failed to parse command context:', error);
      parsedContext = command.context;
    }

    return NextResponse.json({
      id: command.id,
      type: command.type,
      prompt: command.prompt,
      response: parsedResponse,
      context: parsedContext,
      status: command.status,
      error: command.error,
      createdAt: command.createdAt,
      updatedAt: command.updatedAt,
      user: command.user
    });
  } catch (error) {
    console.error('Error fetching AI command:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI command' },
      { status: 500 }
    );
  }
}

// DELETE /api/ai/commands/[id] - Delete specific AI command
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const commandId = params.id;

    // Build where clause based on user role
    let whereClause: any = { id: commandId };
    
    if (session.user.role === UserRole.ADMIN) {
      // Admins can delete any command in their company
      whereClause.companyId = session.user.companyId;
    } else if (session.user.role === UserRole.MANAGER) {
      // Managers can delete commands from their company
      whereClause.companyId = session.user.companyId;
    } else {
      // Other roles can only delete their own commands
      whereClause.userId = session.user.id;
    }

    const command = await db.aICommand.findFirst({
      where: whereClause
    });

    if (!command) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
    }

    await db.aICommand.delete({
      where: { id: commandId }
    });

    return NextResponse.json({ message: 'Command deleted successfully' });
  } catch (error) {
    console.error('Error deleting AI command:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI command' },
      { status: 500 }
    );
  }
}

// PUT /api/ai/commands/[id] - Update AI command (for retrying failed commands)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow ADMIN and MANAGER to retry commands
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const commandId = params.id;
    const body = await request.json();

    // Build where clause based on user role
    let whereClause: any = { id: commandId };
    
    if (session.user.role === UserRole.ADMIN) {
      whereClause.companyId = session.user.companyId;
    } else if (session.user.role === UserRole.MANAGER) {
      whereClause.companyId = session.user.companyId;
    } else {
      whereClause.userId = session.user.id;
    }

    const command = await db.aICommand.findFirst({
      where: whereClause
    });

    if (!command) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
    }

    // Only allow updating failed commands or adding notes
    const allowedUpdates: any = {};
    
    if (body.action === 'retry' && command.status === 'FAILED') {
      // Reset status to pending for retry
      allowedUpdates.status = 'PENDING';
      allowedUpdates.error = null;
      allowedUpdates.updatedAt = new Date();
    } else if (body.notes !== undefined) {
      // Allow adding notes/comments
      allowedUpdates.notes = body.notes;
      allowedUpdates.updatedAt = new Date();
    } else {
      return NextResponse.json({ error: 'Invalid update action' }, { status: 400 });
    }

    const updatedCommand = await db.aICommand.update({
      where: { id: commandId },
      data: allowedUpdates,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json({
      id: updatedCommand.id,
      type: updatedCommand.type,
      status: updatedCommand.status,
      error: updatedCommand.error,
      notes: updatedCommand.notes,
      updatedAt: updatedCommand.updatedAt,
      user: updatedCommand.user
    });
  } catch (error) {
    console.error('Error updating AI command:', error);
    return NextResponse.json(
      { error: 'Failed to update AI command' },
      { status: 500 }
    );
  }
}