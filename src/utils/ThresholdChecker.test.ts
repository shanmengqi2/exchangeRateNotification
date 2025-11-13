import { ThresholdChecker } from './ThresholdChecker';
import { RateData } from '../models';
import { AppConfig } from '../config/types';

describe('ThresholdChecker', () => {
  const mockConfig: AppConfig = {
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
      resendApiKey: 're_test_key',
      fromEmail: 'from@example.com',
      toEmail: 'to@example.com',
      cooldownMinutes: 60,
    },
    logging: {
      level: 'info',
    },
  };

  const createRateData = (conversionRate: number): RateData => ({
    baseCurrency: 'EUR',
    targetCurrency: 'CNY',
    conversionRate,
    timestamp: new Date(),
    source: 'ExchangeRate-API',
  });

  describe('check', () => {
    it('should return shouldNotify true when rate exceeds upper threshold', () => {
      const checker = new ThresholdChecker(mockConfig);
      const rateData = createRateData(8.6);

      const result = checker.check(rateData);

      expect(result.shouldNotify).toBe(true);
      expect(result.condition).toBe('above_upper');
      expect(result.message).toContain('8.6000');
      expect(result.message).toContain('8.5000');
    });

    it('should return shouldNotify true when rate falls below lower threshold', () => {
      const checker = new ThresholdChecker(mockConfig);
      const rateData = createRateData(7.9);

      const result = checker.check(rateData);

      expect(result.shouldNotify).toBe(true);
      expect(result.condition).toBe('below_lower');
      expect(result.message).toContain('7.9000');
      expect(result.message).toContain('8.0000');
    });

    it('should return shouldNotify false when rate is within thresholds', () => {
      const checker = new ThresholdChecker(mockConfig);
      const rateData = createRateData(8.25);

      const result = checker.check(rateData);

      expect(result.shouldNotify).toBe(false);
      expect(result.condition).toBeUndefined();
      expect(result.message).toBeUndefined();
    });

    it('should return shouldNotify false when rate equals upper threshold', () => {
      const checker = new ThresholdChecker(mockConfig);
      const rateData = createRateData(8.5);

      const result = checker.check(rateData);

      expect(result.shouldNotify).toBe(false);
    });

    it('should return shouldNotify false when rate equals lower threshold', () => {
      const checker = new ThresholdChecker(mockConfig);
      const rateData = createRateData(8.0);

      const result = checker.check(rateData);

      expect(result.shouldNotify).toBe(false);
    });
  });
});
