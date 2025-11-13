/**
 * Scheduler - Orchestrates periodic rate checks and notifications
 */

import * as cron from 'node-cron';
import { RateService } from './RateService';
import { NotificationService } from './NotificationService';
import { ThresholdChecker } from '../utils/ThresholdChecker';
import { Logger } from '../utils/Logger';
import { AppConfig } from '../config/types';

export class Scheduler {
  private rateService: RateService;
  private thresholdChecker: ThresholdChecker;
  private notificationService: NotificationService;
  private config: AppConfig;
  private logger: Logger;
  private cronTask: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  constructor(
    rateService: RateService,
    thresholdChecker: ThresholdChecker,
    notificationService: NotificationService,
    config: AppConfig,
    logger: Logger
  ) {
    this.rateService = rateService;
    this.thresholdChecker = thresholdChecker;
    this.notificationService = notificationService;
    this.config = config;
    this.logger = logger;

    // Validate polling interval on construction
    this.validatePollingInterval();
  }

  /**
   * Start the scheduler
   * Executes an immediate check and then schedules periodic checks
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warning('Scheduler is already running');
      return;
    }

    this.logger.info('Starting scheduler...');
    this.isRunning = true;

    // Execute immediate check on startup
    this.logger.info('Executing immediate rate check on startup');
    await this.executeCheck();

    // Schedule periodic checks based on configured interval
    const cronExpression = this.buildCronExpression();
    this.logger.info(`Scheduling periodic checks with interval: ${this.config.polling.intervalHours} hour(s)`, {
      cronExpression
    });

    this.cronTask = cron.schedule(cronExpression, async () => {
      await this.executeCheck();
    });

    this.logger.info('Scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      this.logger.warning('Scheduler is not running');
      return;
    }

    this.logger.info('Stopping scheduler...');

    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }

    this.isRunning = false;
    this.logger.info('Scheduler stopped successfully');
  }

  /**
   * Execute the complete check flow:
   * 1. Fetch current rate
   * 2. Check thresholds
   * 3. Send notification if needed
   */
  private async executeCheck(): Promise<void> {
    try {
      this.logger.info('Starting rate check cycle');

      // Step 1: Fetch current rate
      const rateData = await this.rateService.fetchCurrentRate();

      if (!rateData) {
        this.logger.error('Failed to fetch rate data, skipping this check cycle');
        return;
      }

      // Log the rate check
      this.logger.logRateCheck(
        rateData.baseCurrency,
        rateData.targetCurrency,
        rateData.conversionRate
      );

      // Step 2: Check thresholds
      const thresholdResult = this.thresholdChecker.check(rateData);

      if (!thresholdResult.shouldNotify) {
        this.logger.info('Rate is within acceptable thresholds, no notification needed', {
          rate: rateData.conversionRate,
          upperThreshold: this.config.thresholds.upper,
          lowerThreshold: this.config.thresholds.lower
        });
        return;
      }

      // Step 3: Send notification
      this.logger.info('Threshold exceeded, sending notification', {
        condition: thresholdResult.condition,
        message: thresholdResult.message
      });

      await this.notificationService.sendAlert(rateData, thresholdResult.condition!);

      this.logger.logEmailSent(
        this.config.notification.toEmail,
        thresholdResult.condition!,
        rateData.conversionRate
      );

      this.logger.info('Rate check cycle completed successfully');
    } catch (error) {
      this.logger.error(
        'Error during rate check cycle',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Build cron expression based on configured polling interval
   * @returns Cron expression string
   */
  private buildCronExpression(): string {
    const intervalHours = this.config.polling.intervalHours;

    // For intervals that divide evenly into 24 hours, use hour-based cron
    if (24 % intervalHours === 0) {
      // Run at minute 0 of every Nth hour
      return `0 */${intervalHours} * * *`;
    }

    // For other intervals, convert to minutes and use minute-based cron
    const intervalMinutes = intervalHours * 60;
    if (intervalMinutes < 60) {
      // Less than 1 hour: run every N minutes
      return `*/${intervalMinutes} * * * *`;
    }

    // For non-divisible hour intervals, use hour-based approximation
    // This will run at the top of every Nth hour
    return `0 */${intervalHours} * * *`;
  }

  /**
   * Validate that polling interval is within acceptable range (1-24 hours)
   * @throws Error if interval is invalid
   */
  private validatePollingInterval(): void {
    const intervalHours = this.config.polling.intervalHours;

    if (intervalHours < 1 || intervalHours > 24) {
      throw new Error(
        `Invalid polling interval: ${intervalHours} hours. Must be between 1 and 24 hours.`
      );
    }
  }

  /**
   * Check if scheduler is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
