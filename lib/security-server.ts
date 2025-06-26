/**
 * Server-side security utilities
 */

/**
 * Simple server-side sanitization (without DOMPurify)
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  // Basic server-side sanitization
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Simple validation functions that work in Edge Runtime
 */
const validators = {
  required: (value: any) => value !== undefined && value !== null && value !== '',
  string: (value: any) => typeof value === 'string',
  uuid: (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  email: (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
  min: (value: string, min: number) => value.length >= min,
  max: (value: string, max: number) => value.length <= max,
  array: (value: any) => Array.isArray(value),
  boolean: (value: any) => typeof value === 'boolean'
};

/**
 * Validate data against a schema
 */
export function validateData(data: any, schema: any) {
  const errors: any[] = [];
  const result = { ...data };

  Object.keys(schema).forEach(field => {
    const rules = schema[field];
    const value = data[field];

    // Check required fields
    if (rules.required && !validators.required(value)) {
      errors.push({ field, message: `${field} is required` });
      return;
    }

    // Skip validation for undefined optional fields
    if (value === undefined || value === null) {
      return;
    }

    // Validate string type
    if (rules.type === 'string' && !validators.string(value)) {
      errors.push({ field, message: `${field} must be a string` });
    }

    // Validate UUID format
    if (rules.uuid && !validators.uuid(value)) {
      errors.push({ field, message: `${field} must be a valid UUID` });
    }

    // Validate email format
    if (rules.email && !validators.email(value)) {
      errors.push({ field, message: `${field} must be a valid email` });
    }

    // Validate string length
    if (validators.string(value)) {
      if (rules.min && !validators.min(value, rules.min)) {
        errors.push({ field, message: `${field} must be at least ${rules.min} characters long` });
      }
      if (rules.max && !validators.max(value, rules.max)) {
        errors.push({ field, message: `${field} must not exceed ${rules.max} characters` });
      }
    }

    // Validate array
    if (rules.type === 'array' && !validators.array(value)) {
      errors.push({ field, message: `${field} must be an array` });
    }

    // Validate boolean
    if (rules.type === 'boolean' && !validators.boolean(value)) {
      errors.push({ field, message: `${field} must be a boolean` });
    }
  });

  if (errors.length > 0) {
    const validationError = new Error('Validation Error');
    (validationError as any).details = errors;
    (validationError as any).code = 'VALIDATION_ERROR';
    throw validationError;
  }

  return result;
}

/**
 * Input validation schemas
 */
export const schemas = {
  // User related schemas
  user: {
    id: { type: 'string', uuid: true, required: true },
    email: { type: 'string', email: true, required: true },
    name: { type: 'string', min: 1, max: 50, required: false },
    password: { type: 'string', min: 8, max: 100, required: true }
  },
  
  // Message related schemas
  message: {
    content: { type: 'string', max: 5000, required: true },
    conversationId: { type: 'string', uuid: true, required: true },
    keyFingerprint: { type: 'string', required: false }
  },
  
  // Conversation related schemas
  conversation: {
    id: { type: 'string', uuid: true, required: true },
    name: { type: 'string', min: 1, max: 100, required: false },
    userIds: { type: 'array', required: true },
    isGroup: { type: 'boolean', required: false }
  }
};

/**
 * Safe error handler that doesn't leak sensitive information
 */
export function safeError(error: any): { message: string, code: string } {
  console.error('Original error:', error);
  
  // Default safe error
  const safeError = {
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR'
  };
  
  // Override with more specific but still safe errors based on known patterns
  if (error?.code === 'P2025') {
    safeError.message = 'The requested resource could not be found';
    safeError.code = 'NOT_FOUND';
  } else if (error?.code === 'P2002') {
    safeError.message = 'A resource with this identifier already exists';
    safeError.code = 'DUPLICATE';
  } else if (error?.code === 'P2003') {
    safeError.message = 'Foreign key constraint failed';
    safeError.code = 'CONSTRAINT';
  } else if (error?.code === 'UNAUTHORIZED') {
    safeError.message = 'You are not authorized to perform this action';
    safeError.code = 'UNAUTHORIZED';
  }
  
  return safeError;
}

/**
 * Security headers
 */
export const securityHeaders = [
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  }
];

/**
 * Generate a random token for CSRF protection
 * (Edge runtime compatible)
 */
export function generateCsrfToken(): string {
  // Create random array of bytes using Web Crypto API
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  // Convert to hex string
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
} 