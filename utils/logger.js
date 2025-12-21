const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');
if (!fsSync.existsSync(logsDir)) {
  fsSync.mkdirSync(logsDir, { recursive: true });
}

const MAX_LOG_SIZE = 10 * 1024 * 1024;
const MAX_LOG_FILES = 5;

const writeQueue = [];
let isWriting = false;

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

const rotateLog = async (filename) => {
  const filepath = path.join(logsDir, filename);
  
  try {
    const stats = await fs.stat(filepath);
    
    if (stats.size > MAX_LOG_SIZE) {
      for (let i = MAX_LOG_FILES - 1; i > 0; i--) {
        const oldFile = path.join(logsDir, `${filename}.${i}`);
        const newFile = path.join(logsDir, `${filename}.${i + 1}`);
        
        try {
          await fs.access(oldFile);
          if (i === MAX_LOG_FILES - 1) {
            await fs.unlink(oldFile);
          } else {
            await fs.rename(oldFile, newFile);
          }
        } catch (err) {
        }
      }
      
      await fs.rename(filepath, path.join(logsDir, `${filename}.1`));
    }
  } catch (err) {
  }
};

const writeToFile = async (filename, content) => {
  writeQueue.push({ filename, content });
  
  if (!isWriting) {
    isWriting = true;
    await processWriteQueue();
  }
};

const processWriteQueue = async () => {
  while (writeQueue.length > 0) {
    const { filename, content } = writeQueue.shift();
    
    try {
      await rotateLog(filename);
      const filepath = path.join(logsDir, filename);
      await fs.appendFile(filepath, content);
    } catch (err) {
      console.error(`Failed to write to ${filename}:`, err.message);
    }
  }
  
  isWriting = false;
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
    console.error(` ${message}`, errorMeta);
    writeToFile('error.log', log);
  },

  warn: (message, meta = {}) => {
    const log = formatLog('WARN', message, meta);
    console.warn(`  ${message}`, meta);
    writeToFile('warn.log', log);
  },

  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const log = formatLog('DEBUG', message, meta);
      console.debug(`🔍 ${message}`, meta);
      writeToFile('debug.log', log);
    }
  },

  audit: (action, userId, meta = {}) => {
    const log = formatLog('AUDIT', action, {
      userId,
      ...meta
    });
    console.log(` ${action}`, { userId, ...meta });
    writeToFile('audit.log', log);
  },

  request: (method, url, userId, statusCode, responseTime) => {
    const log = formatLog('REQUEST', `${method} ${url}`, {
      userId,
      statusCode,
      responseTime: `${responseTime}ms`
    });
    writeToFile('requests.log', log);
  },

  flush: async () => {
    if (writeQueue.length > 0) {
      await processWriteQueue();
    }
  }
};

module.exports = logger;