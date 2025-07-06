import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import { loginSchema } from './validations'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        // Validate input
        const validatedFields = loginSchema.safeParse(credentials)
        if (!validatedFields.success) {
          throw new Error('Invalid email or password format')
        }

        const { email, password } = validatedFields.data

        try {
          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email },
            include: {
              company: true
            }
          })

          if (!user) {
            throw new Error('Invalid email or password')
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(password, user.password)
          if (!isPasswordValid) {
            throw new Error('Invalid email or password')
          }

          // Return user object
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone,
            companyId: user.companyId,
            companyName: user.company?.name
          }
        } catch (error) {
          console.error('Authentication error:', error)
          throw new Error('Authentication failed')
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.phone = user.phone
        token.companyId = user.companyId
        token.companyName = user.companyName
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.phone = token.phone as string
        session.user.companyId = token.companyId as string
        session.user.companyName = token.companyName as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error'
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Helper function to get current user
export async function getCurrentUser(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true
      }
    })
    return user
  } catch (error) {
    console.error('Error fetching current user:', error)
    return null
  }
}

// Helper function to check user permissions
export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}

// Helper function to check if user can access resource
export async function canAccessEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) return false

    // Admin can access all events
    if (user.role === 'ADMIN') return true

    // Check if user is manager, client, or assigned vendor for this event
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        OR: [
          { managerId: userId },
          { clientId: userId },
          {
            modules: {
              some: {
                tasks: {
                  some: {
                    assignedToId: userId
                  }
                }
              }
            }
          }
        ]
      }
    })

    return !!event
  } catch (error) {
    console.error('Error checking event access:', error)
    return false
  }
}

// Helper function to check if user can access task
export async function canAccessTask(userId: string, taskId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) return false

    // Admin can access all tasks
    if (user.role === 'ADMIN') return true

    // Check if user is assigned to task or is event manager/client
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { assignedToId: userId },
          {
            module: {
              event: {
                OR: [
                  { managerId: userId },
                  { clientId: userId }
                ]
              }
            }
          }
        ]
      }
    })

    return !!task
  } catch (error) {
    console.error('Error checking task access:', error)
    return false
  }
}