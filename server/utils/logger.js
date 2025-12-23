const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');
if (!fsSync.existsSync(logsDir)) {
  fsSync.mkdirSync(logsDir, { recursive: true });
}

const MAX_LOG_SIZE = 10 * 1024 * 1024;
const MAX_LOG_FILES = 5;
const MAX_QUEUE_SIZE = 1000; 

const writeQueue = [];
let isWriting = false;
let failedWrites = 0; 

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
  if (writeQueue.length >= MAX_QUEUE_SIZE) {
    console.error(`⚠️ Log queue full (${MAX_QUEUE_SIZE}), dropping oldest log`);
    writeQueue.shift();
  }

  writeQueue.push({ filename, content, retries: 0 });
  
  if (!isWriting) {
    isWriting = true;
    await processWriteQueue();
  }
};

const processWriteQueue = async () => {
  while (writeQueue.length > 0) {
    const logEntry = writeQueue[0];
    const { filename, content, retries } = logEntry;
    
    try {
      await rotateLog(filename);
      const filepath = path.join(logsDir, filename);
      
      await fs.appendFile(filepath, content, { flag: 'a' });
      
      writeQueue.shift();
      failedWrites = 0;
    } catch (err) {
      console.error(` Failed to write to ${filename}:`, err.message);
      
      if (retries < 3) {
        logEntry.retries += 1;
        writeQueue[0] = logEntry;
        
        await new Promise(resolve => 
          setTimeout(resolve, 100 * Math.pow(5, retries))
        );
      } else {
        console.error(`⚠️ Dropping log after 3 failed attempts: ${filename}`);
        writeQueue.shift();
        failedWrites += 1;
        
        if (failedWrites > 10) {
          console.error(` CRITICAL: ${failedWrites} consecutive log write failures!`);
          failedWrites = 0; 
        }
      }
    }
  }
  
  isWriting = false;
};

const isHealthy = () => {
  return {
    queueSize: writeQueue.length,
    isWriting,
    failedWrites,
    maxQueueSize: MAX_QUEUE_SIZE,
    healthy: writeQueue.length < MAX_QUEUE_SIZE * 0.8 && failedWrites < 5
  };
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

  flush: async (timeoutMs = 5000) => {
    const startTime = Date.now();
    
    while (writeQueue.length > 0) {
      if (Date.now() - startTime > timeoutMs) {
        console.warn(`⚠️ Log flush timeout after ${timeoutMs}ms, ${writeQueue.length} logs remaining`);
        break;
      }
      
      if (!isWriting) {
        await processWriteQueue();
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  },

  health: isHealthy,

  emergency: async (message, meta = {}) => {
    const log = formatLog('EMERGENCY', message, meta);
    console.error(`🚨 EMERGENCY: ${message}`, meta);
    
    try {
      const filepath = path.join(logsDir, 'emergency.log');
      await fs.appendFile(filepath, log, { flag: 'a' });
    } catch (err) {
      console.error('Failed to write emergency log:', err);
    }
  }
};

process.on('SIGTERM', async () => {
  console.log(' Flushing logs before shutdown...');
  await logger.flush();
});

process.on('SIGINT', async () => {
  console.log(' Flushing logs before shutdown...');
  await logger.flush();
});

module.exports = logger;