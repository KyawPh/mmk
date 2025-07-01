import { Request, Response } from 'firebase-functions/v1';

// Custom error classes
export class BaseError extends Error {
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends BaseError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class RateLimitError extends BaseError {
  constructor(retryAfter?: number) {
    super('Too many requests. Please try again later.', 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
  }
}

export class ExternalServiceError extends BaseError {
  constructor(service: string, originalError?: any) {
    super(`External service error: ${service}`, 'EXTERNAL_SERVICE_ERROR', 502, {
      service,
      originalError,
    });
  }
}

// Error handler middleware
export const handleError = (error: any, req: Request, res: Response) => {
  // Log error
  console.error('Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    headers: req.headers,
  });

  // Handle known errors
  if (error instanceof BaseError) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  // Handle Firebase errors
  if (error.code?.startsWith('auth/')) {
    return res.status(401).json({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed',
      },
    });
  }

  // Handle unknown errors
  const isDevelopment = process.env['NODE_ENV'] !== 'production';

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      ...(isDevelopment && { stack: error.stack }),
    },
  });
};

// Async error wrapper for Express-style handlers
export const asyncHandler =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      handleError(error, req, res);
    }
  };

// User-friendly error messages for Telegram
export const getUserFriendlyMessage = (error: any): string => {
  if (error instanceof RateLimitError) {
    return "⚠️ You're sending too many requests. Please wait a moment and try again.";
  }

  if (error instanceof ValidationError) {
    return `❌ Invalid input: ${error.message}`;
  }

  if (error instanceof NotFoundError) {
    return "🔍 Sorry, I couldn't find what you're looking for.";
  }

  if (error instanceof ExternalServiceError) {
    return "🔧 I'm having trouble connecting to external services. Please try again later.";
  }

  // Default message
  return '❌ Something went wrong. Please try again or contact support if the issue persists.';
};

// Error recovery mechanisms
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors
      if (error instanceof BaseError && error.statusCode < 500) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
};
