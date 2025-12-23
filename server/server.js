require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const { createServer } = require("http");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

const logger = require("./utils/logger");
const shutdownManager = require("./utils/shutdown");
const {
  startPostScheduler,
  stopScheduler: stopPostScheduler,
} = require("./utils/postScheduler");
const {
  startCleanupSchedulers,
  stopCleanupSchedulers,
} = require("./utils/cleanupScheduler");
const { closeRateLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const notificationService = require("./services/notificationService");

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://res.cloudinary.com",
          "http://localhost:4000",
          "http://localhost:5000",
        ],
        connectSrc: [
          "'self'",
          "ws:",
          "wss:",
          process.env.CLIENT_URL || "http://localhost:3000",
          "http://localhost:5173",
        ],
        mediaSrc: ["'self'", "https://res.cloudinary.com", "blob:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(mongoSanitize({ replaceWith: "_" }));
app.use(xss());

const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        logger.warn("CORS blocked request from origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(cookieParser());

if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      res.redirect(`https://${req.header("host")}${req.url}`);
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
    environment: process.env.NODE_ENV || "development",
    services: {
      mongodb:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      redis: "not-checked",
      cloudinary: "not-checked",
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
    },
  };

  try {
    const { redisClient } = require("./middleware/rateLimiter");
    if (redisClient && redisClient.isOpen) {
      await redisClient.ping();
      health.services.redis = "connected";
    } else {
      health.services.redis = "disconnected";
    }
  } catch (err) {
    health.services.redis = "error";
    logger.error("Redis health check failed:", err);
  }

  try {
    const cloudinary = require("cloudinary").v2;
    await cloudinary.api.ping();
    health.services.cloudinary = "connected";
  } catch (err) {
    health.services.cloudinary = "error";
    logger.error("Cloudinary health check failed:", err);
  }

  const allServicesHealthy =
    health.services.mongodb === "connected" &&
    (health.services.redis === "connected" ||
      health.services.redis === "disconnected");

  res.status(allServicesHealthy ? 200 : 503).json(health);
});

app.get("/api", (req, res) => {
  res.json({
    message: "Social Network API is running!",
    version: "1.0.0",
    endpoints: {
      auth: "/api/register, /api/login, /api/logout",
      users: "/api/user/:id, /api/search",
      posts: "/api/posts, /api/post/:id",
      comments: "/api/comment",
    },
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Social Media API Server",
    status: "running",
    version: "3.0.0",
    endpoints: {
      health: "/health",
      api: "/api"
    }
  });
});

// Routes
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
app.use("/api", require("./routes/friendRouter"));
app.use("/api", require("./routes/collectionRouter"));
app.use("/api", require("./routes/searchRouter"));
app.use("/api", require("./routes/settingsRouter"));
app.use("/api", require("./routes/profileRouter"));
app.use("/api", require("./routes/discoveryRouter"));
app.use("/api", require("./routes/analyticsRouter"));

// Location routes
const locationRouter = require("express").Router();
const locationCtrl = require("./controllers/locationCtrl");
const { auth } = require("./middleware/auth");
const { searchLimiter } = require("./middleware/rateLimiter");
const { validatePagination } = require("./middleware/validation");

locationRouter.get(
  "/location/nearby/posts",
  auth,
  searchLimiter,
  validatePagination,
  locationCtrl.getNearbyPosts
);

locationRouter.get(
  "/location/nearby/users",
  auth,
  searchLimiter,
  locationCtrl.getNearbyUsers
);

locationRouter.get(
  "/location/posts",
  auth,
  validatePagination,
  locationCtrl.getPostsByLocation
);

app.use("/api", locationRouter);

app.use(notFound);
app.use(errorHandler);

const validateEnv = () => {
  const required = [
    "MONGODB_URL",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "JWT_SECRET",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  const defaults = [
    {
      key: "ACCESS_TOKEN_SECRET",
      default: "your_access_token_secret_here_change_this",
    },
    {
      key: "REFRESH_TOKEN_SECRET",
      default: "your_refresh_token_secret_here_change_this",
    },
    {
      key: "JWT_SECRET",
      default: "your_secret_key_here_make_it_long_and_random",
    },
  ];

  for (const { key, default: defaultValue } of defaults) {
    if (process.env[key] === defaultValue) {
      throw new Error(`${key} must be changed from default value`);
    }

    if (process.env[key].length < 32) {
      throw new Error(`${key} must be at least 32 characters long`);
    }
  }

  if (
    !process.env.MONGODB_URL.startsWith("mongodb://") &&
    !process.env.MONGODB_URL.startsWith("mongodb+srv://")
  ) {
    throw new Error("Invalid MONGODB_URL format");
  }

  if (process.env.NODE_ENV === "production") {
    const cloudinaryRequired = [
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ];
    const cloudinaryMissing = cloudinaryRequired.filter(
      (key) => !process.env[key]
    );

    if (cloudinaryMissing.length > 0) {
      logger.warn(`Cloudinary not configured: ${cloudinaryMissing.join(", ")}`);
    }
  }

  logger.info("Environment variables validated");
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
        family: 4,
      });

      logger.info("MongoDB Connected Successfully");
      return;
    } catch (error) {
      logger.error(
        `MongoDB Connection Attempt ${i + 1}/${retries} Failed:`,
        error
      );

      if (i === retries - 1) {
        logger.error("Failed to connect to MongoDB after maximum retries");
        process.exit(1);
      }

      const waitTime = 5000 * (i + 1);
      logger.info(`Retrying in ${waitTime / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
};

mongoose.connection.on("connected", () => {
  logger.info("Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  logger.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  logger.warn("Mongoose disconnected from MongoDB");
});

const httpServer = createServer(app);
const SocketServer = require("./socketServer");
let io = null;

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const fs = require("fs");
    ["logs", "uploads", "temp"].forEach((dir) => {
      const dirPath = path.join(__dirname, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
    });

    const server = httpServer.listen(PORT, () => {
      logger.info("=====================================");
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(
        `Client URL: ${process.env.CLIENT_URL || "http://localhost:3000"}`
      );
      logger.info("=====================================");
    });

    io = SocketServer(httpServer);
    logger.info("Socket.IO: Enabled");

    notificationService.initialize(io);
    logger.info(" NotificationService initialized");

    shutdownManager.register("http", async () => {
      return new Promise((resolve) => {
        server.close(() => {
          logger.info("HTTP server closed");
          resolve();
        });
      });
    });

    shutdownManager.register("socketio", async () => {
      if (io && io.shutdown) {
        await io.shutdown();
      }
    });

    shutdownManager.register("mongodb", async () => {
      await mongoose.connection.close(false);
      logger.info("MongoDB connection closed");
    });

    shutdownManager.register("redis", async () => {
      await closeRateLimiter();
      logger.info("Redis connection closed");
    });

    shutdownManager.register("postScheduler", async () => {
      await stopPostScheduler();
      logger.info("Post scheduler stopped");
    });

    shutdownManager.register("cleanupSchedulers", async () => {
      stopCleanupSchedulers();
      logger.info("Cleanup schedulers stopped");
    });

    await startPostScheduler(io);
    startCleanupSchedulers();

    logger.info("All systems initialized successfully");
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  try {
    await shutdownManager.shutdown();
    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  shutdown("unhandledRejection");
});

startServer();

module.exports = app;