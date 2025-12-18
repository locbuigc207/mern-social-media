const logger = require('./logger');

class GracefulShutdown {
  constructor() {
    this.resources = [];
    this.isShuttingDown = false;
  }

  register(name, cleanupFn) {
    this.resources.push({ name, cleanupFn });
  }

  async shutdown(signal) {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info(`${signal} received - starting graceful shutdown`);

    const shutdownPromises = this.resources.map(async ({ name, cleanupFn }) => {
      try {
        logger.info(`Closing ${name}...`);
        await cleanupFn();
        logger.info(`✅ ${name} closed successfully`);
      } catch (error) {
        logger.error(`❌ Error closing ${name}`, error);
      }
    });

    try {
      await Promise.all(shutdownPromises);
      logger.info('All resources closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  }
}

const shutdownManager = new GracefulShutdown();

module.exports = shutdownManager;