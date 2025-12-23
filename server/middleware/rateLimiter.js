const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const redis = require("redis");
const logger = require("../utils/logger");
const { RateLimitError } = require("../utils/AppError");

let redisClient = null;
let isRedisAvailable = false;
let reconnectAttempts = 0; 
const MAX_RECONNECT_ATTEMPTS = 10;

const initializeRedis = async () => {
  if (process.env.REDIS_URL) {
    try {
      redisClient = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            reconnectAttempts = retries;
            
            if (retries > MAX_RECONNECT_ATTEMPTS) {
              logger.error(`Redis reconnection failed after ${MAX_RECONNECT_ATTEMPTS} attempts`);
              isRedisAvailable = false;
              return new Error('Redis reconnection failed');
            }
            
            const delay = Math.min(retries * 100, 3000);
            logger.info(`Redis reconnecting in ${delay}ms (attempt ${retries}/${MAX_RECONNECT_ATTEMPTS})`);
            return delay;
          },
          connectTimeout: 10000,
        }
      });

      redisClient.on('error', (err) => {
        logger.error('Redis Client Error', err);
        isRedisAvailable = false;
        
        if (err.code === 'ECONNREFUSED') {
          logger.warn('Redis connection refused - falling back to memory store');
        }
      });

      redisClient.on('connect', () => {
        logger.info('Redis connecting...');
        reconnectAttempts = 0;
      });

      redisClient.on('ready', () => {
        logger.info(' Redis connected and ready for rate limiting');
        isRedisAvailable = true;
        reconnectAttempts = 0;
      });

      redisClient.on('end', () => {
        logger.warn(' Redis connection closed');
        isRedisAvailable = false;
      });

      redisClient.on('reconnecting', () => {
        logger.info(` Redis reconnecting (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        isRedisAvailable = false;
      });

      const connectPromise = redisClient.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 10000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      
    } catch (err) {
      logger.error('Failed to connect to Redis', err);
      redisClient = null;
      isRedisAvailable = false;
      
      logger.warn(' Continuing without Redis - using memory-based rate limiting');
    }
  } else {
    logger.info(' REDIS_URL not configured - using memory-based rate limiting');
  }
};

initializeRedis();

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

const createRateLimiter = (options) => {
  const config = {
    windowMs: options.windowMs || 15 * 60 * 1000, 
    max: options.max || 100,
    message: options.message || 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: options.handler || defaultHandler,
    skip: options.skip || ((req) => {
      if (process.env.NODE_ENV === 'development' && req.user?.role === 'admin') {
        return true;
      }
      return false;
    }),
    keyGenerator: options.keyGenerator || ((req) => {
      return req.user?._id?.toString() || req.ip;
    })
  };

  if (redisClient && isRedisAvailable) {
    try {
      config.store = new RedisStore({
        client: redisClient,
        prefix: options.prefix || 'rl:',
        sendCommand: async (...args) => {
          try {
            return await redisClient.sendCommand(args);
          } catch (err) {
            logger.error('Redis store command failed', err);
            isRedisAvailable = false;
            throw err;
          }
        }
      });
    } catch (err) {
      logger.warn('Failed to create Redis store, falling back to memory store', err);
      isRedisAvailable = false;
    }
  }

  const limiter = rateLimit(config);
  
  return (req, res, next) => {
    limiter(req, res, (err) => {
      if (err) {
        if (err.message && err.message.includes('Redis')) {
          logger.warn('Rate limiter store error, request allowed', {
            error: err.message,
            path: req.path
          });
          return next(); 
        }
      }
      next(err);
    });
  };
};

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
  prefix: 'rl:auth:',
  skipSuccessfulRequests: true,
});

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many accounts created, please try again later.',
  prefix: 'rl:register:',
  keyGenerator: (req) => req.ip,
});

const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many password reset attempts, please try again later.',
  prefix: 'rl:password-reset:',
});

const createPostLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: 'You are creating posts too quickly, please slow down.',
  prefix: 'rl:create-post:',
});

const commentLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'You are commenting too quickly, please slow down.',
  prefix: 'rl:comment:',
});

const messageLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'You are sending messages too quickly, please slow down.',
  prefix: 'rl:message:',
});

const interactionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'You are interacting too quickly, please slow down.',
  prefix: 'rl:interaction:',
});

const followLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: 'You are following/unfollowing too quickly, please slow down.',
  prefix: 'rl:follow:',
});

const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many search requests, please slow down.',
  prefix: 'rl:search:',
});

const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: 'Too many file uploads, please try again later.',
  prefix: 'rl:upload:',
});

const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests, please try again later.',
  prefix: 'rl:general:',
});

const reportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many reports, please try again later.',
  prefix: 'rl:report:',
});

const storyLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: 'You are creating stories too quickly, please slow down.',
  prefix: 'rl:story:',
});

const adminLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many admin actions, please slow down.',
  prefix: 'rl:admin:',
  skip: (req) => process.env.NODE_ENV === 'development',
});

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

const closeRateLimiter = async () => {
  if (redisClient) {
    try {
      logger.info('Closing Redis rate limiter connection...');
      
      if (redisClient.isOpen) {
        await redisClient.quit();
        logger.info(' Redis rate limiter connection closed gracefully');
      } else {
        logger.info('ℹ Redis already closed');
      }
    } catch (err) {
      logger.error('Error closing Redis connection', err);
      try {
        await redisClient.disconnect();
        logger.info(' Redis forcefully disconnected');
      } catch (disconnectErr) {
        logger.error('Error forcing Redis disconnect', disconnectErr);
      }
    } finally {
      redisClient = null;
      isRedisAvailable = false;
      reconnectAttempts = 0;
    }
  }
};

const getRateLimitInfo = async (userId, prefix = 'rl:') => {
  if (!redisClient || !isRedisAvailable) {
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

const resetRateLimit = async (userId, prefix = 'rl:') => {
  if (!redisClient || !isRedisAvailable) {
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

const getRedisHealth = () => {
  return {
    available: isRedisAvailable,
    connected: redisClient?.isOpen || false,
    reconnectAttempts,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS
  };
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
  getRedisHealth, 
  redisClient,
  isRedisAvailable
};