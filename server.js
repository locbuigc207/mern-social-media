require('dotenv').config();

const validateEnv = () => {
  const required = [
    'MONGODB_URL',
    'ACCESS_TOKEN_SECRET',
    'REFRESH_TOKEN_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'EMAIL_USERNAME',
    'EMAIL_PASSWORD'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(' Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  
  console.log(' Environment variables validated');
};

validateEnv();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const SocketServer = require('./socketServer');
const { startScheduler } = require('./utils/postScheduler');
const { startCleanupSchedulers } = require('./utils/cleanupScheduler');
const logger = require('./utils/logger');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.disable('x-powered-by');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { msg: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
};

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = req.user?._id || 'anonymous';
    logger.request(req.method, req.originalUrl, userId, res.statusCode, duration);
  });
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use('/api/', limiter);

const http = require('http').createServer(app);

const io = require('socket.io')(http, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', socket => {
  SocketServer(socket);
});

app.use('/api', require('./routes/authRouter'));
app.use('/api', require('./routes/userRouter'));
app.use('/api', require('./routes/postRouter'));
app.use('/api', require('./routes/commentRouter'));
app.use('/api', require('./routes/adminRouter'));
app.use('/api', require('./routes/notifyRouter'));
app.use('/api', require('./routes/messageRouter'));
app.use('/api', require('./routes/storyRouter'));
app.use('/api', require('./routes/groupRouter'));
app.use('/api', require('./routes/hashtagRouter'));

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', err, {
    url: req.originalUrl,
    method: req.method,
    userId: req.user?._id
  });
  
  res.status(500).json({ 
    msg: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const URI = process.env.MONGODB_URL;
mongoose.connect(URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}, err => {
  if (err) {
    logger.error('Database connection failed', err);
    throw err;
  }
  logger.info('✅ Database Connected!');
  
  startScheduler();
  startCleanupSchedulers();
});

const port = process.env.PORT || 8080;
http.listen(port, () => {
  logger.info(`✅ Server listening on port ${port}`);
});

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} signal received: closing HTTP server`);
  logger.info(`${signal} signal received: closing HTTP server`);
  
  http.close(() => {
    logger.info('HTTP server closed');
    
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)));
  process.exit(1);
});