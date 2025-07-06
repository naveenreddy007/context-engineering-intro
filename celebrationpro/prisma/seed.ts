import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create companies
  const company1 = await prisma.company.create({
    data: {
      name: 'Hyderabad Events Co.',
      address: 'Banjara Hills, Hyderabad, Telangana',
      phone: '+91-9876543210',
      email: 'info@hyderabadevents.com'
    }
  })

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@celebrationpro.com',
      name: 'Admin User',
      phone: '+91-9876543210',
      role: 'ADMIN',
      password: hashedPassword,
      companyId: company1.id
    }
  })

  const manager = await prisma.user.create({
    data: {
      email: 'manager@celebrationpro.com',
      name: 'Rajesh Kumar',
      phone: '+91-9876543211',
      role: 'MANAGER',
      password: hashedPassword,
      companyId: company1.id
    }
  })

  const vendor1 = await prisma.user.create({
    data: {
      email: 'chef@celebrationpro.com',
      name: 'Suresh Reddy',
      phone: '+91-9876543212',
      role: 'VENDOR',
      password: hashedPassword
    }
  })

  const vendor2 = await prisma.user.create({
    data: {
      email: 'decorator@celebrationpro.com',
      name: 'Priya Sharma',
      phone: '+91-9876543213',
      role: 'VENDOR',
      password: hashedPassword
    }
  })

  const client = await prisma.user.create({
    data: {
      email: 'client@celebrationpro.com',
      name: 'Anitha Patel',
      phone: '+91-9876543214',
      role: 'CLIENT',
      password: hashedPassword
    }
  })

  // Create templates
  const weddingTemplate = await prisma.template.create({
    data: {
      name: 'Traditional Telugu Wedding',
      description: 'Complete template for traditional Telugu wedding ceremonies',
      eventType: 'WEDDING',
      region: 'Andhra Pradesh',
      isCustom: false
    }
  })

  const birthdayTemplate = await prisma.template.create({
    data: {
      name: 'Birthday Celebration',
      description: 'Standard birthday party template',
      eventType: 'BIRTHDAY',
      region: 'Hyderabad',
      isCustom: false
    }
  })

  // Create module templates for wedding
  const weddingModules = [
    { name: 'Venue Booking', category: 'VENUE', priority: 1, required: true },
    { name: 'Traditional Catering', category: 'FOOD', priority: 2, required: true },
    { name: 'Mandap Decoration', category: 'DECORATION', priority: 3, required: true },
    { name: 'Wedding Photography', category: 'PHOTOGRAPHY', priority: 4, required: true },
    { name: 'Sound & Lighting', category: 'LIGHTING', priority: 5, required: false },
    { name: 'Guest Transportation', category: 'TRANSPORTATION', priority: 6, required: false },
    { name: 'Wedding Invitations', category: 'COMMUNICATIONS', priority: 7, required: true },
    { name: 'Return Gifts', category: 'GIFTS', priority: 8, required: false },
    { name: 'Security Services', category: 'SECURITY', priority: 9, required: false },
    { name: 'Live Music & Dance', category: 'ENTERTAINMENT', priority: 10, required: false }
  ]

  for (const module of weddingModules) {
    await prisma.moduleTemplate.create({
      data: {
        ...module,
        templateId: weddingTemplate.id
      }
    })
  }

  // Create module templates for birthday
  const birthdayModules = [
    { name: 'Party Venue', category: 'VENUE', priority: 1, required: true },
    { name: 'Birthday Catering', category: 'FOOD', priority: 2, required: true },
    { name: 'Theme Decoration', category: 'DECORATION', priority: 3, required: true },
    { name: 'Event Photography', category: 'PHOTOGRAPHY', priority: 4, required: false },
    { name: 'Party Lighting', category: 'LIGHTING', priority: 5, required: false },
    { name: 'Party Invitations', category: 'COMMUNICATIONS', priority: 6, required: true },
    { name: 'Birthday Gifts', category: 'GIFTS', priority: 7, required: false },
    { name: 'Entertainment', category: 'ENTERTAINMENT', priority: 8, required: false }
  ]

  for (const module of birthdayModules) {
    await prisma.moduleTemplate.create({
      data: {
        ...module,
        templateId: birthdayTemplate.id
      }
    })
  }

  // Create sample event
  const sampleEvent = await prisma.event.create({
    data: {
      name: 'Ravi & Lakshmi Wedding',
      type: 'WEDDING',
      date: new Date('2024-08-15'),
      venue: 'Sri Venkateswara Kalyana Mandapam, Hyderabad',
      guestCount: 500,
      budget: 500000,
      status: 'PLANNING',
      description: 'Traditional Telugu wedding ceremony with all customs',
      templateId: weddingTemplate.id,
      managerId: manager.id,
      clientId: client.id,
      companyId: company1.id
    }
  })

  // Create modules for the sample event
  const venueModule = await prisma.module.create({
    data: {
      name: 'Venue Booking',
      category: 'VENUE',
      priority: 1,
      required: true,
      status: 'COMPLETED',
      budget: 50000,
      actualCost: 48000,
      eventId: sampleEvent.id
    }
  })

  const foodModule = await prisma.module.create({
    data: {
      name: 'Traditional Catering',
      category: 'FOOD',
      priority: 2,
      required: true,
      status: 'IN_PROGRESS',
      budget: 200000,
      eventId: sampleEvent.id
    }
  })

  const decorationModule = await prisma.module.create({
    data: {
      name: 'Mandap Decoration',
      category: 'DECORATION',
      priority: 3,
      required: true,
      status: 'PENDING',
      budget: 75000,
      eventId: sampleEvent.id
    }
  })

  // Create tasks
  const tasks = [
    {
      name: 'Book main hall',
      description: 'Reserve the main wedding hall for the ceremony',
      status: 'COMPLETED',
      priority: 'HIGH',
      estimatedHours: 2,
      actualHours: 1.5,
      estimatedCost: 25000,
      actualCost: 24000,
      dueDate: new Date('2024-07-01'),
      completedAt: new Date('2024-06-28'),
      moduleId: venueModule.id,
      assignedToId: manager.id
    },
    {
      name: 'Arrange parking space',
      description: 'Coordinate parking arrangements for 100+ vehicles',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      estimatedHours: 3,
      actualHours: 3,
      estimatedCost: 15000,
      actualCost: 15000,
      dueDate: new Date('2024-07-05'),
      completedAt: new Date('2024-07-03'),
      moduleId: venueModule.id,
      assignedToId: manager.id
    },
    {
      name: 'Plan vegetarian menu',
      description: 'Design traditional South Indian vegetarian menu for 300 guests',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      estimatedHours: 8,
      actualHours: 4,
      estimatedCost: 120000,
      dueDate: new Date('2024-07-20'),
      moduleId: foodModule.id,
      assignedToId: vendor1.id
    },
    {
      name: 'Plan non-vegetarian menu',
      description: 'Design traditional non-vegetarian menu for 200 guests',
      status: 'PENDING',
      priority: 'HIGH',
      estimatedHours: 6,
      estimatedCost: 80000,
      dueDate: new Date('2024-07-22'),
      moduleId: foodModule.id,
      assignedToId: vendor1.id
    },
    {
      name: 'Design mandap structure',
      description: 'Create traditional mandap design with floral arrangements',
      status: 'PENDING',
      priority: 'HIGH',
      estimatedHours: 12,
      estimatedCost: 45000,
      dueDate: new Date('2024-08-01'),
      moduleId: decorationModule.id,
      assignedToId: vendor2.id
    },
    {
      name: 'Arrange flowers',
      description: 'Source fresh flowers for mandap and venue decoration',
      status: 'PENDING',
      priority: 'MEDIUM',
      estimatedHours: 4,
      estimatedCost: 20000,
      dueDate: new Date('2024-08-10'),
      moduleId: decorationModule.id,
      assignedToId: vendor2.id
    }
  ]

  for (const task of tasks) {
    await prisma.task.create({ data: task })
  }

  // Create inventory items
  const inventoryItems = [
    {
      name: 'Marigold Flowers',
      description: 'Fresh marigold flowers for decoration',
      category: 'Decoration',
      unit: 'kg',
      quantityInStock: 50,
      reorderLevel: 10,
      unitCost: 200,
      supplier: 'Hyderabad Flower Market',
      supplierContact: '+91-9876543220'
    },
    {
      name: 'Rose Petals',
      description: 'Fresh rose petals for mandap decoration',
      category: 'Decoration',
      unit: 'kg',
      quantityInStock: 25,
      reorderLevel: 5,
      unitCost: 500,
      supplier: 'Hyderabad Flower Market',
      supplierContact: '+91-9876543220'
    },
    {
      name: 'Basmati Rice',
      description: 'Premium basmati rice for wedding feast',
      category: 'Food',
      unit: 'kg',
      quantityInStock: 200,
      reorderLevel: 50,
      unitCost: 150,
      supplier: 'Telangana Rice Mills',
      supplierContact: '+91-9876543221'
    },
    {
      name: 'Ghee',
      description: 'Pure cow ghee for cooking',
      category: 'Food',
      unit: 'liter',
      quantityInStock: 30,
      reorderLevel: 10,
      unitCost: 800,
      supplier: 'Amul Dairy',
      supplierContact: '+91-9876543222'
    }
  ]

  for (const item of inventoryItems) {
    await prisma.inventoryItem.create({ data: item })
  }

  // Create email templates
  const emailTemplates = [
    {
      name: 'Wedding Invitation',
      subject: 'You are cordially invited to {{eventName}}',
      body: `Dear {{guestName}},\n\nWe are delighted to invite you to the wedding ceremony of {{brideName}} and {{groomName}}.\n\nDate: {{eventDate}}\nVenue: {{venue}}\nTime: {{eventTime}}\n\nYour presence will make this occasion even more special.\n\nWith warm regards,\n{{hostName}}`,
      variables: {
        eventName: 'string',
        guestName: 'string',
        brideName: 'string',
        groomName: 'string',
        eventDate: 'string',
        venue: 'string',
        eventTime: 'string',
        hostName: 'string'
      },
      category: 'Wedding',
      isActive: true
    },
    {
      name: 'Task Assignment',
      subject: 'New Task Assigned: {{taskName}}',
      body: `Hello {{assigneeName}},\n\nYou have been assigned a new task for the event "{{eventName}}".\n\nTask: {{taskName}}\nDescription: {{taskDescription}}\nDue Date: {{dueDate}}\nPriority: {{priority}}\n\nPlease log in to the system to view more details and update the status.\n\nBest regards,\nCelebrationPro Team`,
      variables: {
        assigneeName: 'string',
        eventName: 'string',
        taskName: 'string',
        taskDescription: 'string',
        dueDate: 'string',
        priority: 'string'
      },
      category: 'Task Management',
      isActive: true
    },
    {
      name: 'Payment Reminder',
      subject: 'Payment Reminder for {{eventName}}',
      body: `Dear {{clientName}},\n\nThis is a friendly reminder that payment for your event "{{eventName}}" is due.\n\nInvoice Number: {{invoiceNumber}}\nAmount Due: ₹{{amount}}\nDue Date: {{dueDate}}\n\nPlease make the payment at your earliest convenience to avoid any delays in service.\n\nFor any queries, please contact us.\n\nThank you,\nCelebrationPro Team`,
      variables: {
        clientName: 'string',
        eventName: 'string',
        invoiceNumber: 'string',
        amount: 'number',
        dueDate: 'string'
      },
      category: 'Billing',
      isActive: true
    }
  ]

  for (const template of emailTemplates) {
    await prisma.emailTemplate.create({ data: template })
  }

  // Create sample invoice
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2024-001',
      amount: 450000,
      tax: 81000, // 18% GST
      totalAmount: 531000,
      status: 'SENT',
      dueDate: new Date('2024-08-01'),
      eventId: sampleEvent.id
    }
  })

  console.log('✅ Database seeded successfully!')
  console.log('\n📊 Created:')
  console.log('- 1 Company')
  console.log('- 5 Users (1 Admin, 1 Manager, 2 Vendors, 1 Client)')
  console.log('- 2 Event Templates (Wedding, Birthday)')
  console.log('- 18 Module Templates')
  console.log('- 1 Sample Event with 3 Modules')
  console.log('- 6 Tasks')
  console.log('- 4 Inventory Items')
  console.log('- 3 Email Templates')
  console.log('- 1 Invoice')
  console.log('\n🔐 Login Credentials:')
  console.log('Admin: admin@celebrationpro.com / password123')
  console.log('Manager: manager@celebrationpro.com / password123')
  console.log('Vendor: chef@celebrationpro.com / password123')
  console.log('Client: client@celebrationpro.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })