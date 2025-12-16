const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

let redisClient = null;

if (process.env.REDIS_URL) {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    legacyMode: true
  });

  redisClient.connect().catch(err => {
    console.error('Redis connection failed:', err);
    redisClient = null;
  });

  const cleanupRedis = async () => {
    if (redisClient) {
      try {
        await redisClient.quit();
        console.log('Redis connection closed');
      } catch (err) {
        console.error('Error closing Redis:', err);
      }
    }
  };

  process.on('SIGTERM', cleanupRedis);
  process.on('SIGINT', cleanupRedis);
}

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    msg: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:general:'
  }) : undefined
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    msg: 'Too many attempts, please try again later.',
    retryAfter: '1 hour'
  },
  skipSuccessfulRequests: true,
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:strict:'
  }) : undefined
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    msg: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true,
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }) : undefined
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    msg: 'Upload limit exceeded, please try again later.',
    retryAfter: '1 hour'
  },
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:upload:'
  }) : undefined
});

const createPostLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    msg: 'You are posting too frequently, please slow down.',
    retryAfter: '1 hour'
  },
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:post:'
  }) : undefined
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    msg: 'You are sending messages too quickly.',
    retryAfter: '1 minute'
  },
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:message:'
  }) : undefined
});

const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    msg: 'You are commenting too frequently.',
    retryAfter: '1 minute'
  },
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:comment:'
  }) : undefined
});

const followLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: {
    msg: 'Too many follow/unfollow actions.',
    retryAfter: '1 hour'
  },
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:follow:'
  }) : undefined
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    msg: 'Too many search requests.',
    retryAfter: '1 minute'
  },
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:search:'
  }) : undefined
});

const dynamicLimiter = (limits = {}) => {
  const defaultLimits = {
    user: { windowMs: 60 * 60 * 1000, max: 100 },
    admin: { windowMs: 60 * 60 * 1000, max: 1000 },
    guest: { windowMs: 60 * 60 * 1000, max: 20 }
  };

  const mergedLimits = { ...defaultLimits, ...limits };

  return rateLimit({
    windowMs: (req) => {
      const role = req.user?.role || 'guest';
      return mergedLimits[role]?.windowMs || mergedLimits.guest.windowMs;
    },
    max: (req) => {
      const role = req.user?.role || 'guest';
      return mergedLimits[role]?.max || mergedLimits.guest.max;
    },
    message: {
      msg: 'Rate limit exceeded for your account type.',
    },
    keyGenerator: (req) => {
      return req.user?._id?.toString() || req.ip;
    },
    store: redisClient ? new RedisStore({
      client: redisClient,
      prefix: 'rl:dynamic:'
    }) : undefined
  });
};

const ipLimiter = (whitelist = []) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    skip: (req) => {
      const ip = req.ip || req.connection.remoteAddress;
      return whitelist.includes(ip);
    },
    message: {
      msg: 'Too many requests from this IP address.'
    }
  });
};

module.exports = {
  generalLimiter,
  strictLimiter,
  authLimiter,
  uploadLimiter,
  createPostLimiter,
  messageLimiter,
  commentLimiter,
  followLimiter,
  searchLimiter,
  dynamicLimiter,
  ipLimiter
};