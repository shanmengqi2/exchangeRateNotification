/**
 * End-to-end integration tests
 * Tests the complete flow from rate fetching to notification sending
 */

import { RateService } from './RateService';
import { NotificationService } from './NotificationService';
import { ThresholdChecker } from '../utils/ThresholdChecker';
import { NotificationCache } from '../utils/NotificationCache';
import { ConfigService } from '../config/ConfigService';
import { AppConfig } from '../config/types';

describe('End-to-End Integration Tests', () => {
  let config: AppConfig;
  let rateService: RateService;
  let thresholdChecker: ThresholdChecker;
  let notificationService: NotificationService;
  let notificationCache: NotificationCache;

  beforeEach(() => {
    // Load configuration from environment or use test defaults
    try {
      const configService = new ConfigService();
      config = configService.load();
    } catch (error) {
      // Use test configuration if environment is not set up
      config = {
        exchangeRate: {
          apiUrl: process.env.EXCHANGE_API_URL || 'https://v6.exchangerate-api.com/v6',
          apiKey: process.env.EXCHANGE_API_KEY || 'test-key',
          baseCurrency: 'EUR',
          targetCurrency: 'USD',
        },
        thresholds: {
          upper: 1.2,
          lower: 1.0,
        },
        polling: {
          intervalHours: 2,
        },
        notification: {
          resendApiKey: process.env.RESEND_API_KEY || 'test-key',
          fromEmail: process.env.FROM_EMAIL || 'test@example.com',
          toEmail: process.env.TO_EMAIL || 'test@example.com',
          cooldownMinutes: 60,
        },
        logging: {
          level: 'info',
        },
      };
    }

    // Initialize all services
    rateService = new RateService(config);
    thresholdChecker = new ThresholdChecker(config);
    notificationCache = new NotificationCache();
    notificationService = new NotificationService(config, notificationCache);
  });

  describe('Complete monitoring flow', () => {
    it('should execute complete flow: fetch rate -> check threshold -> send notification', async () => {
      // Skip if no API keys are configured
      if (
        !process.env.EXCHANGE_API_KEY ||
        process.env.EXCHANGE_API_KEY === 'your_api_key_here' ||
        !process.env.RESEND_API_KEY ||
        process.env.RESEND_API_KEY === 're_your_api_key'
      ) {
        console.log('Skipping end-to-end test - API keys not configured');
        return;
      }

      // Step 1: Fetch current rate
      const rateData = await rateService.fetchCurrentRate();
      expect(rateData).not.toBeNull();

      if (!rateData) {
        throw new Error('Failed to fetch rate data');
      }

      console.log(`Fetched rate: ${rateData.conversionRate}`);

      // Step 2: Check thresholds
      const thresholdResult = thresholdChecker.check(rateData);
      console.log(`Threshold check result: ${JSON.stringify(thresholdResult)}`);

      // Step 3: Send notification if threshold is exceeded
      if (thresholdResult.shouldNotify && thresholdResult.condition) {
        await notificationService.sendAlert(rateData, thresholdResult.condition);
        console.log('Notification sent successfully');
      } else {
        console.log('No notification needed - rate within thresholds');
      }

      // Verify the flow completed without errors
      expect(rateData.conversionRate).toBeGreaterThan(0);
    }, 45000); // 45 second timeout for complete flow

    it('should handle the flow when rate is within thresholds', async () => {
      // Skip if no API key is configured
      if (!process.env.EXCHANGE_API_KEY || process.env.EXCHANGE_API_KEY === 'your_api_key_here') {
        console.log('Skipping threshold test - no API key configured');
        return;
      }

      // Use thresholds that are unlikely to be triggered
      const safeConfig = {
        ...config,
        thresholds: {
          upper: 999.0,
          lower: 0.001,
        },
      };

      const safeThresholdChecker = new ThresholdChecker(safeConfig);

      // Fetch rate
      const rateData = await rateService.fetchCurrentRate();
      expect(rateData).not.toBeNull();

      if (!rateData) {
        throw new Error('Failed to fetch rate data');
      }

      // Check thresholds - should not trigger
      const thresholdResult = safeThresholdChecker.check(rateData);
      expect(thresholdResult.shouldNotify).toBe(false);
      expect(thresholdResult.condition).toBeUndefined();
      expect(thresholdResult.message).toBeUndefined();
    }, 30000);

    it('should handle the flow when rate exceeds upper threshold', async () => {
      // Skip if no API key is configured
      if (!process.env.EXCHANGE_API_KEY || process.env.EXCHANGE_API_KEY === 'your_api_key_here') {
        console.log('Skipping upper threshold test - no API key configured');
        return;
      }

      // Use a very low upper threshold to trigger notification
      const triggerConfig = {
        ...config,
        thresholds: {
          upper: 0.001,
          lower: 0.0001,
        },
      };

      const triggerThresholdChecker = new ThresholdChecker(triggerConfig);

      // Fetch rate
      const rateData = await rateService.fetchCurrentRate();
      expect(rateData).not.toBeNull();

      if (!rateData) {
        throw new Error('Failed to fetch rate data');
      }

      // Check thresholds - should trigger above_upper
      const thresholdResult = triggerThresholdChecker.check(rateData);
      expect(thresholdResult.shouldNotify).toBe(true);
      expect(thresholdResult.condition).toBe('above_upper');
      expect(thresholdResult.message).toBeDefined();
    }, 30000);

    it('should handle the flow when rate falls below lower threshold', async () => {
      // Skip if no API key is configured
      if (!process.env.EXCHANGE_API_KEY || process.env.EXCHANGE_API_KEY === 'your_api_key_here') {
        console.log('Skipping lower threshold test - no API key configured');
        return;
      }

      // Use a very high lower threshold to trigger notification
      const triggerConfig = {
        ...config,
        thresholds: {
          upper: 1000.0,
          lower: 999.0,
        },
      };

      const triggerThresholdChecker = new ThresholdChecker(triggerConfig);

      // Fetch rate
      const rateData = await rateService.fetchCurrentRate();
      expect(rateData).not.toBeNull();

      if (!rateData) {
        throw new Error('Failed to fetch rate data');
      }

      // Check thresholds - should trigger below_lower
      const thresholdResult = triggerThresholdChecker.check(rateData);
      expect(thresholdResult.shouldNotify).toBe(true);
      expect(thresholdResult.condition).toBe('below_lower');
      expect(thresholdResult.message).toBeDefined();
    }, 30000);
  });

  describe('Error scenario handling', () => {
    it('should handle API timeout gracefully in complete flow', async () => {
      const timeoutConfig = {
        ...config,
        exchangeRate: {
          ...config.exchangeRate,
          apiUrl: 'https://httpstat.us/200?sleep=15000',
        },
      };

      const timeoutRateService = new RateService(timeoutConfig);

      // Fetch rate - should timeout and return null
      const rateData = await timeoutRateService.fetchCurrentRate();
      expect(rateData).toBeNull();

      // Flow should stop here without crashing
      if (rateData) {
        const thresholdResult = thresholdChecker.check(rateData);
        // This shouldn't execute
        expect(thresholdResult).toBeDefined();
      }
    }, 30000);

    it('should handle invalid API response in complete flow', async () => {
      const invalidConfig = {
        ...config,
        exchangeRate: {
          ...config.exchangeRate,
          apiKey: 'invalid-key-12345',
        },
      };

      const invalidRateService = new RateService(invalidConfig);

      // Fetch rate - should fail and return null
      const rateData = await invalidRateService.fetchCurrentRate();
      expect(rateData).toBeNull();

      // Flow should handle null gracefully
      if (rateData) {
        const thresholdResult = thresholdChecker.check(rateData);
        expect(thresholdResult).toBeDefined();
      }
    }, 30000);

    it.skip('should handle email sending failure in complete flow (slow test - skipped)', async () => {
      // This test is skipped by default because it takes 5+ minutes due to retry logic
      // To run: jest --testNamePattern="should handle email sending failure"

      // Skip if no Exchange API key is configured
      if (!process.env.EXCHANGE_API_KEY || process.env.EXCHANGE_API_KEY === 'your_api_key_here') {
        console.log('Skipping email failure test - no Exchange API key configured');
        return;
      }

      // Use invalid Resend API key and disable cooldown
      const invalidEmailConfig = {
        ...config,
        notification: {
          ...config.notification,
          resendApiKey: 're_invalid_key_12345',
          cooldownMinutes: 0, // Disable cooldown to ensure email is attempted
        },
        thresholds: {
          upper: 0.001, // Very low to trigger notification
          lower: 0.0001,
        },
      };

      const invalidNotificationCache = new NotificationCache();
      const invalidNotificationService = new NotificationService(
        invalidEmailConfig,
        invalidNotificationCache
      );
      const triggerThresholdChecker = new ThresholdChecker(invalidEmailConfig);

      // Fetch rate
      const rateData = await rateService.fetchCurrentRate();
      expect(rateData).not.toBeNull();

      if (!rateData) {
        throw new Error('Failed to fetch rate data');
      }

      // Check thresholds
      const thresholdResult = triggerThresholdChecker.check(rateData);

      // Try to send notification - should fail
      if (thresholdResult.shouldNotify && thresholdResult.condition) {
        await expect(
          invalidNotificationService.sendAlert(rateData, thresholdResult.condition)
        ).rejects.toThrow();
      }
    }, 400000); // Long timeout for retry logic (5 minutes + buffer)

    it('should continue operation after transient failures', async () => {
      // Skip if no API key is configured
      if (!process.env.EXCHANGE_API_KEY || process.env.EXCHANGE_API_KEY === 'your_api_key_here') {
        console.log('Skipping transient failure test - no API key configured');
        return;
      }

      // First attempt with invalid config
      const invalidRateService = new RateService({
        ...config,
        exchangeRate: {
          ...config.exchangeRate,
          apiKey: 'invalid-key',
        },
      });

      const firstAttempt = await invalidRateService.fetchCurrentRate();
      expect(firstAttempt).toBeNull();

      // Second attempt with valid config - should succeed
      const secondAttempt = await rateService.fetchCurrentRate();
      expect(secondAttempt).not.toBeNull();
      expect(secondAttempt?.conversionRate).toBeGreaterThan(0);
    }, 30000);
  });
});
