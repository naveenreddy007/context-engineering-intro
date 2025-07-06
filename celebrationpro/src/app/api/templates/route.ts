import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { templateCreateSchema } from '@/lib/validations';
import { UserRole } from '@prisma/client';

// GET /api/templates - List templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Build where clause
    let whereClause: any = {};
    
    // Filter by company for non-admin users
    if (session.user.role !== UserRole.ADMIN) {
      whereClause.OR = [
        { isPublic: true },
        { companyId: session.user.companyId }
      ];
    }

    if (type) {
      whereClause.type = type;
    }
    if (category) {
      whereClause.category = category;
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const templates = await db.template.findMany({
      where: whereClause,
      include: {
        company: {
          select: { id: true, name: true }
        },
        modules: {
          include: {
            _count: {
              select: { tasks: true }
            }
          },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { events: true }
        }
      },
      orderBy: [
        { isPublic: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Calculate template statistics
    const templatesWithStats = templates.map(template => {
      const totalTasks = template.modules.reduce((sum, module) => sum + module._count.tasks, 0);
      const estimatedDuration = template.modules.reduce((sum, module) => {
        return sum + (module.estimatedDays || 0);
      }, 0);
      
      return {
        ...template,
        totalModules: template.modules.length,
        totalTasks,
        estimatedDuration,
        usageCount: template._count.events
      };
    });

    return NextResponse.json(templatesWithStats);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates - Create new template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can create templates
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = templateCreateSchema.parse(body);

    // Only ADMIN can create public templates
    if (validatedData.isPublic && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Only administrators can create public templates' }, { status: 403 });
    }

    const template = await db.template.create({
      data: {
        ...validatedData,
        companyId: session.user.companyId!,
        createdById: session.user.id
      },
      include: {
        company: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        modules: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}