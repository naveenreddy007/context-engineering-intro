import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  role: z.nativeEnum(UserRole).optional(),
  search: z.string().optional(),
  active: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  companyId: z.string().optional()
});

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(UserRole),
  phone: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean().default(true),
  companyId: z.string().optional() // Only for ADMIN creating users for other companies
});

// GET /api/users - Get users list
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
      // Admins can see users from their company or specified company
      whereClause.companyId = query.companyId || session.user.companyId;
    } else if (session.user.role === UserRole.MANAGER) {
      // Managers can see users from their company
      whereClause.companyId = session.user.companyId;
    } else {
      // Other roles can only see themselves
      whereClause.id = session.user.id;
    }

    // Add additional filters
    if (query.role) {
      whereClause.role = query.role;
    }
    if (query.active !== undefined) {
      whereClause.isActive = query.active;
    }
    if (query.search) {
      whereClause.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [users, total] = await Promise.all([
      db.user.findMany({
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
              name: true
            }
          },
          _count: {
            select: {
              assignedTasks: true,
              createdEvents: true,
              notifications: true
            }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { name: 'asc' }
        ],
        skip,
        take: query.limit
      }),
      db.user.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return NextResponse.json({
      users,
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
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (Admin/Manager only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN and MANAGER can create users
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Determine company ID
    let targetCompanyId = session.user.companyId!;
    if (validatedData.companyId && session.user.role === UserRole.ADMIN) {
      // Only super admins can create users for other companies
      const targetCompany = await db.company.findUnique({
        where: { id: validatedData.companyId }
      });
      if (!targetCompany) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
      targetCompanyId = validatedData.companyId;
    }

    // Role restrictions
    if (session.user.role === UserRole.MANAGER) {
      // Managers cannot create ADMIN users
      if (validatedData.role === UserRole.ADMIN) {
        return NextResponse.json(
          { error: 'Managers cannot create admin users' },
          { status: 403 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    const newUser = await db.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role,
        phone: validatedData.phone,
        department: validatedData.department,
        isActive: validatedData.isActive,
        companyId: targetCompanyId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        department: true,
        isActive: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      message: 'User created successfully',
      user: newUser
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT /api/users - Bulk update users (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds, updates } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      );
    }

    // Validate updates
    const allowedUpdates = ['isActive', 'role', 'department'];
    const validUpdates: any = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        validUpdates[key] = value;
      }
    }

    if (Object.keys(validUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    // Update users (only in the same company)
    const result = await db.user.updateMany({
      where: {
        id: { in: userIds },
        companyId: session.user.companyId
      },
      data: {
        ...validUpdates,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      message: `${result.count} users updated successfully`,
      updatedCount: result.count
    });
  } catch (error) {
    console.error('Error bulk updating users:', error);
    return NextResponse.json(
      { error: 'Failed to update users' },
      { status: 500 }
    );
  }
}