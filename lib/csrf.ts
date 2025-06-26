/**
 * CSRF protection utilities
 */

/**
 * Generate a random token for CSRF protection
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a hidden CSRF input element for forms
 */
export function createCsrfInput(token: string): JSX.Element {
  return (
    <input type="hidden" name="_csrf" value={token} />
  );
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