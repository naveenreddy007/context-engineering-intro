import { z } from 'zod'

// User schemas
export const userSchema = z.object({
  id: z.string().optional(),
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'VENDOR', 'CLIENT']),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  companyId: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.enum(['MANAGER', 'VENDOR', 'CLIENT']).default('CLIENT'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// Company schemas
export const companySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
})

// Event schemas
export const eventSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Event name must be at least 2 characters'),
  type: z.enum(['WEDDING', 'BIRTHDAY', 'CORPORATE', 'ANNIVERSARY', 'CUSTOM']),
  date: z.string().or(z.date()),
  venue: z.string().min(2, 'Venue must be specified'),
  guestCount: z.number().min(1, 'Guest count must be at least 1'),
  budget: z.number().optional(),
  status: z.enum(['PLANNING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PLANNING'),
  description: z.string().optional(),
  templateId: z.string().optional(),
  managerId: z.string(),
  clientId: z.string(),
  companyId: z.string().optional(),
})

export const eventUpdateSchema = eventSchema.partial().extend({
  id: z.string(),
})

// Template schemas
export const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Template name must be at least 2 characters'),
  description: z.string().optional(),
  eventType: z.enum(['WEDDING', 'BIRTHDAY', 'CORPORATE', 'ANNIVERSARY', 'CUSTOM']),
  region: z.string().optional(),
  isCustom: z.boolean().default(false),
  parentTemplateId: z.string().optional(),
})

// Module schemas
export const moduleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Module name must be at least 2 characters'),
  category: z.enum([
    'VENUE', 'FOOD', 'DECORATION', 'LIGHTING', 'PHOTOGRAPHY',
    'TRANSPORTATION', 'COMMUNICATIONS', 'GIFTS', 'SECURITY', 'ENTERTAINMENT'
  ]),
  priority: z.number().min(1),
  required: z.boolean().default(false),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED']).default('PENDING'),
  budget: z.number().optional(),
  actualCost: z.number().default(0),
  eventId: z.string(),
})

export const moduleTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Module name must be at least 2 characters'),
  category: z.enum([
    'VENUE', 'FOOD', 'DECORATION', 'LIGHTING', 'PHOTOGRAPHY',
    'TRANSPORTATION', 'COMMUNICATIONS', 'GIFTS', 'SECURITY', 'ENTERTAINMENT'
  ]),
  priority: z.number().min(1),
  required: z.boolean().default(false),
  templateId: z.string(),
})

// Task schemas
export const taskSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Task name must be at least 2 characters'),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']).default('PENDING'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  estimatedHours: z.number().min(0),
  actualHours: z.number().min(0).default(0),
  estimatedCost: z.number().optional(),
  actualCost: z.number().min(0).default(0),
  dueDate: z.string().or(z.date()).optional(),
  moduleId: z.string(),
  assignedToId: z.string().optional(),
  parentTaskId: z.string().optional(),
})

export const taskUpdateSchema = z.object({
  id: z.string(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']).optional(),
  actualHours: z.number().min(0).optional(),
  actualCost: z.number().min(0).optional(),
  assignedToId: z.string().optional(),
})

// Inventory schemas
export const inventoryItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Item name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  quantityInStock: z.number().min(0),
  reorderLevel: z.number().min(0),
  unitCost: z.number().min(0),
  supplier: z.string().optional(),
  supplierContact: z.string().optional(),
})

// Notification schemas
export const notificationSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.enum([
    'TASK_ASSIGNED', 'TASK_COMPLETED', 'DEADLINE_REMINDER',
    'STATUS_UPDATE', 'APPROVAL_REQUEST', 'PAYMENT_REMINDER', 'GENERAL'
  ]),
  channel: z.enum(['EMAIL', 'SMS', 'IN_APP', 'WHATSAPP']),
  userId: z.string(),
  eventId: z.string().optional(),
  taskId: z.string().optional(),
  scheduledAt: z.string().or(z.date()).optional(),
})

// Email template schemas
export const emailTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Template name must be at least 2 characters'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  variables: z.record(z.string()).optional(),
  category: z.string().min(1, 'Category is required'),
  isActive: z.boolean().default(true),
})

// AI command schemas
export const aiCommandSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  type: z.enum(['TASK_GENERATION', 'MENU_GENERATION', 'EMAIL_GENERATION', 'GENERAL']),
  userId: z.string(),
  metadata: z.record(z.any()).optional(),
})

// Invoice schemas
export const invoiceSchema = z.object({
  id: z.string().optional(),
  invoiceNumber: z.string().optional(),
  amount: z.number().min(0),
  tax: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).default('DRAFT'),
  dueDate: z.string().or(z.date()),
  eventId: z.string(),
})

// Search and filter schemas
export const eventFilterSchema = z.object({
  status: z.enum(['PLANNING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  type: z.enum(['WEDDING', 'BIRTHDAY', 'CORPORATE', 'ANNIVERSARY', 'CUSTOM']).optional(),
  managerId: z.string().optional(),
  clientId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
})

export const taskFilterSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assignedToId: z.string().optional(),
  eventId: z.string().optional(),
  moduleId: z.string().optional(),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
})

// API response schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
})

export const paginatedResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  error: z.string().optional(),
})

// Type exports
export type User = z.infer<typeof userSchema>
export type Login = z.infer<typeof loginSchema>
export type Register = z.infer<typeof registerSchema>
export type Company = z.infer<typeof companySchema>
export type Event = z.infer<typeof eventSchema>
export type EventUpdate = z.infer<typeof eventUpdateSchema>
export type Template = z.infer<typeof templateSchema>
export type Module = z.infer<typeof moduleSchema>
export type ModuleTemplate = z.infer<typeof moduleTemplateSchema>
export type Task = z.infer<typeof taskSchema>
export type TaskUpdate = z.infer<typeof taskUpdateSchema>
export type InventoryItem = z.infer<typeof inventoryItemSchema>
export type Notification = z.infer<typeof notificationSchema>
export type EmailTemplate = z.infer<typeof emailTemplateSchema>
export type AICommand = z.infer<typeof aiCommandSchema>
export type Invoice = z.infer<typeof invoiceSchema>
export type EventFilter = z.infer<typeof eventFilterSchema>
export type TaskFilter = z.infer<typeof taskFilterSchema>
export type ApiResponse = z.infer<typeof apiResponseSchema>
export type PaginatedResponse = z.infer<typeof paginatedResponseSchema>