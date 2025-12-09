require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const SocketServer = require('./socketServer');
const { startScheduler } = require('./utils/postScheduler');
const { startCleanupSchedulers } = require('./utils/cleanupScheduler');
const logger = require('./utils/logger');

const corsOptions = {
  Credential: 'true',
};

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = req.user?._id || 'anonymous';
    logger.request(req.method, req.originalUrl, userId, res.statusCode, duration);
  });
  
  next();
});

app.use(express.json({ limit: '10mb' }))
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));
app.use(cookieParser())

const http = require('http').createServer(app);
const io = require('socket.io')(http);

io.on('connection', socket => {
    SocketServer(socket);
})

// Routes
app.use('/api', require('./routes/authRouter'));
app.use('/api', require('./routes/userRouter'));
app.use('/api', require('./routes/postRouter'));
app.use('/api', require('./routes/commentRouter'));
app.use('/api', require('./routes/adminRouter'));
app.use('/api', require('./routes/notifyRouter'));
app.use('/api', require('./routes/messageRouter'));
app.use('/api', require('./routes/storyRouter'));
app.use('/api', require('./routes/groupRouter'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
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
    useCreateIndex: true,
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true
}, err => {
    if (err) {
      logger.error('Database connection failed', err);
      throw err;
    }
    logger.info('✅ Database Connected!');
    
    // Start schedulers
    startScheduler();
    startCleanupSchedulers();
})

const port = process.env.PORT || 8080;
http.listen(port, () => {
  logger.info(`✅ Server listening on port ${port}`);
});