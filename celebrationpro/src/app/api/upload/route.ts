import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const uploadSchema = z.object({
  type: z.enum(['message', 'event', 'profile', 'template', 'general']).default('general'),
  entityId: z.string().optional(),
  maxSize: z.number().default(10 * 1024 * 1024), // 10MB default
  allowedTypes: z.array(z.string()).default([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ])
});

// POST /api/upload - Upload files
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const type = formData.get('type') as string || 'general';
    const entityId = formData.get('entityId') as string;
    const maxSizeStr = formData.get('maxSize') as string;
    const allowedTypesStr = formData.get('allowedTypes') as string;

    // Parse and validate options
    const options = uploadSchema.parse({
      type,
      entityId,
      maxSize: maxSizeStr ? parseInt(maxSizeStr) : undefined,
      allowedTypes: allowedTypesStr ? JSON.parse(allowedTypesStr) : undefined
    });

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate file count (max 10 files per upload)
    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 files allowed per upload' },
        { status: 400 }
      );
    }

    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
      try {
        // Validate file size
        if (file.size > options.maxSize) {
          errors.push({
            filename: file.name,
            error: `File size exceeds limit of ${options.maxSize / (1024 * 1024)}MB`
          });
          continue;
        }

        // Validate file type
        if (!options.allowedTypes.includes(file.type)) {
          errors.push({
            filename: file.name,
            error: `File type ${file.type} not allowed`
          });
          continue;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split('.').pop();
        const uniqueFilename = `${timestamp}_${randomString}.${fileExtension}`;

        // Determine upload directory based on type
        const baseUploadDir = join(process.cwd(), 'public', 'uploads');
        let uploadDir = baseUploadDir;
        
        switch (options.type) {
          case 'message':
            uploadDir = join(baseUploadDir, 'messages');
            break;
          case 'event':
            uploadDir = join(baseUploadDir, 'events');
            break;
          case 'profile':
            uploadDir = join(baseUploadDir, 'profiles');
            break;
          case 'template':
            uploadDir = join(baseUploadDir, 'templates');
            break;
          default:
            uploadDir = join(baseUploadDir, 'general');
        }

        // Create directory if it doesn't exist
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }

        // Convert file to buffer and save
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = join(uploadDir, uniqueFilename);
        
        await writeFile(filePath, buffer);

        // Generate public URL
        const publicUrl = `/uploads/${options.type}/${uniqueFilename}`;

        uploadedFiles.push({
          originalName: file.name,
          filename: uniqueFilename,
          url: publicUrl,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        errors.push({
          filename: file.name,
          error: 'Failed to upload file'
        });
      }
    }

    // Log upload activity
    console.log(`User ${session.user.id} uploaded ${uploadedFiles.length} files of type ${options.type}`);

    return NextResponse.json({
      success: true,
      uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: files.length,
        successful: uploadedFiles.length,
        failed: errors.length
      }
    });
  } catch (error) {
    console.error('Error in file upload:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid upload parameters', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}

// GET /api/upload - Get upload configuration and limits
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'general';

    // Define upload limits based on user role and file type
    const baseLimits = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ]
    };

    // Adjust limits based on user role
    if (session.user.role === UserRole.ADMIN) {
      baseLimits.maxFileSize = 50 * 1024 * 1024; // 50MB for admins
      baseLimits.maxFiles = 20;
    } else if (session.user.role === UserRole.MANAGER) {
      baseLimits.maxFileSize = 25 * 1024 * 1024; // 25MB for managers
      baseLimits.maxFiles = 15;
    }

    // Adjust limits based on file type
    const typeLimits = { ...baseLimits };
    
    switch (type) {
      case 'profile':
        typeLimits.maxFileSize = 5 * 1024 * 1024; // 5MB for profile images
        typeLimits.maxFiles = 1;
        typeLimits.allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp'
        ];
        break;
      case 'message':
        typeLimits.maxFiles = 5;
        break;
      case 'template':
        if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
          return NextResponse.json(
            { error: 'Insufficient permissions for template uploads' },
            { status: 403 }
          );
        }
        break;
    }

    return NextResponse.json({
      type,
      limits: typeLimits,
      userRole: session.user.role,
      supportedFormats: {
        images: ['JPEG', 'PNG', 'GIF', 'WebP'],
        documents: ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'TXT', 'CSV']
      }
    });
  } catch (error) {
    console.error('Error getting upload configuration:', error);
    return NextResponse.json(
      { error: 'Failed to get upload configuration' },
      { status: 500 }
    );
  }
}