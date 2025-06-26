import { Redis } from '@upstash/redis';

// Initialize Redis client (use env variables to configure)
const redis = new Redis({
  url: process.env.REDIS_URL || '',
  token: process.env.REDIS_TOKEN || '',
});

/**
 * Simple in-memory rate limiting (fallback if Redis isn't configured)
 */
const inMemoryStore: Record<string, { count: number, timestamp: number }> = {};

/**
 * Clean up expired in-memory rate limit entries
 */
function cleanupInMemoryStore(windowInSeconds: number) {
  const now = Date.now();
  Object.keys(inMemoryStore).forEach(key => {
    if (now - inMemoryStore[key].timestamp > windowInSeconds * 1000) {
      delete inMemoryStore[key];
    }
  });
}

/**
 * Rate limiting function
 * @param identifier The unique identifier for the rate limit (e.g., IP address)
 * @param limit The maximum number of requests allowed in the window
 * @param windowInSeconds The time window in seconds
 * @returns Boolean indicating if the request should be rate limited
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  windowInSeconds: number
): Promise<boolean> {
  const key = `ratelimit:${identifier}:${Math.floor(Date.now() / (windowInSeconds * 1000))}`;
  
  try {
    if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
      // Use Redis for rate limiting
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, windowInSeconds);
      }
      
      return current > limit;
    } else {
      // Fallback to in-memory rate limiting
      cleanupInMemoryStore(windowInSeconds);
      
      const now = Date.now();
      const windowKey = `${identifier}:${Math.floor(now / (windowInSeconds * 1000))}`;
      
      if (!inMemoryStore[windowKey]) {
        inMemoryStore[windowKey] = { count: 0, timestamp: now };
      }
      
      inMemoryStore[windowKey].count += 1;
      
      return inMemoryStore[windowKey].count > limit;
    }
  } catch (error) {
    console.error('Rate limiting error:', error);
    // In case of error, don't rate limit
    return false;
  }
}

/**
 * Higher-order function to add rate limiting to any function
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    identifier: (args: Parameters<T>) => string;
    limit: number;
    window: number;
    onRateLimited?: (args: Parameters<T>) => any;
  }
) {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const identifier = options.identifier(args);
    const isRateLimited = await rateLimit(identifier, options.limit, options.window);
    
    if (isRateLimited) {
      if (options.onRateLimited) {
        return options.onRateLimited(args) as ReturnType<T>;
      }
      throw new Error('Rate limit exceeded');
    }
    
    return fn(...args);
  };
} 