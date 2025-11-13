/**
 * Application Entry Point
 * Implements dependency injection, component initialization, and graceful shutdown
 */

import { ConfigService } from './config/ConfigService';
import { RateService } from './services/RateService';
import { NotificationService } from './services/NotificationService';
import { Scheduler } from './services/Scheduler';
import { Logger } from './utils/Logger';
import { ThresholdChecker } from './utils/ThresholdChecker';
import { NotificationCache } from './utils/NotificationCache';
import { AppConfig } from './config/types';

/**
 * Main application class
 * Manages application lifecycle and dependency injection
 */
class Application {
  private scheduler: Scheduler | null = null;
  private logger: Logger | null = null;
  private config: AppConfig | null = null;

  /**
   * Initialize and start the application
   */
  async start(): Promise<void> {
    try {
      console.log('Starting Currency Rate Monitor...');

      // Step 1: Load and validate configuration
      const configService = new ConfigService();
      this.config = configService.load();

      // Step 2: Initialize logger
      this.logger = new Logger(this.config.logging.level);
      this.logger.logStartup(this.config);

      // Step 3: Initialize services with dependency injection
      const rateService = new RateService(this.config);
      const notificationCache = new NotificationCache();
      const notificationService = new NotificationService(
        this.config,
        notificationCache
      );
      const thresholdChecker = new ThresholdChecker(this.config);

      // Step 4: Initialize scheduler
      this.scheduler = new Scheduler(
        rateService,
        thresholdChecker,
        notificationService,
        this.config,
        this.logger
      );

      // Step 5: Start the scheduler
      await this.scheduler.start();

      this.logger.info('Currency Rate Monitor started successfully');
      this.logger.info(`Monitoring ${this.config.exchangeRate.baseCurrency}/${this.config.exchangeRate.targetCurrency}`);
      this.logger.info(`Polling interval: ${this.config.polling.intervalHours} hour(s)`);
      this.logger.info(`Thresholds: Lower=${this.config.thresholds.lower}, Upper=${this.config.thresholds.upper}`);

    } catch (error) {
      console.error('Failed to start application:', error);
      if (error instanceof Error) {
        console.error(error.message);
      }
      process.exit(1);
    }
  }

  /**
   * Gracefully shutdown the application
   */
  async shutdown(): Promise<void> {
    if (this.logger) {
      this.logger.info('Shutting down Currency Rate Monitor...');
    } else {
      console.log('Shutting down Currency Rate Monitor...');
    }

    // Stop the scheduler
    if (this.scheduler) {
      this.scheduler.stop();
    }

    if (this.logger) {
      this.logger.info('Application shutdown complete');
    } else {
      console.log('Application shutdown complete');
    }

    // Exit process
    process.exit(0);
  }
}

// Create application instance
const app = new Application();

// Setup graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT signal');
  await app.shutdown();
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM signal');
  await app.shutdown();
});

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Start the application
app.start().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
