import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { safeError, validateData } from './security-server';
import { rateLimit } from './rate-limit';

/**
 * API middleware for handling authentication and validation
 * @param handler The API route handler
 * @param options Configuration options
 */
export function withApiMiddleware(
  handler: (req: NextRequest, session: any) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    schema?: any;
    rateLimit?: {
      limit: number;
      window: number; // in seconds
    };
  } = { requireAuth: true }
) {
  return async function (req: NextRequest): Promise<NextResponse> {
    try {
      // Rate limiting
      if (options.rateLimit) {
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const isRateLimited = await rateLimit(ip, options.rateLimit.limit, options.rateLimit.window);
        
        if (isRateLimited) {
          return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
          );
        }
      }

      // CSRF Protection
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const csrfCookie = req.cookies.get('_csrf')?.value;
        const csrfHeader = req.headers.get('x-csrf-token');
        
        if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
          return NextResponse.json(
            { error: 'Invalid CSRF token' },
            { status: 403 }
          );
        }
      }

      // Authentication
      if (options.requireAuth) {
        const session = await getServerSession();
        
        if (!session || !session.user) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
        
        // Input Validation
        if (options.schema && req.body) {
          try {
            const body = await req.json();
            const validatedData = validateData(body, options.schema);
            
            // Replace the original request with the validated data
            (req as any).validatedBody = validatedData;
          } catch (validationError: any) {
            return NextResponse.json(
              { 
                error: 'Invalid input data',
                details: validationError.details
              },
              { status: 400 }
            );
          }
        }
        
        return handler(req, session);
      }
      
      // Handle non-authenticated routes
      return handler(req, null);
    } catch (error) {
      console.error('API error:', error);
      const { message, code } = safeError(error);
      
      return NextResponse.json(
        { error: message, code },
        { status: code === 'UNAUTHORIZED' ? 401 : 500 }
      );
    }
  };
}

/**
 * Middleware for handling public API routes (no auth required)
 */
export function withPublicApiMiddleware(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    schema?: any;
    rateLimit?: {
      limit: number;
      window: number;
    };
  } = {}
) {
  return withApiMiddleware(
    async (req) => handler(req),
    { requireAuth: false, ...options }
  );
} 