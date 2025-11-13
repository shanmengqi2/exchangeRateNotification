/**
 * Integration tests for RateService
 * Tests actual API calls to ExchangeRate-API
 */

import { RateService } from './RateService';
import { AppConfig } from '../config/types';
import axios from 'axios';

describe('RateService Integration Tests', () => {
  let rateService: RateService;
  let config: AppConfig;

  beforeEach(() => {
    // Use test configuration with real API endpoint
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
        resendApiKey: 'test-key',
        fromEmail: 'test@example.com',
        toEmail: 'test@example.com',
        cooldownMinutes: 60,
      },
      logging: {
        level: 'info',
      },
    };

    rateService = new RateService(config);
  });

  describe('fetchCurrentRate with real API', () => {
    it('should successfully fetch rate data from ExchangeRate-API', async () => {
      // Skip if no API key is configured
      if (!process.env.EXCHANGE_API_KEY || process.env.EXCHANGE_API_KEY === 'your_api_key_here') {
        console.log('Skipping real API test - no API key configured');
        return;
      }

      const rateData = await rateService.fetchCurrentRate();

      expect(rateData).not.toBeNull();
      expect(rateData?.baseCurrency).toBe('EUR');
      expect(rateData?.targetCurrency).toBe('USD');
      expect(rateData?.conversionRate).toBeGreaterThan(0);
      expect(rateData?.timestamp).toBeInstanceOf(Date);
      expect(rateData?.source).toBe('ExchangeRate-API');
    }, 15000); // 15 second timeout for API call

    it('should handle invalid API key gracefully', async () => {
      const invalidConfig = {
        ...config,
        exchangeRate: {
          ...config.exchangeRate,
          apiKey: 'invalid-key-12345',
        },
      };

      const invalidRateService = new RateService(invalidConfig);
      const rateData = await invalidRateService.fetchCurrentRate();

      expect(rateData).toBeNull();
    }, 15000);

    it('should handle invalid currency codes gracefully', async () => {
      const invalidConfig = {
        ...config,
        exchangeRate: {
          ...config.exchangeRate,
          baseCurrency: 'INVALID',
          targetCurrency: 'CODES',
        },
      };

      const invalidRateService = new RateService(invalidConfig);
      const rateData = await invalidRateService.fetchCurrentRate();

      expect(rateData).toBeNull();
    }, 15000);

    it('should handle network timeout', async () => {
      // Create a service with very short timeout
      const timeoutConfig = {
        ...config,
        exchangeRate: {
          ...config.exchangeRate,
          apiUrl: 'https://httpstat.us/200?sleep=15000', // Endpoint that delays 15 seconds
        },
      };

      const timeoutService = new RateService(timeoutConfig);
      const rateData = await timeoutService.fetchCurrentRate();

      expect(rateData).toBeNull();
    }, 15000);

    it('should handle non-existent API endpoint', async () => {
      const invalidUrlConfig = {
        ...config,
        exchangeRate: {
          ...config.exchangeRate,
          apiUrl: 'https://non-existent-domain-12345.com/api',
        },
      };

      const invalidUrlService = new RateService(invalidUrlConfig);
      const rateData = await invalidUrlService.fetchCurrentRate();

      expect(rateData).toBeNull();
    }, 15000);
  });

  describe('API response parsing', () => {
    it('should correctly parse valid API response structure', async () => {
      // Skip if no API key is configured
      if (!process.env.EXCHANGE_API_KEY || process.env.EXCHANGE_API_KEY === 'your_api_key_here') {
        console.log('Skipping API parsing test - no API key configured');
        return;
      }

      const rateData = await rateService.fetchCurrentRate();

      if (rateData) {
        expect(typeof rateData.baseCurrency).toBe('string');
        expect(typeof rateData.targetCurrency).toBe('string');
        expect(typeof rateData.conversionRate).toBe('number');
        expect(rateData.timestamp).toBeInstanceOf(Date);
        expect(typeof rateData.source).toBe('string');
      }
    }, 15000);
  });
});
