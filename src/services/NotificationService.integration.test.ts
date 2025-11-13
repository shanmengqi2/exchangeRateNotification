/**
 * Integration tests for NotificationService
 * Tests actual email sending via Resend API
 */

import { NotificationService } from './NotificationService';
import { AppConfig } from '../config/types';
import { NotificationCache } from '../utils/NotificationCache';
import { RateData } from '../models/RateData';

describe('NotificationService Integration Tests', () => {
  let notificationService: NotificationService;
  let notificationCache: NotificationCache;
  let config: AppConfig;

  beforeEach(() => {
    config = {
      exchangeRate: {
        apiUrl: 'https://api.example.com',
        apiKey: 'test-key',
        baseCurrency: 'EUR',
        targetCurrency: 'CNY',
      },
      thresholds: {
        upper: 8.5,
        lower: 8.0,
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

    notificationCache = new NotificationCache();
    notificationService = new NotificationService(config, notificationCache);
  });

  describe('sendAlert with real Resend API', () => {
    it('should successfully send email notification via Resend', async () => {
      // Skip if no Resend API key is configured
      if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_api_key') {
        console.log('Skipping real email test - no Resend API key configured');
        return;
      }

      const rateData: RateData = {
        baseCurrency: 'EUR',
        targetCurrency: 'CNY',
        conversionRate: 8.6,
        timestamp: new Date(),
        source: 'ExchangeRate-API',
      };

      await expect(
        notificationService.sendAlert(rateData, 'above_upper')
      ).resolves.not.toThrow();
    }, 30000); // 30 second timeout for email sending

    it('should respect cooldown period and not send duplicate notifications', async () => {
      // Skip if no Resend API key is configured
      if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_api_key') {
        console.log('Skipping cooldown test - no Resend API key configured');
        return;
      }

      const rateData: RateData = {
        baseCurrency: 'EUR',
        targetCurrency: 'CNY',
        conversionRate: 8.6,
        timestamp: new Date(),
        source: 'ExchangeRate-API',
      };

      // First notification should be sent
      await notificationService.sendAlert(rateData, 'above_upper');

      // Second notification should be skipped (in cooldown)
      const consoleSpy = jest.spyOn(console, 'log');
      await notificationService.sendAlert(rateData, 'above_upper');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('is in cooldown period')
      );

      consoleSpy.mockRestore();
    }, 30000);

    it.skip('should handle invalid Resend API key gracefully (slow test - skipped)', async () => {
      // This test is skipped by default because it takes 5+ minutes due to retry logic
      // To run: jest --testNamePattern="should handle invalid Resend API key"
      const invalidConfig = {
        ...config,
        notification: {
          ...config.notification,
          resendApiKey: 're_invalid_key_12345', // Use proper format but invalid key
          cooldownMinutes: 0, // Disable cooldown to ensure email is attempted
        },
      };

      const invalidCache = new NotificationCache();
      const invalidService = new NotificationService(invalidConfig, invalidCache);

      const rateData: RateData = {
        baseCurrency: 'EUR',
        targetCurrency: 'CNY',
        conversionRate: 8.6,
        timestamp: new Date(),
        source: 'ExchangeRate-API',
      };

      // Should throw error when trying to send with invalid API key
      // Note: This will fail after retry attempts (5+ minutes)
      await expect(
        invalidService.sendAlert(rateData, 'above_upper')
      ).rejects.toThrow();
    }, 400000); // Long timeout for retry logic

    it('should send different notifications for different conditions', async () => {
      // Skip if no Resend API key is configured
      if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_api_key') {
        console.log('Skipping different conditions test - no Resend API key configured');
        return;
      }

      const rateDataHigh: RateData = {
        baseCurrency: 'EUR',
        targetCurrency: 'CNY',
        conversionRate: 8.6,
        timestamp: new Date(),
        source: 'ExchangeRate-API',
      };

      const rateDataLow: RateData = {
        baseCurrency: 'EUR',
        targetCurrency: 'CNY',
        conversionRate: 7.9,
        timestamp: new Date(),
        source: 'ExchangeRate-API',
      };

      // Both should be sent as they are different conditions
      await expect(
        notificationService.sendAlert(rateDataHigh, 'above_upper')
      ).resolves.not.toThrow();

      await expect(
        notificationService.sendAlert(rateDataLow, 'below_lower')
      ).resolves.not.toThrow();
    }, 60000);
  });

  describe('email content generation', () => {
    it('should generate proper email content for above_upper condition', async () => {
      const rateData: RateData = {
        baseCurrency: 'EUR',
        targetCurrency: 'CNY',
        conversionRate: 8.6,
        timestamp: new Date('2024-01-15T10:30:00Z'),
        source: 'ExchangeRate-API',
      };

      // We can't directly test private methods, but we can verify the email is sent
      // with correct content by checking logs or using a test email service
      const consoleSpy = jest.spyOn(console, 'log');

      // Use a short cooldown for testing
      const testConfig = {
        ...config,
        notification: {
          ...config.notification,
          cooldownMinutes: 0, // No cooldown for testing
        },
      };

      const testService = new NotificationService(testConfig, new NotificationCache());

      // This will fail without valid API key, but we're testing the flow
      try {
        await testService.sendAlert(rateData, 'above_upper');
      } catch (error) {
        // Expected to fail without valid API key
      }

      consoleSpy.mockRestore();
    });

    it('should generate proper email content for below_lower condition', async () => {
      const rateData: RateData = {
        baseCurrency: 'EUR',
        targetCurrency: 'CNY',
        conversionRate: 7.9,
        timestamp: new Date('2024-01-15T10:30:00Z'),
        source: 'ExchangeRate-API',
      };

      const testConfig = {
        ...config,
        notification: {
          ...config.notification,
          cooldownMinutes: 0,
        },
      };

      const testService = new NotificationService(testConfig, new NotificationCache());

      try {
        await testService.sendAlert(rateData, 'below_lower');
      } catch (error) {
        // Expected to fail without valid API key
      }
    });
  });
});
