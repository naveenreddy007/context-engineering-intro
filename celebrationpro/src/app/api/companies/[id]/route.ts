import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const updateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').optional(),
  industry: z.string().min(1, 'Industry is required').optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Valid email is required').optional(),
  website: z.string().url('Valid website URL is required').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  settings: z.object({
    timezone: z.string().optional(),
    currency: z.string().optional(),
    dateFormat: z.string().optional(),
    workingDays: z.array(z.number().min(0).max(6)).optional(),
    workingHours: z.object({
      start: z.string().optional(),
      end: z.string().optional()
    }).optional()
  }).optional()
});

// GET /api/companies/[id] - Get specific company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = params.id;

    // Check permissions
    let canView = false;
    if (session.user.role === UserRole.ADMIN) {
      // Super admins can view any company
      canView = true;
    } else if (companyId === session.user.companyId) {
      // Users can view their own company
      canView = true;
    }

    if (!canView) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            users: true,
            events: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true
          },
          orderBy: {
            name: 'asc'
          }
        },
        events: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            startDate: true,
            endDate: true
          },
          orderBy: {
            startDate: 'desc'
          },
          take: 10
        }
      }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Parse settings
    let parsedSettings = {};
    if (company.settings) {
      try {
        parsedSettings = JSON.parse(company.settings);
      } catch (error) {
        console.warn(`Failed to parse settings for company ${company.id}:`, error);
      }
    }

    return NextResponse.json({
      ...company,
      settings: parsedSettings
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
}

// PUT /api/companies/[id] - Update specific company
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = params.id;
    const body = await request.json();
    const validatedData = updateCompanySchema.parse(body);

    // Check permissions
    let canUpdate = false;
    if (session.user.role === UserRole.ADMIN) {
      // Super admins can update any company
      canUpdate = true;
    } else if (companyId === session.user.companyId && 
               [UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      // Company admins/managers can update their own company (limited fields)
      canUpdate = true;
      // Remove restricted fields for non-super-admins
      delete validatedData.isActive;
    }

    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if company exists
    const existingCompany = await db.company.findUnique({
      where: { id: companyId }
    });

    if (!existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check name uniqueness if name is being updated
    if (validatedData.name && validatedData.name !== existingCompany.name) {
      const nameExists = await db.company.findFirst({
        where: {
          name: {
            equals: validatedData.name,
            mode: 'insensitive'
          },
          id: { not: companyId }
        }
      });
      if (nameExists) {
        return NextResponse.json(
          { error: 'Company name already exists' },
          { status: 400 }
        );
      }
    }

    // Check email uniqueness if email is being updated
    if (validatedData.email && validatedData.email !== existingCompany.email) {
      const emailExists = await db.company.findFirst({
        where: {
          email: validatedData.email,
          id: { not: companyId }
        }
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'Company email already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      updatedAt: new Date()
    };

    // Handle settings update
    if (validatedData.settings) {
      // Merge with existing settings
      let existingSettings = {};
      if (existingCompany.settings) {
        try {
          existingSettings = JSON.parse(existingCompany.settings);
        } catch (error) {
          console.warn('Failed to parse existing settings:', error);
        }
      }
      
      const mergedSettings = {
        ...existingSettings,
        ...validatedData.settings
      };
      updateData.settings = JSON.stringify(mergedSettings);
    }

    const updatedCompany = await db.company.update({
      where: { id: companyId },
      data: updateData,
      include: {
        _count: {
          select: {
            users: true,
            events: true
          }
        }
      }
    });

    // Parse settings for response
    let parsedSettings = {};
    if (updatedCompany.settings) {
      try {
        parsedSettings = JSON.parse(updatedCompany.settings);
      } catch (error) {
        console.warn('Failed to parse updated settings:', error);
      }
    }

    return NextResponse.json({
      message: 'Company updated successfully',
      company: {
        ...updatedCompany,
        settings: parsedSettings
      }
    });
  } catch (error) {
    console.error('Error updating company:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/[id] - Delete specific company (Super Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const companyId = params.id;

    // Prevent deleting own company
    if (companyId === session.user.companyId) {
      return NextResponse.json(
        { error: 'Cannot delete your own company' },
        { status: 400 }
      );
    }

    // Check if company exists
    const company = await db.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            users: true,
            events: true
          }
        }
      }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if company has active data
    if (company._count.users > 0 || company._count.events > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete company with existing data',
          details: {
            users: company._count.users,
            events: company._count.events
          }
        },
        { status: 400 }
      );
    }

    // Soft delete by deactivating the company
    const deactivatedCompany = await db.company.update({
      where: { id: companyId },
      data: {
        isActive: false,
        name: `deleted_${Date.now()}_${company.name}`, // Prevent name conflicts
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        isActive: true
      }
    });

    return NextResponse.json({
      message: 'Company deactivated successfully',
      company: deactivatedCompany
    });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
}