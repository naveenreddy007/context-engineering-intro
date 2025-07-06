import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Valid email is required').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.nativeEnum(UserRole).optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional()
});

// GET /api/users/[id] - Get specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;

    // Build where clause based on user role
    let whereClause: any = { id: userId };
    
    if (session.user.role === UserRole.ADMIN) {
      // Admins can see any user in their company
      whereClause.companyId = session.user.companyId;
    } else if (session.user.role === UserRole.MANAGER) {
      // Managers can see users in their company
      whereClause.companyId = session.user.companyId;
    } else {
      // Other roles can only see themselves
      if (userId !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const user = await db.user.findFirst({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        department: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        company: {
          select: {
            id: true,
            name: true,
            industry: true
          }
        },
        _count: {
          select: {
            assignedTasks: true,
            createdEvents: true,
            notifications: true,
            createdTasks: true
          }
        },
        // Include recent activity for detailed view
        assignedTasks: {
          select: {
            id: true,
            name: true,
            status: true,
            priority: true,
            dueDate: true,
            module: {
              select: {
                name: true,
                event: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] }
          },
          orderBy: {
            dueDate: 'asc'
          },
          take: 5
        },
        createdEvents: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            startDate: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update specific user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Check permissions
    let canUpdate = false;
    let whereClause: any = { id: userId };
    
    if (session.user.role === UserRole.ADMIN) {
      // Admins can update any user in their company
      whereClause.companyId = session.user.companyId;
      canUpdate = true;
    } else if (session.user.role === UserRole.MANAGER) {
      // Managers can update non-admin users in their company
      whereClause.companyId = session.user.companyId;
      whereClause.role = { not: UserRole.ADMIN };
      canUpdate = true;
    } else if (userId === session.user.id) {
      // Users can update themselves (limited fields)
      canUpdate = true;
      // Remove restricted fields for self-update
      delete validatedData.role;
      delete validatedData.isActive;
    }

    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if user exists
    const existingUser = await db.user.findFirst({
      where: whereClause
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Additional role-based restrictions
    if (session.user.role === UserRole.MANAGER && validatedData.role === UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Managers cannot promote users to admin' },
        { status: 403 }
      );
    }

    // Check email uniqueness if email is being updated
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await db.user.findUnique({
        where: { email: validatedData.email }
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      updatedAt: new Date()
    };

    // Hash password if provided
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 12);
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        department: true,
        isActive: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete specific user (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const userId = params.id;

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if user exists and belongs to the same company
    const user = await db.user.findFirst({
      where: {
        id: userId,
        companyId: session.user.companyId
      },
      include: {
        _count: {
          select: {
            assignedTasks: true,
            createdEvents: true,
            createdTasks: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has active assignments
    if (user._count.assignedTasks > 0 || user._count.createdEvents > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete user with active assignments',
          details: {
            assignedTasks: user._count.assignedTasks,
            createdEvents: user._count.createdEvents,
            createdTasks: user._count.createdTasks
          }
        },
        { status: 400 }
      );
    }

    // Soft delete by deactivating the user instead of hard delete
    const deactivatedUser = await db.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        email: `deleted_${Date.now()}_${user.email}`, // Prevent email conflicts
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    });

    return NextResponse.json({
      message: 'User deactivated successfully',
      user: deactivatedUser
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}