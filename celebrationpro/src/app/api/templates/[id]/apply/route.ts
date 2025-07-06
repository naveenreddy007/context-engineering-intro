import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

interface RouteParams {
  params: { id: string };
}

const applyTemplateSchema = z.object({
  eventName: z.string().min(1, 'Event name is required'),
  eventDescription: z.string().optional(),
  clientId: z.string().min(1, 'Client is required'),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  venue: z.string().min(1, 'Venue is required'),
  budget: z.number().positive().optional(),
  guestCount: z.number().positive().optional(),
  customizations: z.object({
    excludeModules: z.array(z.string()).optional(),
    moduleCustomizations: z.record(z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      budget: z.number().optional(),
      estimatedDays: z.number().optional()
    })).optional()
  }).optional()
});

// POST /api/templates/[id]/apply - Apply template to create event
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can apply templates
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const templateId = params.id;
    const body = await request.json();
    const validatedData = applyTemplateSchema.parse(body);

    // Check if template exists and is accessible
    const template = await db.template.findFirst({
      where: {
        id: templateId,
        OR: session.user.role === UserRole.ADMIN ? undefined : [
          { isPublic: true },
          { companyId: session.user.companyId }
        ]
      },
      include: {
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

    if (!template) {
      return NextResponse.json({ error: 'Template not found or not accessible' }, { status: 404 });
    }

    // Verify client exists and belongs to the same company
    const client = await db.user.findFirst({
      where: {
        id: validatedData.clientId,
        role: UserRole.CLIENT,
        companyId: session.user.companyId
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found or not accessible' }, { status: 404 });
    }

    // Start transaction to create event with modules and tasks
    const result = await db.$transaction(async (tx) => {
      // Create the event
      const event = await tx.event.create({
        data: {
          name: validatedData.eventName,
          description: validatedData.eventDescription,
          type: template.type,
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          venue: validatedData.venue,
          budget: validatedData.budget,
          guestCount: validatedData.guestCount,
          clientId: validatedData.clientId,
          managerId: session.user.id,
          companyId: session.user.companyId!,
          templateId: template.id,
          status: 'PLANNING'
        }
      });

      // Filter modules based on customizations
      const excludeModules = validatedData.customizations?.excludeModules || [];
      const modulesToCreate = template.modules.filter(module => !excludeModules.includes(module.id));

      // Create modules and tasks
      for (const templateModule of modulesToCreate) {
        const moduleCustomization = validatedData.customizations?.moduleCustomizations?.[templateModule.id];
        
        const module = await tx.module.create({
          data: {
            name: moduleCustomization?.name || templateModule.name,
            description: moduleCustomization?.description || templateModule.description,
            category: templateModule.category,
            budget: moduleCustomization?.budget || templateModule.budget,
            estimatedDays: moduleCustomization?.estimatedDays || templateModule.estimatedDays,
            order: templateModule.order,
            eventId: event.id,
            status: 'PENDING'
          }
        });

        // Create tasks for this module
        const taskIdMapping: Record<string, string> = {};
        
        // First pass: create all tasks without dependencies
        for (const templateTask of templateModule.tasks) {
          const task = await tx.task.create({
            data: {
              name: templateTask.name,
              description: templateTask.description,
              priority: templateTask.priority,
              estimatedHours: templateTask.estimatedHours,
              order: templateTask.order,
              moduleId: module.id,
              status: 'PENDING',
              // Calculate due date based on event start date and task order
              dueDate: new Date(validatedData.startDate.getTime() + (templateTask.order * 24 * 60 * 60 * 1000))
            }
          });
          taskIdMapping[templateTask.id] = task.id;
        }

        // Second pass: update task dependencies
        for (const templateTask of templateModule.tasks) {
          if (templateTask.dependencies && templateTask.dependencies.length > 0) {
            const dependencyIds = templateTask.dependencies
              .map(dep => taskIdMapping[dep.id])
              .filter(Boolean);
            
            if (dependencyIds.length > 0) {
              await tx.task.update({
                where: { id: taskIdMapping[templateTask.id] },
                data: {
                  dependencies: {
                    connect: dependencyIds.map(id => ({ id }))
                  }
                }
              });
            }
          }
        }
      }

      // Fetch the complete created event
      const completeEvent = await tx.event.findUnique({
        where: { id: event.id },
        include: {
          client: {
            select: { id: true, name: true, email: true, phone: true }
          },
          manager: {
            select: { id: true, name: true, email: true }
          },
          company: {
            select: { id: true, name: true }
          },
          template: {
            select: { id: true, name: true, type: true }
          },
          modules: {
            include: {
              tasks: {
                include: {
                  dependencies: {
                    select: { id: true, name: true }
                  }
                },
                orderBy: { order: 'asc' }
              }
            },
            orderBy: { order: 'asc' }
          }
        }
      });

      return completeEvent;
    });

    // Calculate progress (should be 0 for new event)
    const allTasks = result!.modules.flatMap(module => module.tasks);
    const completedTasks = allTasks.filter(task => task.status === 'COMPLETED');
    const progress = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

    return NextResponse.json({
      ...result,
      progress,
      taskCount: allTasks.length,
      completedTaskCount: completedTasks.length,
      message: 'Template applied successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error applying template:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to apply template' },
      { status: 500 }
    );
  }
}