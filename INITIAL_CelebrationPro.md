## FEATURE:

**CelebrationPro - Cloud-Based Event Management System for Indian Functions**

Build a comprehensive event management platform specifically tailored for Indian functions (marriages, birthdays, corporate events) in Andhra Pradesh/Hyderabad region. The system should provide:

### Core Functionality:
- **Multi-Role User Management**: Administrator, Manager, Vendor/Staff, Client Portal with role-based access
- **Template-Driven Event Creation**: Predefined templates (Marriage, Birthday, Corporate, Anniversary) with customizable module categories
- **Dynamic Module Management**: CRUD operations for event categories (Food, Decoration, Lighting, Venue, Gifts, Logistics, Printing, Photography, Security, Communications)
- **Task & Assignment Engine**: Granular task creation, vendor assignment, dependency management, due dates with automated reminders
- **Real-Time Progress Tracking**: Task status monitoring, progress percentages, visual timeline/Gantt charts
- **Inventory & Resource Management**: Menu/ingredients tracking, décor inventory, equipment booking with availability calendars
- **AI-Assisted Content Generation**: Chat-based JSON payload generation for tasks, menus, email templates
- **Communication Hub**: Email integration (SMTP/API), SMS alerts, in-app notifications, WhatsApp integration (future)
- **Client Portal**: Module approval workflow, status viewing, comment threads
- **Dashboard & Analytics**: Event summaries, task metrics, vendor performance tracking
- **Billing & Reporting**: Cost estimates, invoicing, payment tracking, custom report builder

### Technical Requirements:
- **Frontend**: Modern React/Next.js with responsive design for mobile/desktop
- **Backend**: Node.js/Python with RESTful APIs
- **Database**: PostgreSQL/MongoDB for complex relational data
- **Authentication**: JWT-based with role-based access control
- **Email Integration**: SendGrid/Mailgun API support
- **AI Integration**: OpenAI/Claude API for content generation
- **File Management**: Document templates, PDF generation, image uploads
- **Calendar Integration**: Drag-drop scheduling, resource allocation views

### Data Model Core Entities:
```
Event, Template, Module, Task, User (Vendor/Staff/Client), InventoryItem, 
Notification, EmailTemplate, AICommand, Invoice, Payment
```

### Success Criteria:
- [ ] Complete user authentication and role-based access control
- [ ] Template system with default modules loading correctly
- [ ] Task assignment and tracking with real-time status updates
- [ ] Email/SMS notification system functional
- [ ] AI content generation integrated and working
- [ ] Client portal with approval workflow
- [ ] Dashboard with analytics and reporting
- [ ] Inventory management with availability tracking
- [ ] Billing and payment tracking system
- [ ] Mobile-responsive design across all modules

## EXAMPLES:

Currently no specific examples in the `examples/` folder for this project type. Will need to create reference implementations for:

- **Event Management Patterns**: Task hierarchy, status tracking, assignment workflows
- **Template System**: Dynamic module loading, category management
- **Dashboard Components**: Analytics widgets, progress tracking, notification panels
- **AI Integration**: Prompt engineering for content generation, JSON schema validation
- **Communication Patterns**: Email template system, notification queuing
- **Client Portal**: Approval workflows, status viewing interfaces

Recommend creating example implementations for:
- `examples/event-management/` - Core event and task management patterns
- `examples/template-system/` - Dynamic template and module loading
- `examples/ai-integration/` - AI content generation patterns
- `examples/notification-system/` - Email/SMS integration patterns
- `examples/dashboard/` - Analytics and reporting components

## DOCUMENTATION:

### Essential Documentation to Reference:
- **Next.js Documentation**: https://nextjs.org/docs - For modern React framework patterns
- **Prisma Documentation**: https://www.prisma.io/docs - For database ORM and schema management
- **SendGrid API**: https://docs.sendgrid.com/api-reference - For email integration
- **OpenAI API**: https://platform.openai.com/docs/api-reference - For AI content generation
- **React Query/TanStack Query**: https://tanstack.com/query/latest - For server state management
- **Tailwind CSS**: https://tailwindcss.com/docs - For responsive UI design
- **Chart.js/Recharts**: For dashboard analytics visualization
- **React Hook Form**: https://react-hook-form.com/ - For form management
- **Zod**: https://zod.dev/ - For schema validation
- **JWT Authentication**: https://jwt.io/introduction - For secure authentication

### Indian Event Management Context:
- Research traditional Indian wedding/function workflows
- Understand vendor ecosystem in Andhra Pradesh/Hyderabad
- Local business practices for event planning
- Regional preferences for food, decoration, logistics

## OTHER CONSIDERATIONS:

### Critical Implementation Gotchas:
- **Complex Relational Data**: Event → Modules → Tasks → Assignments requires careful database design
- **Real-Time Updates**: WebSocket/Server-Sent Events for live status tracking across multiple users
- **File Upload Management**: Handle large image uploads for décor previews, document templates
- **Email Template Variables**: Dynamic variable substitution in email templates with JSON schema validation
- **Role-Based Permissions**: Granular access control - vendors only see assigned tasks, clients only see their events
- **Calendar Conflicts**: Resource booking system must prevent double-booking of equipment/staff
- **AI Prompt Engineering**: Structured prompts for generating consistent JSON payloads for different event types
- **Mobile Responsiveness**: Complex dashboard and task management interfaces must work on mobile devices
- **Data Export**: Large event reports with multiple formats (PDF, Excel, CSV) require efficient generation
- **Notification Queuing**: Prevent spam with intelligent batching of reminders and status updates

### Performance Considerations:
- **Database Indexing**: Optimize queries for event filtering, task searching, vendor performance analytics
- **Caching Strategy**: Redis for session management, frequently accessed templates, dashboard data
- **Image Optimization**: Compress and resize uploaded images for décor previews
- **Pagination**: Large event lists, task lists, vendor directories need efficient pagination

### Security Requirements:
- **Data Privacy**: Client event details must be secure and isolated
- **API Rate Limiting**: Prevent abuse of AI content generation endpoints
- **File Upload Security**: Validate and sanitize uploaded documents/images
- **Audit Logging**: Track all changes to events, tasks, assignments for accountability

### Scalability Planning:
- **Multi-Tenancy**: Design for multiple event management companies using the same platform
- **Regional Expansion**: Support for different languages (Telugu, Hindi, English)
- **Integration APIs**: Webhook support for third-party vendor systems
- **Mobile App Foundation**: API-first design to support future mobile applications

This is a complex, enterprise-level application that requires careful architecture planning, robust testing, and phased implementation approach.