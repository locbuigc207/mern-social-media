require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const { createServer } = require("http");
const helmet = require("helmet");
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const logger = require("./utils/logger");
const shutdownManager = require("./utils/shutdown");
const { startPostScheduler, stopScheduler: stopPostScheduler } = require("./utils/postScheduler");
const { startCleanupSchedulers, stopCleanupSchedulers } = require("./utils/cleanupScheduler");
const { closeRateLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", process.env.CLIENT_URL || "http://localhost:3000"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(xss());

const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://localhost:3000",
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/health", async (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: 'not-checked',
      cloudinary: 'not-checked'
    }
  };
  
  try {
    const { redisClient } = require('./middleware/rateLimiter');
    if (redisClient && redisClient.isOpen) {
      await redisClient.ping();
      health.services.redis = 'connected';
    } else {
      health.services.redis = 'disconnected';
    }
  } catch (err) {
    health.services.redis = 'error';
  }
  
  try {
    const cloudinary = require('cloudinary').v2;
    await cloudinary.api.ping();
    health.services.cloudinary = 'connected';
  } catch (err) {
    health.services.cloudinary = 'error';
  }
  
  const allServicesHealthy = 
    health.services.mongodb === 'connected' &&
    (health.services.redis === 'connected' || health.services.redis === 'disconnected'); // Redis is optional
  
  res.status(allServicesHealthy ? 200 : 503).json(health);
});

app.use("/api", require("./routes/authRouter"));
app.use("/api", require("./routes/userRouter"));
app.use("/api", require("./routes/postRouter"));
app.use("/api", require("./routes/commentRouter"));
app.use("/api", require("./routes/notifyRouter"));
app.use("/api", require("./routes/messageRouter"));
app.use("/api", require("./routes/adminRouter"));
app.use("/api", require("./routes/storyRouter"));
app.use("/api", require("./routes/groupRouter"));
app.use("/api", require("./routes/hashtagRouter"));

app.use(notFound);

app.use(errorHandler);

const validateEnv = () => {
  const required = [
    'MONGODB_URL',
    'ACCESS_TOKEN_SECRET',
    'REFRESH_TOKEN_SECRET',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  }

  const defaults = [
    { key: 'ACCESS_TOKEN_SECRET', default: 'your_access_token_secret_here_change_this' },
    { key: 'REFRESH_TOKEN_SECRET', default: 'your_refresh_token_secret_here_change_this' },
    { key: 'JWT_SECRET', default: 'your_secret_key_here_make_it_long_and_random' }
  ];

  for (const { key, default: defaultValue } of defaults) {
    if (process.env[key] === defaultValue) {
      throw new Error(`❌ ${key} must be changed from default value`);
    }
  }

  if (!process.env.MONGODB_URL.startsWith('mongodb://') && 
      !process.env.MONGODB_URL.startsWith('mongodb+srv://')) {
    throw new Error(' Invalid MONGODB_URL format');
  }

  logger.info(' Environment variables validated');
};

const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      validateEnv();

      await mongoose.connect(process.env.MONGODB_URL, {
        maxPoolSize: 50,
        minPoolSize: 10,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
        family: 4
      });
      
      logger.info(" MongoDB Connected Successfully");
      return;
    } catch (error) {
      logger.error(` MongoDB Connection Attempt ${i + 1}/${retries} Failed:`, error);
      
      if (i === retries - 1) {
        logger.error(" Failed to connect to MongoDB after maximum retries");
        process.exit(1);
      }
      
      const waitTime = 5000 * (i + 1); 
      logger.info(`⏳ Retrying in ${waitTime / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

mongoose.connection.on("connected", () => {
  logger.info("✅ Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  logger.error("❌ Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  logger.warn("⚠️ Mongoose disconnected from MongoDB");
});

const httpServer = createServer(app);
const SocketServer = require("./socketServer");
const io = SocketServer(httpServer);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const fs = require('fs');
    ['logs', 'uploads', 'temp'].forEach(dir => {
      const dirPath = path.join(__dirname, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`📁 Created directory: ${dir}`);
      }
    });

    const server = httpServer.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
      logger.info(`📡 Socket.IO: Enabled`);
    });

    shutdownManager.register('http', async () => {
      return new Promise((resolve) => {
        server.close(() => {
          logger.info('✅ HTTP server closed');
          resolve();
        });
      });
    });

    shutdownManager.register('mongodb', async () => {
      await mongoose.connection.close(false);
      logger.info(' MongoDB connection closed');
    });

    shutdownManager.register('redis', async () => {
      await closeRateLimiter();
      logger.info(' Redis connection closed');
    });

    shutdownManager.register('postScheduler', async () => {
      await stopPostScheduler();
      logger.info(' Post scheduler stopped');
    });

    shutdownManager.register('cleanupSchedulers', async () => {
      stopCleanupSchedulers();
      logger.info(' Cleanup schedulers stopped');
    });

    await startPostScheduler(io);
    startCleanupSchedulers();

    logger.info(' All systems initialized successfully');
    logger.info('=====================================');
    
  } catch (error) {
    logger.error(' Failed to start server:', error);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info(`\n⚠️ ${signal} received. Starting graceful shutdown...`);
  
  try {
    await shutdownManager.shutdown();
    logger.info(' Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error(' Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

const SHUTDOWN_TIMEOUT = 15000;
const forceShutdownTimer = setTimeout(() => {
  logger.error('❌ Forced shutdown after timeout');
  process.exit(1);
}, SHUTDOWN_TIMEOUT);
forceShutdownTimer.unref();

startServer();

module.exports = app;