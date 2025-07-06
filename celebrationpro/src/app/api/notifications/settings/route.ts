import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { NotificationType } from '@prisma/client';

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  notificationTypes: z.object({
    TASK_ASSIGNED: z.boolean().default(true),
    TASK_DUE: z.boolean().default(true),
    TASK_OVERDUE: z.boolean().default(true),
    TASK_COMPLETED: z.boolean().default(true),
    EVENT_CREATED: z.boolean().default(true),
    EVENT_UPDATED: z.boolean().default(true),
    EVENT_CANCELLED: z.boolean().default(true),
    EVENT_REMINDER: z.boolean().default(true),
    DEADLINE_APPROACHING: z.boolean().default(true),
    SYSTEM_ALERT: z.boolean().default(true),
    PAYMENT_DUE: z.boolean().default(true),
    PAYMENT_RECEIVED: z.boolean().default(true),
    CLIENT_MESSAGE: z.boolean().default(true),
    VENDOR_UPDATE: z.boolean().default(true),
    AI_SUGGESTION: z.boolean().default(false)
  }),
  quietHours: z.object({
    enabled: z.boolean().default(false),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('22:00'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('08:00')
  }),
  digestSettings: z.object({
    enabled: z.boolean().default(true),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY'),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('09:00')
  })
});

// GET /api/notifications/settings - Get user notification settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await db.notificationSettings.findUnique({
      where: {
        userId: session.user.id
      }
    });

    // If no settings exist, create default settings
    if (!settings) {
      const defaultSettings = notificationSettingsSchema.parse({});
      
      settings = await db.notificationSettings.create({
        data: {
          userId: session.user.id,
          emailNotifications: defaultSettings.emailNotifications,
          pushNotifications: defaultSettings.pushNotifications,
          smsNotifications: defaultSettings.smsNotifications,
          notificationTypes: JSON.stringify(defaultSettings.notificationTypes),
          quietHours: JSON.stringify(defaultSettings.quietHours),
          digestSettings: JSON.stringify(defaultSettings.digestSettings)
        }
      });
    }

    // Parse JSON fields
    let parsedNotificationTypes = {};
    let parsedQuietHours = {};
    let parsedDigestSettings = {};

    try {
      parsedNotificationTypes = settings.notificationTypes ? JSON.parse(settings.notificationTypes) : {};
    } catch (error) {
      console.warn('Failed to parse notification types:', error);
    }

    try {
      parsedQuietHours = settings.quietHours ? JSON.parse(settings.quietHours) : {};
    } catch (error) {
      console.warn('Failed to parse quiet hours:', error);
    }

    try {
      parsedDigestSettings = settings.digestSettings ? JSON.parse(settings.digestSettings) : {};
    } catch (error) {
      console.warn('Failed to parse digest settings:', error);
    }

    return NextResponse.json({
      id: settings.id,
      emailNotifications: settings.emailNotifications,
      pushNotifications: settings.pushNotifications,
      smsNotifications: settings.smsNotifications,
      notificationTypes: parsedNotificationTypes,
      quietHours: parsedQuietHours,
      digestSettings: parsedDigestSettings,
      updatedAt: settings.updatedAt
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/settings - Update user notification settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = notificationSettingsSchema.parse(body);

    const settings = await db.notificationSettings.upsert({
      where: {
        userId: session.user.id
      },
      update: {
        emailNotifications: validatedData.emailNotifications,
        pushNotifications: validatedData.pushNotifications,
        smsNotifications: validatedData.smsNotifications,
        notificationTypes: JSON.stringify(validatedData.notificationTypes),
        quietHours: JSON.stringify(validatedData.quietHours),
        digestSettings: JSON.stringify(validatedData.digestSettings),
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        emailNotifications: validatedData.emailNotifications,
        pushNotifications: validatedData.pushNotifications,
        smsNotifications: validatedData.smsNotifications,
        notificationTypes: JSON.stringify(validatedData.notificationTypes),
        quietHours: JSON.stringify(validatedData.quietHours),
        digestSettings: JSON.stringify(validatedData.digestSettings)
      }
    });

    return NextResponse.json({
      message: 'Notification settings updated successfully',
      settings: {
        id: settings.id,
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        smsNotifications: settings.smsNotifications,
        notificationTypes: validatedData.notificationTypes,
        quietHours: validatedData.quietHours,
        digestSettings: validatedData.digestSettings,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/settings - Reset notification settings to default
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const defaultSettings = notificationSettingsSchema.parse({});

    const settings = await db.notificationSettings.upsert({
      where: {
        userId: session.user.id
      },
      update: {
        emailNotifications: defaultSettings.emailNotifications,
        pushNotifications: defaultSettings.pushNotifications,
        smsNotifications: defaultSettings.smsNotifications,
        notificationTypes: JSON.stringify(defaultSettings.notificationTypes),
        quietHours: JSON.stringify(defaultSettings.quietHours),
        digestSettings: JSON.stringify(defaultSettings.digestSettings),
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        emailNotifications: defaultSettings.emailNotifications,
        pushNotifications: defaultSettings.pushNotifications,
        smsNotifications: defaultSettings.smsNotifications,
        notificationTypes: JSON.stringify(defaultSettings.notificationTypes),
        quietHours: JSON.stringify(defaultSettings.quietHours),
        digestSettings: JSON.stringify(defaultSettings.digestSettings)
      }
    });

    return NextResponse.json({
      message: 'Notification settings reset to default',
      settings: {
        id: settings.id,
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        smsNotifications: settings.smsNotifications,
        notificationTypes: defaultSettings.notificationTypes,
        quietHours: defaultSettings.quietHours,
        digestSettings: defaultSettings.digestSettings,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('Error resetting notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to reset notification settings' },
      { status: 500 }
    );
  }
}