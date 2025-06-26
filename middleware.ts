import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { securityHeaders } from './lib/security-server'

/**
 * Generate a CSRF token using methods compatible with Edge runtime
 */
function generateEdgeCompatibleToken() {
  // Create a random array of bytes
  const arr = new Uint8Array(16);
  // Fill with random values using the Web Crypto API (available in Edge runtime)
  crypto.getRandomValues(arr);
  // Convert to hex string
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Middleware to add security headers, rate limiting, and auth protection
 */
export function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname

  // Clone the response
  const response = NextResponse.next()

  // Add the security headers
  securityHeaders.forEach(({ key, value }) => {
    response.headers.set(key, value)
  })

  // Add Content-Security-Policy header
  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; font-src 'self'; connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || ''} wss://${request.headers.get('host')}; frame-ancestors 'none';`
  )

  // Add CSRF protection cookie if it doesn't exist and request method requires it
  const methodsRequiringCsrf = ['POST', 'PUT', 'DELETE', 'PATCH']
  
  if (methodsRequiringCsrf.includes(request.method) && !request.cookies.get('_csrf')) {
    const csrfToken = generateEdgeCompatibleToken();
    response.cookies.set('_csrf', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    })
  }

  // Set secure cookies for sessions
  if (request.cookies.get('next-auth.session-token')) {
    const sessionCookie = request.cookies.get('next-auth.session-token')
    if (sessionCookie) {
      response.cookies.set('next-auth.session-token', sessionCookie.value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30
      })
    }
  }

  return response
}

/**
 * Match all API routes and pages
 */
export const config = {
  matcher: [
    // API routes
    '/api/:path*',
    // Auth routes
    '/login',
    '/register',
    // Protected routes
    '/dashboard/:path*',
    '/messages/:path*',
  ],
} 