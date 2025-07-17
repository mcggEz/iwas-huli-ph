import { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
  keyGenerator?: (req: NextApiRequest) => string; // Function to generate unique keys
  handler?: (req: NextApiRequest, res: NextApiResponse) => void; // Custom handler for rate limit exceeded
}

interface RateLimitStore {
  [key: string]: {
    requests: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req: NextApiRequest) => (req as any).ip || (req.connection as any)?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
      ...config,
    };
  }

  // Clean up expired entries
  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }

  // Get client identifier
  private getKey(req: NextApiRequest): string {
    return this.config.keyGenerator!(req);
  }

  // Check if request is within rate limit
  public check(req: NextApiRequest): { allowed: boolean; remaining: number; resetTime: number } {
    this.cleanup();
    
    const key = this.getKey(req);
    const now = Date.now();
    
    if (!this.store[key]) {
      this.store[key] = {
        requests: 1,
        resetTime: now + this.config.windowMs,
      };
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: this.store[key].resetTime,
      };
    }

    // Check if window has reset
    if (now > this.store[key].resetTime) {
      this.store[key] = {
        requests: 1,
        resetTime: now + this.config.windowMs,
      };
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: this.store[key].resetTime,
      };
    }

    // Check if within limit
    if (this.store[key].requests < this.config.maxRequests) {
      this.store[key].requests++;
      return {
        allowed: true,
        remaining: this.config.maxRequests - this.store[key].requests,
        resetTime: this.store[key].resetTime,
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: this.store[key].resetTime,
    };
  }

  // Reset rate limit for a specific key
  public reset(key: string): void {
    delete this.store[key];
  }

  // Get current rate limit info for a key
  public getInfo(key: string): { requests: number; remaining: number; resetTime: number } | null {
    const entry = this.store[key];
    if (!entry) {
      return null;
    }
    
    return {
      requests: entry.requests,
      remaining: Math.max(0, this.config.maxRequests - entry.requests),
      resetTime: entry.resetTime,
    };
  }

  // Get all active rate limit entries (for monitoring)
  public getAllEntries(): RateLimitStore {
    this.cleanup();
    return { ...this.store };
  }
}

// Create different rate limiters for different purposes
export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
});

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 auth attempts per 15 minutes
});

export const formSubmissionRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 form submissions per minute
});

export const searchRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 searches per minute
});

export default RateLimiter; 