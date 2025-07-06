# PRP: CelebrationPro - Cloud-Based Event Management System

## Goal
Build a comprehensive, production-ready Event Management System specifically tailored for Indian functions (marriages, birthdays, corporate events) in Andhra Pradesh/Hyderabad region. The system should provide end-to-end event planning, task management, vendor coordination, client communication, and real-time progress tracking with AI-assisted content generation.

## Business Value
- **Market Opportunity**: Address the $2B+ Indian event management market with region-specific solutions
- **Operational Efficiency**: Reduce event planning time by 60% through template-driven workflows
- **Revenue Growth**: Enable event managers to handle 3x more events simultaneously
- **Client Satisfaction**: Provide transparent progress tracking and seamless approval workflows
- **Vendor Ecosystem**: Create a unified platform for vendor coordination and performance tracking
- **Scalability**: Foundation for expansion across other Indian regions and event types

## Success Criteria
- [ ] Complete user authentication with role-based access (Admin, Manager, Vendor, Client)
- [ ] Template system with 4+ predefined event types and custom template creation
- [ ] Dynamic module management with CRUD operations for 10+ categories
- [ ] Task assignment engine with dependency management and real-time tracking
- [ ] Email/SMS notification system with template processing
- [ ] AI content generation for tasks, menus, and email templates
- [ ] Client portal with approval workflow and status viewing
- [ ] Dashboard with analytics, KPIs, and progress visualization
- [ ] Inventory management with availability tracking
- [ ] Billing system with invoice generation and payment tracking
- [ ] Mobile-responsive design across all modules
- [ ] Performance: Page load times < 2s, API response times < 500ms
- [ ] Security: JWT authentication, role-based permissions, data encryption

## All Needed Context

### Documentation
- **Next.js 14 Documentation**: https://nextjs.org/docs - App Router, Server Components, API Routes
- **Prisma Documentation**: https://www.prisma.io/docs - Database ORM, schema management, migrations
- **Tailwind CSS**: https://tailwindcss.com/docs - Utility-first CSS framework
- **React Hook Form**: https://react-hook-form.com/ - Form validation and management
- **Zod**: https://zod.dev/ - TypeScript-first schema validation
- **NextAuth.js**: https://next-auth.js.org/ - Authentication for Next.js
- **Recharts**: https://recharts.org/ - React charting library for dashboard
- **React Query/TanStack Query**: https://tanstack.com/query/latest - Server state management
- **SendGrid API**: https://docs.sendgrid.com/api-reference - Email delivery service
- **Twilio API**: https://www.twilio.com/docs - SMS and WhatsApp messaging
- **OpenAI API**: https://platform.openai.com/docs/api-reference - AI content generation
- **Supabase**: https://supabase.com/docs - PostgreSQL database and real-time subscriptions

### References
- **File**: `examples/event-management/task-hierarchy.js` - Task management patterns
- **File**: `examples/template-system/event-templates.js` - Template system implementation
- **File**: `examples/ai-integration/content-generator.js` - AI content generation patterns
- **File**: `examples/notification-system/notification-manager.js` - Email/SMS integration
- **File**: `examples/dashboard/analytics-widgets.jsx` - Dashboard components
- **Context Engineering Template**: `INITIAL_CelebrationPro.md` - Project requirements

### Current Codebase Tree
```
context-engineering-intro/
├── .claude/
│   ├── commands/
│   │   ├── generate-prp.md
│   │   └── execute-prp.md
│   └── settings.local.json
├── examples/
│   ├── event-management/
│   │   └── task-hierarchy.js
│   ├── template-system/
│   │   └── event-templates.js
│   ├── ai-integration/
│   │   └── content-generator.js
│   ├── notification-system/
│   │   └── notification-manager.js
│   └── dashboard/
│       └── analytics-widgets.jsx
├── PRPs/
│   ├── templates/
│   │   └── prp_base.md
│   ├── EXAMPLE_multi_agent_prp.md
│   └── CelebrationPro_PRP.md
├── CLAUDE.md
├── INITIAL.md
├── INITIAL_CelebrationPro.md
└── README.md
```

### Desired Codebase Tree
```
celebrationpro/
├── .env.local
├── .env.example
├── .gitignore
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── events/
│   │   │   ├── tasks/
│   │   │   ├── templates/
│   │   │   ├── notifications/
│   │   │   ├── ai/
│   │   │   └── analytics/
│   │   ├── dashboard/
│   │   ├── events/
│   │   ├── templates/
│   │   ├── vendors/
│   │   ├── clients/
│   │   └── auth/
│   ├── components/
│   │   ├── ui/
│   │   ├── dashboard/
│   │   ├── events/
│   │   ├── tasks/
│   │   ├── templates/
│   │   ├── notifications/
│   │   └── forms/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── validations.ts
│   │   ├── utils.ts
│   │   ├── ai.ts
│   │   └── notifications.ts
│   ├── hooks/
│   ├── types/
│   └── constants/
├── public/
├── docs/
└── tests/
```

### Known Codebase/Library Gotchas
- **Next.js App Router**: Server Components vs Client Components - use 'use client' directive carefully
- **Prisma Relations**: Complex many-to-many relationships require explicit join tables
- **NextAuth.js**: Session management with JWT requires proper token refresh handling
- **Real-time Updates**: Supabase real-time subscriptions need proper cleanup to prevent memory leaks
- **File Uploads**: Next.js API routes have 1MB limit by default, need custom config for larger files
- **AI API Rate Limits**: OpenAI has strict rate limits, implement proper queuing and retry logic
- **Email Templates**: Variable substitution must be XSS-safe, use proper escaping
- **Mobile Responsiveness**: Complex dashboard layouts need careful breakpoint management
- **Database Indexing**: Event and task queries need proper indexing for performance
- **TypeScript**: Strict mode requires proper type definitions for all API responses

## Implementation Blueprint

### Data Models

```typescript
// prisma/schema.prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String
  phone       String?
  role        UserRole
  companyId   String?
  company     Company? @relation(fields: [companyId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  managedEvents     Event[]     @relation("EventManager")
  assignedTasks     Task[]      @relation("TaskAssignee")
  clientEvents      Event[]     @relation("EventClient")
  notifications     Notification[]
  aiCommands        AICommand[]
}

model Event {
  id              String      @id @default(cuid())
  name            String
  type            EventType
  date            DateTime
  venue           String
  guestCount      Int
  budget          Float?
  status          EventStatus
  templateId      String?
  template        Template?   @relation(fields: [templateId], references: [id])
  managerId       String
  manager         User        @relation("EventManager", fields: [managerId], references: [id])
  clientId        String
  client          User        @relation("EventClient", fields: [clientId], references: [id])
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  // Relations
  modules         Module[]
  notifications   Notification[]
  invoices        Invoice[]
}

model Template {
  id              String   @id @default(cuid())
  name            String
  description     String?
  eventType       EventType
  region          String?
  isCustom        Boolean  @default(false)
  parentTemplateId String?
  parentTemplate  Template? @relation("TemplateClone", fields: [parentTemplateId], references: [id])
  clonedTemplates Template[] @relation("TemplateClone")
  createdAt       DateTime @default(now())
  
  // Relations
  defaultModules  ModuleTemplate[]
  events          Event[]
}

model Module {
  id          String       @id @default(cuid())
  name        String
  category    ModuleCategory
  priority    Int
  required    Boolean      @default(false)
  status      ModuleStatus
  eventId     String
  event       Event        @relation(fields: [eventId], references: [id])
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  // Relations
  tasks       Task[]
}

model Task {
  id              String     @id @default(cuid())
  name            String
  description     String?
  status          TaskStatus
  priority        TaskPriority
  estimatedHours  Float
  actualHours     Float      @default(0)
  dueDate         DateTime?
  moduleId        String
  module          Module     @relation(fields: [moduleId], references: [id])
  assignedToId    String?
  assignedTo      User?      @relation("TaskAssignee", fields: [assignedToId], references: [id])
  parentTaskId    String?
  parentTask      Task?      @relation("TaskHierarchy", fields: [parentTaskId], references: [id])
  subtasks        Task[]     @relation("TaskHierarchy")
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  
  // Relations
  dependencies    TaskDependency[] @relation("DependentTask")
  dependents      TaskDependency[] @relation("DependsOnTask")
  materials       TaskMaterial[]
  notifications   Notification[]
}

enum UserRole {
  ADMIN
  MANAGER
  VENDOR
  CLIENT
}

enum EventType {
  WEDDING
  BIRTHDAY
  CORPORATE
  ANNIVERSARY
  CUSTOM
}

enum EventStatus {
  PLANNING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum ModuleCategory {
  VENUE
  FOOD
  DECORATION
  LIGHTING
  PHOTOGRAPHY
  TRANSPORTATION
  COMMUNICATIONS
  GIFTS
  SECURITY
  ENTERTAINMENT
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  BLOCKED
  CANCELLED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

### Task List

#### Task 1: Project Setup & Configuration
**MODIFY**: Create new Next.js project with TypeScript and essential dependencies

**Patterns to follow**:
- Use Next.js 14 with App Router
- Configure TypeScript with strict mode
- Setup Tailwind CSS with custom design system
- Configure ESLint and Prettier

**Critical details**:
- Install dependencies: `next`, `react`, `typescript`, `tailwindcss`, `prisma`, `@prisma/client`, `next-auth`, `zod`, `react-hook-form`, `@hookform/resolvers`, `recharts`, `@tanstack/react-query`
- Setup environment variables for database, auth, and API keys
- Configure Prisma with PostgreSQL

#### Task 2: Database Schema & Setup
**CREATE**: `prisma/schema.prisma` with complete data model
**CREATE**: `prisma/seed.ts` with sample data

**Patterns to follow**:
- Use Prisma best practices for relations
- Implement proper indexing for performance
- Include audit fields (createdAt, updatedAt)

**Critical details**:
- Define all enums and models as specified above
- Create proper foreign key relationships
- Add unique constraints where needed
- Include sample Indian event data in seed

#### Task 3: Authentication System
**CREATE**: `src/lib/auth.ts` - NextAuth.js configuration
**CREATE**: `src/app/api/auth/[...nextauth]/route.ts` - Auth API routes
**CREATE**: `src/app/auth/` - Login/register pages

**Patterns to follow**:
- JWT-based authentication with role-based access
- Secure session management
- Password hashing with bcrypt

**Critical details**:
- Configure providers (credentials, Google OAuth)
- Implement role-based middleware
- Create protected route wrapper
- Handle session refresh and logout

#### Task 4: Core API Routes
**CREATE**: `src/app/api/events/` - Event CRUD operations
**CREATE**: `src/app/api/tasks/` - Task management APIs
**CREATE**: `src/app/api/templates/` - Template system APIs
**CREATE**: `src/app/api/notifications/` - Notification APIs

**Patterns to follow**:
- RESTful API design with proper HTTP methods
- Input validation with Zod schemas
- Error handling with consistent response format
- Pagination for list endpoints

**Critical details**:
- Implement proper authorization checks
- Use Prisma for database operations
- Include filtering and sorting capabilities
- Handle file uploads for documents/images

#### Task 5: Template System Implementation
**CREATE**: `src/components/templates/` - Template management components
**CREATE**: `src/lib/templates.ts` - Template processing logic

**Patterns to follow**:
- Dynamic module loading from templates
- Template cloning and customization
- Default task generation

**Critical details**:
- Implement template inheritance
- Support for regional customizations
- Validation of template structure
- Preview functionality before applying

#### Task 6: Task Management System
**CREATE**: `src/components/tasks/` - Task components (list, form, kanban)
**CREATE**: `src/lib/task-hierarchy.ts` - Task dependency logic

**Patterns to follow**:
- Hierarchical task structure
- Dependency management
- Real-time status updates
- Drag-and-drop task organization

**Critical details**:
- Implement critical path calculation
- Progress percentage calculation
- Task assignment workflow
- Due date and reminder system

#### Task 7: AI Content Generation
**CREATE**: `src/app/api/ai/` - AI generation endpoints
**CREATE**: `src/lib/ai.ts` - OpenAI integration
**CREATE**: `src/components/ai/` - AI chat interface

**Patterns to follow**:
- Structured prompt engineering
- JSON schema validation
- Rate limiting and error handling

**Critical details**:
- Implement content generation for tasks, menus, emails
- Validate AI responses against schemas
- Handle API rate limits gracefully
- Provide fallback content for failures

#### Task 8: Notification System
**CREATE**: `src/lib/notifications.ts` - Email/SMS service integration
**CREATE**: `src/components/notifications/` - Notification UI components

**Patterns to follow**:
- Template-based notifications
- Queue-based sending
- Delivery status tracking

**Critical details**:
- Integrate SendGrid for emails
- Integrate Twilio for SMS
- Implement notification preferences
- Handle delivery failures and retries

#### Task 9: Dashboard & Analytics
**CREATE**: `src/app/dashboard/` - Dashboard pages
**CREATE**: `src/components/dashboard/` - Analytics widgets

**Patterns to follow**:
- Real-time data updates
- Interactive charts and graphs
- Responsive design for mobile

**Critical details**:
- Implement KPI calculations
- Create progress tracking visualizations
- Add export functionality
- Optimize for performance with large datasets

#### Task 10: Client Portal
**CREATE**: `src/app/clients/` - Client-facing pages
**CREATE**: `src/components/clients/` - Approval workflow components

**Patterns to follow**:
- Simplified interface for non-technical users
- Approval workflow with comments
- Status tracking and updates

**Critical details**:
- Implement module approval system
- Create comment threads
- Send automated confirmations
- Mobile-optimized interface

#### Task 11: Testing & Quality Assurance
**CREATE**: `tests/` - Comprehensive test suite
**CREATE**: `.github/workflows/` - CI/CD pipeline

**Patterns to follow**:
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows

**Critical details**:
- Test authentication and authorization
- Test data integrity and relationships
- Performance testing for large datasets
- Security testing for vulnerabilities

#### Task 12: Documentation & Deployment
**CREATE**: `docs/` - API documentation and user guides
**CREATE**: `README.md` - Setup and deployment instructions

**Patterns to follow**:
- Comprehensive API documentation
- User guides with screenshots
- Deployment guides for different environments

**Critical details**:
- Document all API endpoints
- Create user onboarding guides
- Setup monitoring and logging
- Configure production environment

### Integration Points

#### Database Migrations
```bash
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
```

#### Environment Configuration
```env
# .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/celebrationpro"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="your-openai-key"
SENDGRID_API_KEY="your-sendgrid-key"
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
```

#### API Routes Structure
- `GET /api/events` - List events with filtering
- `POST /api/events` - Create new event
- `GET /api/events/[id]` - Get event details
- `PUT /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event
- `POST /api/events/[id]/modules` - Add module to event
- `GET /api/tasks` - List tasks with filtering
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/[id]` - Update task status
- `POST /api/ai/generate` - AI content generation
- `POST /api/notifications/send` - Send notifications

## Validation Loop

### Level 1: Syntax & Style
```bash
npm run lint
npm run type-check
npx prettier --check .
```

### Level 2: Unit Tests
```bash
npm run test
npm run test:coverage
```

Example test structure:
```typescript
// tests/api/events.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/events/route';

describe('/api/events', () => {
  it('should create event with valid data', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        name: 'Test Wedding',
        type: 'WEDDING',
        date: '2024-06-15',
        venue: 'Test Venue',
        guestCount: 100
      }
    });
    
    await handler(req, res);
    expect(res._getStatusCode()).toBe(201);
  });
  
  it('should validate required fields', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {}
    });
    
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });
});
```

### Level 3: Integration Test
```bash
npm run dev
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Event","type":"WEDDING","date":"2024-06-15","venue":"Test Venue","guestCount":100}'
```

## Final Validation Checklist
- [ ] All tests pass (unit, integration, e2e)
- [ ] No linting or type errors
- [ ] Manual testing of critical user flows
- [ ] Performance benchmarks met (< 2s page loads)
- [ ] Security audit completed
- [ ] Mobile responsiveness verified
- [ ] Error handling tested
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] AI integration functional
- [ ] Notification system working
- [ ] Authentication and authorization working
- [ ] Real-time updates functional

## Anti-Patterns to Avoid
- Creating overly complex component hierarchies
- Skipping input validation on API endpoints
- Ignoring mobile responsiveness
- Hardcoding configuration values
- Not implementing proper error boundaries
- Skipping database indexing for performance
- Not handling AI API failures gracefully
- Creating security vulnerabilities with improper auth
- Not implementing proper loading states
- Ignoring accessibility requirements
- Not optimizing for SEO where applicable
- Creating memory leaks with real-time subscriptions

## Confidence Score: 9/10

**Reasoning**: 
- Clear, well-documented requirements with specific Indian event management context
- Comprehensive examples provided in the context engineering framework
- Established patterns for similar systems (task management, notifications, AI integration)
- Detailed data model with proper relationships
- Specific technology stack with proven libraries
- Comprehensive validation gates and testing strategy
- Clear success criteria and performance benchmarks

**Risk factors**: 
- Complex real-time updates across multiple user roles
- AI integration reliability and rate limiting
- Performance optimization for large datasets
- Mobile responsiveness for complex dashboard interfaces

The high confidence score reflects the comprehensive planning, established patterns, and clear technical requirements. The context engineering framework provides excellent foundation for implementation.