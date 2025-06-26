/**
 * Client-side security utilities
 */
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize a string to prevent XSS attacks
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: []  // Strip all attributes
  });
}

/**
 * Sanitize an HTML string for safe rendering
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    ADD_ATTR: ['target="_blank"', 'rel="noopener noreferrer"'],
    USE_PROFILES: { html: true }
  });
}

/**
 * Get the CSRF token from cookies
 */
export function getCsrfToken(): string | undefined {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith('_csrf=')) {
      return cookie.substring('_csrf='.length);
    }
  }
  return undefined;
}

/**
 * Add a CSRF token to a fetch request
 */
export function addCsrfToken(
  request: RequestInit = {}
): RequestInit {
  const csrfToken = getCsrfToken();
  if (!csrfToken) return request;

  const headers = new Headers(request.headers || {});
  headers.set('x-csrf-token', csrfToken);

  return {
    ...request,
    headers
  };
}

/**
 * Fetch wrapper with CSRF protection 
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const requestWithCsrf = addCsrfToken(options);
  return fetch(url, requestWithCsrf);
} 