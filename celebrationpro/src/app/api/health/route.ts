import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheckResult;
    auth: HealthCheckResult;
    storage: HealthCheckResult;
    external: HealthCheckResult;
  };
  metrics?: {
    totalUsers: number;
    totalEvents: number;
    totalTasks: number;
    activeEvents: number;
    pendingTasks: number;
  };
}

interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  message?: string;
  details?: any;
}

// GET /api/health - System health check
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const includeMetrics = searchParams.get('metrics') === 'true';
    
    // Check if user is authenticated for detailed checks
    let session = null;
    if (detailed || includeMetrics) {
      session = await getServerSession(authOptions);
      if (!session?.user || ![UserRole.ADMIN, UserRole.MANAGER].includes(session.user.role as UserRole)) {
        return NextResponse.json(
          { error: 'Detailed health checks require admin/manager access' },
          { status: 403 }
        );
      }
    }

    const healthCheck: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: await checkDatabase(),
        auth: await checkAuth(),
        storage: await checkStorage(),
        external: await checkExternalServices()
      }
    };

    // Include metrics if requested and user has permission
    if (includeMetrics && session) {
      healthCheck.metrics = await getSystemMetrics(session.user.companyId);
    }

    // Determine overall status
    const checkStatuses = Object.values(healthCheck.checks).map(check => check.status);
    
    if (checkStatuses.includes('fail')) {
      healthCheck.status = 'unhealthy';
    } else if (checkStatuses.includes('warn')) {
      healthCheck.status = 'degraded';
    }

    const responseTime = Date.now() - startTime;
    
    // Add response time to headers
    const response = NextResponse.json(healthCheck);
    response.headers.set('X-Response-Time', `${responseTime}ms`);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Return appropriate status code
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;
    
    return new NextResponse(JSON.stringify(healthCheck), {
      status: statusCode,
      headers: response.headers
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      error: 'Health check failed',
      responseTime: Date.now() - startTime
    }, { status: 503 });
  }
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Simple database connectivity test
    await db.$queryRaw`SELECT 1`;
    
    // Test a basic query
    const userCount = await db.user.count();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime > 1000 ? 'warn' : 'pass',
      responseTime,
      message: responseTime > 1000 ? 'Database response time is slow' : 'Database is responsive',
      details: {
        userCount,
        connectionPool: 'active'
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: 'Database connection failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function checkAuth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Check if auth configuration is valid
    const hasSecret = !!process.env.NEXTAUTH_SECRET;
    const hasUrl = !!process.env.NEXTAUTH_URL;
    
    if (!hasSecret || !hasUrl) {
      return {
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: 'Auth configuration incomplete',
        details: {
          hasSecret,
          hasUrl
        }
      };
    }
    
    return {
      status: 'pass',
      responseTime: Date.now() - startTime,
      message: 'Auth configuration is valid',
      details: {
        provider: 'credentials',
        configured: true
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: 'Auth check failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function checkStorage(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Check if upload directory exists and is writable
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    try {
      await fs.access(uploadDir, fs.constants.F_OK | fs.constants.W_OK);
    } catch {
      // Try to create the directory if it doesn't exist
      await fs.mkdir(uploadDir, { recursive: true });
    }
    
    // Test write operation
    const testFile = path.join(uploadDir, 'health-check.txt');
    await fs.writeFile(testFile, 'health check test');
    await fs.unlink(testFile);
    
    return {
      status: 'pass',
      responseTime: Date.now() - startTime,
      message: 'Storage is accessible and writable',
      details: {
        uploadDir,
        writable: true
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: 'Storage check failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function checkExternalServices(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const checks = [];
    
    // Check OpenAI API if configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          signal: AbortSignal.timeout(5000)
        });
        
        checks.push({
          service: 'OpenAI',
          status: response.ok ? 'pass' : 'fail',
          responseCode: response.status
        });
      } catch {
        checks.push({
          service: 'OpenAI',
          status: 'fail',
          error: 'Connection timeout or error'
        });
      }
    }
    
    // Check email service if configured
    if (process.env.EMAIL_SERVER_HOST) {
      checks.push({
        service: 'Email',
        status: 'pass', // Basic config check
        configured: true
      });
    }
    
    const failedChecks = checks.filter(check => check.status === 'fail');
    
    return {
      status: failedChecks.length > 0 ? 'warn' : 'pass',
      responseTime: Date.now() - startTime,
      message: failedChecks.length > 0 ? 
        `${failedChecks.length} external service(s) unavailable` : 
        'All configured external services are accessible',
      details: {
        checks,
        totalServices: checks.length,
        failedServices: failedChecks.length
      }
    };
  } catch (error) {
    return {
      status: 'warn',
      responseTime: Date.now() - startTime,
      message: 'External services check failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function getSystemMetrics(companyId?: string) {
  try {
    const whereClause = companyId ? { companyId } : {};
    
    const [totalUsers, totalEvents, totalTasks, activeEvents, pendingTasks] = await Promise.all([
      db.user.count({ where: companyId ? { companyId } : {} }),
      db.event.count({ where: whereClause }),
      db.task.count({
        where: {
          module: {
            event: whereClause
          }
        }
      }),
      db.event.count({
        where: {
          ...whereClause,
          status: {
            in: ['PLANNING', 'IN_PROGRESS']
          }
        }
      }),
      db.task.count({
        where: {
          module: {
            event: whereClause
          },
          status: 'PENDING'
        }
      })
    ]);
    
    return {
      totalUsers,
      totalEvents,
      totalTasks,
      activeEvents,
      pendingTasks
    };
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    return {
      totalUsers: 0,
      totalEvents: 0,
      totalTasks: 0,
      activeEvents: 0,
      pendingTasks: 0
    };
  }
}