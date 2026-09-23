import { Request, Response, NextFunction } from "express";

interface MemoryStoreItem {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, MemoryStoreItem>();

// Clean up expired entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryStore.entries()) {
    if (item.resetTime <= now) {
      memoryStore.delete(key);
    }
  }
}, 2 * 60 * 1000);

export interface RateLimiterOptions {
  windowMs?: number; // default 60,000 ms (1 minute)
  max?: number;      // default 5 requests per window
  message?: string;
  statusCode?: number;
}

let upstashRatelimitInstance: any = null;

async function getUpstashLimiter(max: number, windowSeconds: number) {
  if (upstashRatelimitInstance !== null) return upstashRatelimitInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({ url, token });
      upstashRatelimitInstance = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
        prefix: "ratelimit:auth",
      });
      return upstashRatelimitInstance;
    } catch (e) {
      console.warn("Upstash Redis initialization failed, falling back to in-memory rate limiter", e);
    }
  }
  return null;
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 5;
  const message = options.message || "Too many requests, please try again later.";
  const statusCode = options.statusCode || 429;
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    // Determine client IP
    const forwarded = req.headers["x-forwarded-for"];
    const ip = (
      (typeof forwarded === "string" ? forwarded.split(",")[0] : Array.isArray(forwarded) ? forwarded[0] : null) ||
      req.headers["x-nf-client-connection-ip"] ||
      req.headers["client-ip"] ||
      req.ip ||
      req.socket.remoteAddress ||
      "127.0.0.1"
    ).toString().trim();

    const normalizedPath = req.path.toLowerCase().replace(/\/+$/, "") || "/";
    const identifier = `${normalizedPath}:${ip}`;

    // Try Upstash Redis if configured
    try {
      const upstash = await getUpstashLimiter(max, windowSeconds);
      if (upstash) {
        const { success, limit, remaining, reset } = await upstash.limit(identifier);
        res.setHeader("X-RateLimit-Limit", limit);
        res.setHeader("X-RateLimit-Remaining", remaining);
        res.setHeader("X-RateLimit-Reset", Math.ceil(reset / 1000));

        if (!success) {
          const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
          res.setHeader("Retry-After", retryAfter);
          return res.status(statusCode).json({
            error: message,
            retryAfter,
          });
        }
        return next();
      }
    } catch (err) {
      console.warn("Upstash limit check failed, falling back to memory store:", err);
    }

    // In-memory sliding window rate limiter
    const now = Date.now();
    let record = memoryStore.get(identifier);

    if (!record || record.resetTime <= now) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      memoryStore.set(identifier, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const retryAfter = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      res.setHeader("Retry-After", retryAfter);
      return res.status(statusCode).json({
        error: message,
        retryAfter,
      });
    }

    return next();
  };
}
