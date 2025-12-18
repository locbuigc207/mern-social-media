require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const { createServer } = require("http");
const helmet = require("helmet");
const SocketServer = require("./socketServer");
const logger = require("./utils/logger");

const shutdownManager = require("./utils/shutdown");
const { startPostScheduler, stopScheduler: stopPostScheduler } = require("./utils/postScheduler");
const { startCleanupSchedulers, stopCleanupSchedulers } = require("./utils/cleanupScheduler");
const { closeRateLimiter } = require("./middleware/rateLimiter");

const { errorHandler } = require("./middleware/errorHandler");

const app = express();

// ✅ FIXED: Add security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// ✅ FIXED: Add input sanitization
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ✅ Apply sanitization
app.use(mongoSanitize({
  replaceWith: '_'
}));
app.use(xss());

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(cookieParser());

// ✅ HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
    path: req.originalUrl
  });
});

app.use(errorHandler);

// ✅ FIXED: Add connection pooling and better configuration
const connectDB = async () => {
  try {
    // ✅ Validate environment variables
    if (!process.env.MONGODB_URL) {
      throw new Error('MONGODB_URL is not defined in environment variables');
    }

    if (!process.env.ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET === 'your_access_token_secret_here_change_this') {
      throw new Error('ACCESS_TOKEN_SECRET must be changed from default value');
    }

    if (!process.env.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET === 'your_refresh_token_secret_here_change_this') {
      throw new Error('REFRESH_TOKEN_SECRET must be changed from default value');
    }

    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // ✅ FIXED: Add connection pooling
      maxPoolSize: 50,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4
    });
    
    logger.info("MongoDB Connected Successfully");
  } catch (error) {
    logger.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

mongoose.connection.on("connected", () => {
  logger.info("Mongoose connected to DB");
});

mongoose.connection.on("error", (err) => {
  logger.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  logger.warn("Mongoose disconnected from DB");
});

const httpServer = createServer(app);

SocketServer(httpServer);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const server = httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

    shutdownManager.register('http', async () => {
      return new Promise((resolve) => {
        server.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });
    });

    shutdownManager.register('mongodb', async () => {
      await mongoose.connection.close(false);
      logger.info('MongoDB connection closed');
    });

    shutdownManager.register('redis', async () => {
      await closeRateLimiter();
      logger.info('Redis connection closed');
    });

    shutdownManager.register('postScheduler', async () => {
      await stopPostScheduler();
      logger.info('Post scheduler stopped');
    });

    shutdownManager.register('cleanupSchedulers', async () => {
      stopCleanupSchedulers();
      logger.info('Cleanup schedulers stopped');
    });

    await startPostScheduler();
    startCleanupSchedulers();

    logger.info('All systems initialized successfully');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  try {
    await shutdownManager.shutdown();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

const SHUTDOWN_TIMEOUT = 15000;
const forceShutdownTimer = setTimeout(() => {
  logger.error('Forced shutdown after timeout');
  process.exit(1);
}, SHUTDOWN_TIMEOUT);

forceShutdownTimer.unref();

startServer();

module.exports = app;