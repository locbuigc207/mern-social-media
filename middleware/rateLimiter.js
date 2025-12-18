const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const redis = require("redis");
const logger = require("../utils/logger");
const { RateLimitError } = require("../utils/AppError");

// Redis client for rate limiting
let redisClient = null;

const initializeRedis = async () => {
  if (process.env.REDIS_URL) {
    try {
      redisClient = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection failed after 10 attempts');
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      redisClient.on('error', (err) => {
        logger.error('Redis Client Error', err);
      });

      redisClient.on('connect', () => {
        logger.info('Redis connected for rate limiting');
      });

      await redisClient.connect();
    } catch (err) {
      logger.error('Failed to connect to Redis', err);
      redisClient = null;
    }
  }
};

// Initialize Redis connection
initializeRedis();

// Default rate limit handler
const defaultHandler = (req, res) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    userId: req.user?._id
  });

  throw new RateLimitError(
    'Too many requests from this IP, please try again later.'
  );
};

// Create rate limiter with optional Redis store
const createRateLimiter = (options) => {
  const config = {
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100,
    message: options.message || 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: options.handler || defaultHandler,
    skip: options.skip || ((req) => {
      // Skip rate limiting for admins in development
      if (process.env.NODE_ENV === 'development' && req.user?.role === 'admin') {
        return true;
      }
      return false;
    }),
    keyGenerator: options.keyGenerator || ((req) => {
      return req.user?._id?.toString() || req.ip;
    })
  };

  // Use Redis store if available
  if (redisClient && redisClient.isOpen) {
    config.store = new RedisStore({
      client: redisClient,
      prefix: options.prefix || 'rl:',
    });
  }

  return rateLimit(config);
};

// Auth endpoints rate limiter (stricter)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: 'Too many login attempts, please try again later.',
  prefix: 'rl:auth:',
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Registration rate limiter
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 accounts per hour per IP
  message: 'Too many accounts created, please try again later.',
  prefix: 'rl:register:',
  keyGenerator: (req) => req.ip, // Always use IP for registration
});

// Password reset rate limiter
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reset attempts per hour
  message: 'Too many password reset attempts, please try again later.',
  prefix: 'rl:password-reset:',
});

// Post creation rate limiter
const createPostLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 posts per hour
  message: 'You are creating posts too quickly, please slow down.',
  prefix: 'rl:create-post:',
});

// Comment rate limiter
const commentLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 comments per minute
  message: 'You are commenting too quickly, please slow down.',
  prefix: 'rl:comment:',
});

// Message rate limiter
const messageLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: 'You are sending messages too quickly, please slow down.',
  prefix: 'rl:message:',
});

// Like/Unlike rate limiter
const interactionLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 interactions per minute
  message: 'You are interacting too quickly, please slow down.',
  prefix: 'rl:interaction:',
});

// Follow/Unfollow rate limiter
const followLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 follows per hour
  message: 'You are following/unfollowing too quickly, please slow down.',
  prefix: 'rl:follow:',
});

// Search rate limiter
const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests, please slow down.',
  prefix: 'rl:search:',
});

// File upload rate limiter
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Too many file uploads, please try again later.',
  prefix: 'rl:upload:',
});

// General API rate limiter
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: 'Too many requests, please try again later.',
  prefix: 'rl:general:',
});

// Report rate limiter
const reportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 reports per hour
  message: 'Too many reports, please try again later.',
  prefix: 'rl:report:',
});

// Story creation rate limiter
const storyLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 stories per hour
  message: 'You are creating stories too quickly, please slow down.',
  prefix: 'rl:story:',
});

// Admin actions rate limiter (looser)
const adminLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 admin actions per minute
  message: 'Too many admin actions, please slow down.',
  prefix: 'rl:admin:',
  skip: (req) => process.env.NODE_ENV === 'development',
});

// Dynamic rate limiter based on user role
const dynamicRateLimiter = (limits) => {
  return (req, res, next) => {
    const userRole = req.user?.role || 'guest';
    const limit = limits[userRole] || limits.default || 100;

    const limiter = createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: limit,
      prefix: `rl:dynamic:${userRole}:`,
    });

    return limiter(req, res, next);
  };
};

// Cleanup function for graceful shutdown
const closeRateLimiter = async () => {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info('Redis rate limiter connection closed');
    } catch (err) {
      logger.error('Error closing Redis connection', err);
    }
  }
};

// Get rate limit info for user
const getRateLimitInfo = async (userId, prefix = 'rl:') => {
  if (!redisClient || !redisClient.isOpen) {
    return null;
  }

  try {
    const key = `${prefix}${userId}`;
    const ttl = await redisClient.ttl(key);
    const count = await redisClient.get(key);

    return {
      remaining: count ? parseInt(count) : 0,
      resetIn: ttl > 0 ? ttl : 0
    };
  } catch (err) {
    logger.error('Error getting rate limit info', err);
    return null;
  }
};

// Reset rate limit for user (admin function)
const resetRateLimit = async (userId, prefix = 'rl:') => {
  if (!redisClient || !redisClient.isOpen) {
    return false;
  }

  try {
    const key = `${prefix}${userId}`;
    await redisClient.del(key);
    logger.info('Rate limit reset', { userId, prefix });
    return true;
  } catch (err) {
    logger.error('Error resetting rate limit', err);
    return false;
  }
};

module.exports = {
  createRateLimiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  createPostLimiter,
  commentLimiter,
  messageLimiter,
  interactionLimiter,
  followLimiter,
  searchLimiter,
  uploadLimiter,
  generalLimiter,
  reportLimiter,
  storyLimiter,
  adminLimiter,
  dynamicRateLimiter,
  closeRateLimiter,
  getRateLimitInfo,
  resetRateLimit,
  redisClient
};