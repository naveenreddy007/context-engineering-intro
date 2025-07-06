import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  search: z.string().optional(),
  industry: z.string().optional(),
  active: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
});

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  industry: z.string().min(1, 'Industry is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Valid email is required').optional(),
  website: z.string().url('Valid website URL is required').optional(),
  description: z.string().optional(),
  settings: z.object({
    timezone: z.string().default('Asia/Kolkata'),
    currency: z.string().default('INR'),
    dateFormat: z.string().default('DD/MM/YYYY'),
    workingDays: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5, 6]),
    workingHours: z.object({
      start: z.string().default('09:00'),
      end: z.string().default('18:00')
    }).default({ start: '09:00', end: '18:00' })
  }).optional()
});

// GET /api/companies - Get companies list (Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    let whereClause: any = {};

    // Add filters
    if (query.search) {
      whereClause.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { industry: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } }
      ];
    }
    if (query.industry) {
      whereClause.industry = { contains: query.industry, mode: 'insensitive' };
    }
    if (query.active !== undefined) {
      whereClause.isActive = query.active;
    }

    const skip = (query.page - 1) * query.limit;

    const [companies, total] = await Promise.all([
      db.company.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              users: true,
              events: true
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
      db.company.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(total / query.limit);

    // Parse settings for each company
    const companiesWithParsedSettings = companies.map(company => {
      let parsedSettings = {};
      if (company.settings) {
        try {
          parsedSettings = JSON.parse(company.settings);
        } catch (error) {
          console.warn(`Failed to parse settings for company ${company.id}:`, error);
        }
      }
      
      return {
        ...company,
        settings: parsedSettings
      };
    });

    return NextResponse.json({
      companies: companiesWithParsedSettings,
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
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

// POST /api/companies - Create new company (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createCompanySchema.parse(body);

    // Check if company name already exists
    const existingCompany = await db.company.findFirst({
      where: {
        name: {
          equals: validatedData.name,
          mode: 'insensitive'
        }
      }
    });

    if (existingCompany) {
      return NextResponse.json(
        { error: 'Company with this name already exists' },
        { status: 400 }
      );
    }

    // Check if email already exists (if provided)
    if (validatedData.email) {
      const existingEmail = await db.company.findFirst({
        where: { email: validatedData.email }
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Company with this email already exists' },
          { status: 400 }
        );
      }
    }

    const newCompany = await db.company.create({
      data: {
        name: validatedData.name,
        industry: validatedData.industry,
        address: validatedData.address,
        phone: validatedData.phone,
        email: validatedData.email,
        website: validatedData.website,
        description: validatedData.description,
        settings: validatedData.settings ? JSON.stringify(validatedData.settings) : null
      },
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
    if (newCompany.settings) {
      try {
        parsedSettings = JSON.parse(newCompany.settings);
      } catch (error) {
        console.warn('Failed to parse settings for new company:', error);
      }
    }

    return NextResponse.json({
      message: 'Company created successfully',
      company: {
        ...newCompany,
        settings: parsedSettings
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}

// PUT /api/companies - Bulk update companies (Super Admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { companyIds, updates } = body;

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return NextResponse.json(
        { error: 'companyIds array is required' },
        { status: 400 }
      );
    }

    // Validate updates
    const allowedUpdates = ['isActive', 'industry', 'description'];
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

    const result = await db.company.updateMany({
      where: {
        id: { in: companyIds }
      },
      data: {
        ...validUpdates,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      message: `${result.count} companies updated successfully`,
      updatedCount: result.count
    });
  } catch (error) {
    console.error('Error bulk updating companies:', error);
    return NextResponse.json(
      { error: 'Failed to update companies' },
      { status: 500 }
    );
  }
}