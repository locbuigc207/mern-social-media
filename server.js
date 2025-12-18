require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const { createServer } = require("http");
const SocketServer = require("./socketServer");
const logger = require("./utils/logger");

// ✅ Import shutdown manager and schedulers
const shutdownManager = require("./utils/shutdown");
const { startPostScheduler, stopScheduler: stopPostScheduler } = require("./utils/postScheduler");
const { startCleanupSchedulers, stopCleanupSchedulers } = require("./utils/cleanupScheduler");
const { closeRateLimiter } = require("./middleware/rateLimiter");

// ✅ Import centralized error handler
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(cookieParser());

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

// ✅ Use centralized error handler
app.use(errorHandler);

// Database Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info("MongoDB Connected Successfully");
  } catch (error) {
    logger.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

// Mongoose connection events
mongoose.connection.on("connected", () => {
  logger.info("Mongoose connected to DB");
});

mongoose.connection.on("error", (err) => {
  logger.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  logger.warn("Mongoose disconnected from DB");
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
SocketServer(httpServer);

// Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start HTTP server
    const server = httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

    // ✅ Register resources for graceful shutdown
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

    // Start schedulers
    await startPostScheduler();
    startCleanupSchedulers();

    logger.info('All systems initialized successfully');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ✅ Graceful shutdown handlers
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

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

// ✅ Force exit after timeout
const SHUTDOWN_TIMEOUT = 15000; // 15 seconds
const forceShutdownTimer = setTimeout(() => {
  logger.error('Forced shutdown after timeout');
  process.exit(1);
}, SHUTDOWN_TIMEOUT);

// Don't keep the process running if this is the only timer
forceShutdownTimer.unref();

// Start the application
startServer();

// Export for testing
module.exports = app;