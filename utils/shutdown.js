const logger = require('./logger');

class GracefulShutdown {
  constructor() {
    this.resources = [];
    this.isShuttingDown = false;
    this.shutdownTimeout = 25000; 
  }

  register(name, cleanupFn) {
    if (typeof cleanupFn !== 'function') {
      throw new Error(`Cleanup function for ${name} must be a function`);
    }
    this.resources.push({ name, cleanupFn });
    logger.debug(`Registered shutdown handler: ${name}`);
  }

  async shutdown(signal = 'UNKNOWN') {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info(`\n${'='.repeat(50)}`);
    logger.info(`${signal} received - starting graceful shutdown`);
    logger.info(`${'='.repeat(50)}\n`);

    const shutdownPromises = this.resources.map(async ({ name, cleanupFn }) => {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout closing ${name}`)), 10000)
      );

      try {
        logger.info(`⏳ Closing ${name}...`);
        await Promise.race([cleanupFn(), timeoutPromise]);
        logger.info(`✅ ${name} closed successfully`);
        return { name, success: true };
      } catch (error) {
        logger.error(`❌ Error closing ${name}:`, error);
        return { name, success: false, error: error.message };
      }
    });

    try {
      const results = await Promise.allSettled(shutdownPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

      logger.info(`\n${'='.repeat(50)}`);
      logger.info(`Shutdown Summary:`);
      logger.info(`   Successful: ${successful.length}/${this.resources.length}`);
      if (failed.length > 0) {
        logger.warn(`   Failed: ${failed.length}/${this.resources.length}`);
        failed.forEach(f => {
          if (f.status === 'fulfilled') {
            logger.warn(`    - ${f.value.name}: ${f.value.error}`);
          } else {
            logger.warn(`    - Unknown: ${f.reason}`);
          }
        });
      }
      logger.info(`${'='.repeat(50)}\n`);

      if (failed.length === 0) {
        logger.info(' All resources closed successfully');
        process.exit(0);
      } else {
        logger.warn(' Some resources failed to close properly');
        process.exit(1);
      }
    } catch (error) {
      logger.error(' Fatal error during shutdown:', error);
      process.exit(1);
    }
  }

  setForceShutdownTimeout(timeout = 30000) {
    this.shutdownTimeout = timeout;
    const timer = setTimeout(() => {
      logger.error(` Forced shutdown after ${timeout}ms timeout`);
      process.exit(1);
    }, timeout);
    timer.unref();
    return timer;
  }
}

const shutdownManager = new GracefulShutdown();

module.exports = shutdownManager;