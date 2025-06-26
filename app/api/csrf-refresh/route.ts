import { NextRequest, NextResponse } from "next/server";

/**
 * Generate a CSRF token using Web Crypto API
 */
function generateCsrfToken() {
  // Create a random array of bytes
  const arr = new Uint8Array(16);
  // Fill with random values using the Web Crypto API
  crypto.getRandomValues(arr);
  // Convert to hex string
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Endpoint to refresh CSRF token
 */
export async function POST(req: NextRequest) {
  try {
    // Generate a new CSRF token
    const csrfToken = generateCsrfToken();
    
    // Create the response
    const response = NextResponse.json({ success: true }, { status: 200 });
    
    // Set the new CSRF cookie
    response.cookies.set('_csrf', csrfToken, {
      httpOnly: false, // Make it accessible to JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });
    
    return response;
  } catch (error) {
    console.error("Error refreshing CSRF token:", error);
    return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 });
  }
}

/**
 * GET method to check CSRF token status
 */
export async function GET(req: NextRequest) {
  const csrfCookie = req.cookies.get('_csrf')?.value;
  
  return NextResponse.json({
    hasCsrfToken: !!csrfCookie,
    tokenLength: csrfCookie?.length || 0
  });
} 