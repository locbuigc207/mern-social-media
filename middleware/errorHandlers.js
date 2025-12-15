const logger = require('../utils/logger');

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('Async handler error', error, {
        url: req.originalUrl,
        method: req.method,
        userId: req.user?._id
      });
      
      res.status(500).json({ 
        msg: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    });
  };
};

const errorHandler = (err, req, res, next) => {
  logger.error('Global error handler', err, {
    url: req.originalUrl,
    method: req.method,
    userId: req.user?._id
  });

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      msg: 'Validation Error',
      errors 
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({ 
      msg: `${field} already exists` 
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ msg: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ msg: 'Token expired' });
  }

  res.status(err.statusCode || 500).json({ 
    msg: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = {
  asyncHandler,
  errorHandler,
  notFound
};