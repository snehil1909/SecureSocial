/**
 * Security utilities for the application
 */
import DOMPurify from 'isomorphic-dompurify';
import Joi from 'joi';

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
 * Input validation schemas
 */
export const schemas = {
  // User related schemas
  user: {
    id: Joi.string().uuid().required(),
    email: Joi.string().email().required(),
    name: Joi.string().min(1).max(50).optional().allow(null, ''),
    password: Joi.string().min(8).max(100).required()
  },
  
  // Message related schemas
  message: {
    content: Joi.string().max(5000).required(),
    conversationId: Joi.string().uuid().required()
  },
  
  // Conversation related schemas
  conversation: {
    id: Joi.string().uuid().required(),
    name: Joi.string().min(1).max(100).optional(),
    userIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
    isGroup: Joi.boolean().optional()
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
 * Validate data against a schema
 */
export function validateData(data: any, schema: Joi.Schema) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    const validationError = new Error('Validation Error');
    (validationError as any).details = error.details;
    (validationError as any).code = 'VALIDATION_ERROR';
    throw validationError;
  }
  
  return value;
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
 */
export function generateCsrfToken(): string {
  return crypto.randomUUID();
} 