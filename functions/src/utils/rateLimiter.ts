import { db } from './firebase';
import { RateLimitError } from './errors';
import { FieldValue } from 'firebase-admin/firestore';

// Rate limit configuration
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests in the window
  keyPrefix?: string; // Prefix for the rate limit key
  skipFailedRequests?: boolean; // Don't count failed requests
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  message?: string; // Custom error message
}

// Rate limit storage interface
interface RateLimitEntry {
  count: number;
  resetAt: any; // Firestore Timestamp
  firstRequest: any; // Firestore Timestamp
}

// Default configurations
export const RATE_LIMITS = {
  // Global command rate limit
  COMMANDS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 commands per minute
    keyPrefix: 'cmd',
  },

  // Specific command limits
  EXPENSIVE_COMMANDS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 expensive commands per minute
    keyPrefix: 'exp',
  },

  // Alert creation limit
  ALERTS: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 10, // 10 alerts per day
    keyPrefix: 'alert',
  },

  // API calls limit (for future REST API)
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    keyPrefix: 'api',
  },
};

// Rate limiter class
export class RateLimiter {
  private config: RateLimitConfig;
  private collection = 'rate_limits';

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  // Check and consume rate limit
  async checkLimit(identifier: string): Promise<void> {
    const key = this.getKey(identifier);
    const now = new Date();

    const docRef = db.collection(this.collection).doc(key);

    try {
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);

        if (!doc.exists) {
          // First request
          transaction.set(docRef, {
            count: 1,
            resetAt: new Date(now.getTime() + this.config.windowMs),
            firstRequest: now,
          });
          return;
        }

        const data = doc.data() as RateLimitEntry;

        // Check if window has expired
        const resetTime = data.resetAt.toDate ? data.resetAt.toDate() : new Date(data.resetAt);
        if (resetTime <= now) {
          // Reset the window
          transaction.set(docRef, {
            count: 1,
            resetAt: new Date(now.getTime() + this.config.windowMs),
            firstRequest: now,
          });
          return;
        }

        // Check if limit exceeded
        if (data.count >= this.config.maxRequests) {
          const resetTime = data.resetAt.toDate ? data.resetAt.toDate() : new Date(data.resetAt);
          const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000);
          throw new RateLimitError(retryAfter);
        }

        // Increment counter
        transaction.update(docRef, {
          count: FieldValue.increment(1),
        });
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      // Log error but don't block the request on rate limiter failure
      console.error('Rate limiter error:', error);
    }
  }

  // Get rate limit status
  async getStatus(identifier: string): Promise<{
    remaining: number;
    resetAt: Date;
    limit: number;
  }> {
    const key = this.getKey(identifier);
    const now = new Date();

    const doc = await db.collection(this.collection).doc(key).get();

    if (!doc.exists) {
      return {
        remaining: this.config.maxRequests,
        resetAt: new Date(now.getTime() + this.config.windowMs),
        limit: this.config.maxRequests,
      };
    }

    const data = doc.data() as RateLimitEntry;

    // Check if window has expired
    const resetTime = data.resetAt.toDate ? data.resetAt.toDate() : new Date(data.resetAt);
    if (resetTime <= now) {
      return {
        remaining: this.config.maxRequests,
        resetAt: new Date(now.getTime() + this.config.windowMs),
        limit: this.config.maxRequests,
      };
    }

    return {
      remaining: Math.max(0, this.config.maxRequests - data.count),
      resetAt: resetTime,
      limit: this.config.maxRequests,
    };
  }

  // Reset rate limit for an identifier
  async reset(identifier: string): Promise<void> {
    const key = this.getKey(identifier);
    await db.collection(this.collection).doc(key).delete();
  }

  // Get the storage key
  private getKey(identifier: string): string {
    const prefix = this.config.keyPrefix || 'rl';
    return `${prefix}:${identifier}`;
  }
}

// Rate limiter middleware for commands
export async function checkCommandRateLimit(
  userId: string,
  command?: string,
  isAdmin: boolean = false
): Promise<void> {
  // Skip rate limiting for admins
  if (isAdmin) {
    return;
  }

  // Check global command rate limit
  const globalLimiter = new RateLimiter(RATE_LIMITS.COMMANDS);
  await globalLimiter.checkLimit(userId);

  // Check expensive command rate limit
  const expensiveCommands = ['/history', '/predict', '/compare'];
  if (command && expensiveCommands.includes(command)) {
    const expensiveLimiter = new RateLimiter(RATE_LIMITS.EXPENSIVE_COMMANDS);
    await expensiveLimiter.checkLimit(userId);
  }
}

// Rate limiter for specific features
export async function checkFeatureRateLimit(
  userId: string,
  feature: 'alerts' | 'api',
  isAdmin: boolean = false
): Promise<void> {
  if (isAdmin) {
    return;
  }

  const config = feature === 'alerts' ? RATE_LIMITS.ALERTS : RATE_LIMITS.API;
  const limiter = new RateLimiter(config);
  await limiter.checkLimit(userId);
}

// Clean up old rate limit entries (run periodically)
export async function cleanupRateLimits(): Promise<void> {
  const now = new Date();
  const collection = db.collection('rate_limits');

  // Query for expired entries
  const snapshot = await collection
    .where('resetAt', '<', now)
    .limit(500) // Process in batches
    .get();

  if (snapshot.empty) {
    return;
  }

  // Delete expired entries
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  console.log(`Cleaned up ${snapshot.size} expired rate limit entries`);
}

// Create a scheduled function to clean up rate limits
export const cleanupScheduler = () => {
  const { scheduledFunction } = require('./functions');

  return scheduledFunction('every 1 hours', async () => {
    await cleanupRateLimits();
  });
};
