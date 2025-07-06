import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const generateRequestSchema = z.object({
  type: z.enum(['tasks', 'menu', 'email_template', 'event_description', 'module_tasks']),
  context: z.object({
    eventType: z.string().optional(),
    eventName: z.string().optional(),
    guestCount: z.number().optional(),
    budget: z.number().optional(),
    venue: z.string().optional(),
    moduleCategory: z.string().optional(),
    moduleName: z.string().optional(),
    customRequirements: z.string().optional(),
    templateType: z.string().optional()
  }),
  prompt: z.string().min(1, 'Prompt is required'),
  options: z.object({
    count: z.number().min(1).max(20).default(5),
    includeEstimates: z.boolean().default(true),
    includePriorities: z.boolean().default(true),
    includeDescriptions: z.boolean().default(true)
  }).optional()
});

// POST /api/ai/generate - Generate AI content
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = generateRequestSchema.parse(body);

    // Check if user has AI generation permissions
    if (![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'AI generation is only available for administrators and managers' }, { status: 403 });
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI service is not configured' }, { status: 503 });
    }

    // Rate limiting check (simple implementation)
    const recentCommands = await db.aICommand.count({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      }
    });

    if (recentCommands >= 20) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    // Build system prompt based on generation type
    const systemPrompt = buildSystemPrompt(validatedData.type, validatedData.context);
    
    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: validatedData.prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const generatedContent = openaiData.choices[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content generated from AI');
    }

    // Parse and validate the generated content
    let parsedContent;
    try {
      parsedContent = JSON.parse(generatedContent);
    } catch (error) {
      // If JSON parsing fails, return as plain text
      parsedContent = { content: generatedContent, type: 'text' };
    }

    // Validate the structure based on generation type
    const validatedContent = validateGeneratedContent(validatedData.type, parsedContent);

    // Save the AI command for tracking
    await db.aICommand.create({
      data: {
        type: validatedData.type,
        prompt: validatedData.prompt,
        response: JSON.stringify(validatedContent),
        context: JSON.stringify(validatedData.context),
        userId: session.user.id,
        companyId: session.user.companyId!,
        status: 'COMPLETED'
      }
    });

    return NextResponse.json({
      content: validatedContent,
      type: validatedData.type,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating AI content:', error);
    
    // Save failed command for tracking
    try {
      const body = await request.json();
      await db.aICommand.create({
        data: {
          type: body.type || 'unknown',
          prompt: body.prompt || '',
          response: '',
          context: JSON.stringify(body.context || {}),
          userId: session?.user?.id || '',
          companyId: session?.user?.companyId || '',
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    } catch (saveError) {
      console.error('Error saving failed AI command:', saveError);
    }

    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(type: string, context: any): string {
  const basePrompt = `You are an expert event management assistant specializing in Indian functions and celebrations. Generate professional, culturally appropriate content in JSON format.`;
  
  switch (type) {
    case 'tasks':
      return `${basePrompt}

Generate a list of tasks for event planning. Return JSON with this structure:
{
  "tasks": [
    {
      "name": "Task name",
      "description": "Detailed description",
      "priority": "HIGH|MEDIUM|LOW",
      "estimatedHours": number,
      "category": "Planning|Execution|Coordination|Logistics"
    }
  ]
}

Context: Event type: ${context.eventType}, Guest count: ${context.guestCount}, Budget: ${context.budget}`;
    
    case 'menu':
      return `${basePrompt}

Generate a menu for Indian events. Return JSON with this structure:
{
  "menu": {
    "categories": [
      {
        "name": "Category name (e.g., Appetizers, Main Course)",
        "items": [
          {
            "name": "Dish name",
            "description": "Brief description",
            "type": "VEG|NON_VEG|VEGAN",
            "estimatedCostPerPerson": number,
            "servingSize": "portion description"
          }
        ]
      }
    ],
    "totalEstimatedCost": number
  }
}

Context: Event type: ${context.eventType}, Guest count: ${context.guestCount}, Budget: ${context.budget}`;
    
    case 'email_template':
      return `${basePrompt}

Generate an email template for event communication. Return JSON with this structure:
{
  "template": {
    "subject": "Email subject",
    "body": "Email body with placeholders like {{clientName}}, {{eventName}}, {{eventDate}}",
    "type": "INVITATION|REMINDER|UPDATE|CONFIRMATION",
    "variables": ["list of placeholder variables"]
  }
}

Context: Event type: ${context.eventType}, Template type: ${context.templateType}`;
    
    case 'event_description':
      return `${basePrompt}

Generate a detailed event description. Return JSON with this structure:
{
  "description": {
    "overview": "Brief overview",
    "details": "Detailed description",
    "highlights": ["list of key highlights"],
    "requirements": ["list of special requirements"],
    "timeline": "Suggested timeline"
  }
}

Context: Event type: ${context.eventType}, Venue: ${context.venue}, Guest count: ${context.guestCount}`;
    
    case 'module_tasks':
      return `${basePrompt}

Generate tasks for a specific event module. Return JSON with this structure:
{
  "tasks": [
    {
      "name": "Task name",
      "description": "Detailed description",
      "priority": "HIGH|MEDIUM|LOW",
      "estimatedHours": number,
      "order": number,
      "dependencies": ["list of task names this depends on"]
    }
  ]
}

Context: Module: ${context.moduleName}, Category: ${context.moduleCategory}, Event type: ${context.eventType}`;
    
    default:
      return `${basePrompt}\n\nGenerate appropriate content based on the user's request.`;
  }
}

function validateGeneratedContent(type: string, content: any): any {
  // Basic validation - in production, you'd want more robust validation
  if (!content || typeof content !== 'object') {
    throw new Error('Invalid generated content format');
  }
  
  switch (type) {
    case 'tasks':
    case 'module_tasks':
      if (!content.tasks || !Array.isArray(content.tasks)) {
        throw new Error('Generated content must contain a tasks array');
      }
      break;
    case 'menu':
      if (!content.menu || !content.menu.categories) {
        throw new Error('Generated content must contain menu with categories');
      }
      break;
    case 'email_template':
      if (!content.template || !content.template.subject || !content.template.body) {
        throw new Error('Generated content must contain template with subject and body');
      }
      break;
    case 'event_description':
      if (!content.description) {
        throw new Error('Generated content must contain description');
      }
      break;
  }
  
  return content;
}