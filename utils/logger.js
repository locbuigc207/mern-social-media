const fs = require('fs');
const path = require('path');

// Create logs directory if not exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const getTimestamp = () => {
  return new Date().toISOString();
};

const formatLog = (level, message, meta = {}) => {
  return JSON.stringify({
    timestamp: getTimestamp(),
    level,
    message,
    ...meta
  }) + '\n';
};

const writeToFile = (filename, content) => {
  const filepath = path.join(logsDir, filename);
  fs.appendFileSync(filepath, content);
};

const logger = {
  info: (message, meta = {}) => {
    const log = formatLog('INFO', message, meta);
    console.log(`ℹ️  ${message}`, meta);
    writeToFile('info.log', log);
  },

  error: (message, error = null, meta = {}) => {
    const errorMeta = error ? {
      error: error.message,
      stack: error.stack,
      ...meta
    } : meta;
    
    const log = formatLog('ERROR', message, errorMeta);
    console.error(`❌ ${message}`, errorMeta);
    writeToFile('error.log', log);
  },

  warn: (message, meta = {}) => {
    const log = formatLog('WARN', message, meta);
    console.warn(`⚠️  ${message}`, meta);
    writeToFile('warn.log', log);
  },

  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const log = formatLog('DEBUG', message, meta);
      console.debug(`🔍 ${message}`, meta);
      writeToFile('debug.log', log);
    }
  },

  // Log user actions for audit
  audit: (action, userId, meta = {}) => {
    const log = formatLog('AUDIT', action, {
      userId,
      ...meta
    });
    console.log(`📝 ${action}`, { userId, ...meta });
    writeToFile('audit.log', log);
  },

  // Log API requests
  request: (method, url, userId, statusCode, responseTime) => {
    const log = formatLog('REQUEST', `${method} ${url}`, {
      userId,
      statusCode,
      responseTime: `${responseTime}ms`
    });
    writeToFile('requests.log', log);
  }
};

module.exports = logger;