import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { templateUpdateSchema } from '@/lib/validations';
import { UserRole } from '@prisma/client';

interface RouteParams {
  params: { id: string };
}

// GET /api/templates/[id] - Get template details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templateId = params.id;

    // Build where clause based on access permissions
    let whereClause: any = { id: templateId };
    
    if (session.user.role !== UserRole.ADMIN) {
      whereClause.OR = [
        { isPublic: true },
        { companyId: session.user.companyId }
      ];
    }

    const template = await db.template.findFirst({
      where: whereClause,
      include: {
        company: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        modules: {
          include: {
            tasks: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        events: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            startDate: true,
            client: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        _count: {
          select: { events: true }
        }
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found or not accessible' }, { status: 404 });
    }

    // Calculate template statistics
    const totalTasks = template.modules.reduce((sum, module) => sum + module.tasks.length, 0);
    const estimatedDuration = template.modules.reduce((sum, module) => {
      return sum + (module.estimatedDays || 0);
    }, 0);
    const totalEstimatedHours = template.modules.reduce((sum, module) => {
      return sum + module.tasks.reduce((taskSum, task) => taskSum + (task.estimatedHours || 0), 0);
    }, 0);

    return NextResponse.json({
      ...template,
      totalModules: template.modules.length,
      totalTasks,
      estimatedDuration,
      totalEstimatedHours,
      usageCount: template._count.events
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PUT /api/templates/[id] - Update template
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templateId = params.id;
    const body = await request.json();
    const validatedData = templateUpdateSchema.parse(body);

    // Check if user can update this template
    const existingTemplate = await db.template.findFirst({
      where: {
        id: templateId,
        OR: session.user.role === UserRole.ADMIN ? undefined : [
          { companyId: session.user.companyId },
          { createdById: session.user.id }
        ]
      }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found or not accessible' }, { status: 404 });
    }

    // Only ADMIN and MANAGER can update templates
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only ADMIN can make templates public or update public templates
    if ((validatedData.isPublic || existingTemplate.isPublic) && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Only administrators can manage public templates' }, { status: 403 });
    }

    const updatedTemplate = await db.template.update({
      where: { id: templateId },
      data: validatedData,
      include: {
        company: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        modules: {
          include: {
            tasks: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templateId = params.id;

    // Check if user can delete this template
    const existingTemplate = await db.template.findFirst({
      where: {
        id: templateId,
        OR: session.user.role === UserRole.ADMIN ? undefined : [
          { companyId: session.user.companyId },
          { createdById: session.user.id }
        ]
      },
      include: {
        _count: {
          select: { events: true }
        }
      }
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found or not accessible' }, { status: 404 });
    }

    // Only ADMIN and MANAGER can delete templates
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only ADMIN can delete public templates
    if (existingTemplate.isPublic && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Only administrators can delete public templates' }, { status: 403 });
    }

    // Check if template is being used
    if (existingTemplate._count.events > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template that is being used by events' },
        { status: 400 }
      );
    }

    await db.template.delete({
      where: { id: templateId }
    });

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}