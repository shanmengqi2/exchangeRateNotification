import { ConfigService } from './ConfigService';
import { ConfigurationError } from './types';

describe('ConfigService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear environment variables
    process.env = {};
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('load', () => {
    it('should load valid configuration from environment variables', () => {
      process.env.EXCHANGE_API_URL = 'https://api.example.com';
      process.env.EXCHANGE_API_KEY = 'test-key';
      process.env.BASE_CURRENCY = 'EUR';
      process.env.TARGET_CURRENCY = 'CNY';
      process.env.RATE_UPPER_THRESHOLD = '8.5';
      process.env.RATE_LOWER_THRESHOLD = '8.0';
      process.env.POLLING_INTERVAL_HOURS = '2';
      process.env.RESEND_API_KEY = 're_test_key';
      process.env.FROM_EMAIL = 'from@example.com';
      process.env.TO_EMAIL = 'to@example.com';
      process.env.NOTIFICATION_COOLDOWN_MINUTES = '60';
      process.env.LOG_LEVEL = 'info';

      const configService = new ConfigService();
      const config = configService.load();

      expect(config.exchangeRate.apiUrl).toBe('https://api.example.com');
      expect(config.exchangeRate.baseCurrency).toBe('EUR');
      expect(config.thresholds.upper).toBe(8.5);
      expect(config.thresholds.lower).toBe(8.0);
      expect(config.polling.intervalHours).toBe(2);
      expect(config.notification.fromEmail).toBe('from@example.com');
    });

    it('should use default cooldown minutes when not specified', () => {
      process.env.EXCHANGE_API_URL = 'https://api.example.com';
      process.env.EXCHANGE_API_KEY = 'test-key';
      process.env.BASE_CURRENCY = 'EUR';
      process.env.TARGET_CURRENCY = 'CNY';
      process.env.RATE_UPPER_THRESHOLD = '8.5';
      process.env.RATE_LOWER_THRESHOLD = '8.0';
      process.env.POLLING_INTERVAL_HOURS = '2';
      process.env.RESEND_API_KEY = 're_test_key';
      process.env.FROM_EMAIL = 'from@example.com';
      process.env.TO_EMAIL = 'to@example.com';

      const configService = new ConfigService();
      const config = configService.load();

      expect(config.notification.cooldownMinutes).toBe(60);
    });
  });

  describe('validate', () => {
    it('should throw ConfigurationError when required fields are missing', () => {
      const configService = new ConfigService();

      expect(() => configService.load()).toThrow(ConfigurationError);
    });

    it('should throw error when currency codes are invalid', () => {
      process.env.EXCHANGE_API_URL = 'https://api.example.com';
      process.env.EXCHANGE_API_KEY = 'test-key';
      process.env.BASE_CURRENCY = 'EURO';
      process.env.TARGET_CURRENCY = 'CNY';
      process.env.RATE_UPPER_THRESHOLD = '8.5';
      process.env.RATE_LOWER_THRESHOLD = '8.0';
      process.env.POLLING_INTERVAL_HOURS = '2';
      process.env.RESEND_API_KEY = 're_test_key';
      process.env.FROM_EMAIL = 'from@example.com';
      process.env.TO_EMAIL = 'to@example.com';

      const configService = new ConfigService();

      expect(() => configService.load()).toThrow('BASE_CURRENCY must be a 3-letter currency code');
    });

    it('should throw error when lower threshold is greater than or equal to upper threshold', () => {
      process.env.EXCHANGE_API_URL = 'https://api.example.com';
      process.env.EXCHANGE_API_KEY = 'test-key';
      process.env.BASE_CURRENCY = 'EUR';
      process.env.TARGET_CURRENCY = 'CNY';
      process.env.RATE_UPPER_THRESHOLD = '8.0';
      process.env.RATE_LOWER_THRESHOLD = '8.5';
      process.env.POLLING_INTERVAL_HOURS = '2';
      process.env.RESEND_API_KEY = 're_test_key';
      process.env.FROM_EMAIL = 'from@example.com';
      process.env.TO_EMAIL = 'to@example.com';

      const configService = new ConfigService();

      expect(() => configService.load()).toThrow('RATE_LOWER_THRESHOLD must be less than RATE_UPPER_THRESHOLD');
    });

    it('should throw error when polling interval is out of range', () => {
      process.env.EXCHANGE_API_URL = 'https://api.example.com';
      process.env.EXCHANGE_API_KEY = 'test-key';
      process.env.BASE_CURRENCY = 'EUR';
      process.env.TARGET_CURRENCY = 'CNY';
      process.env.RATE_UPPER_THRESHOLD = '8.5';
      process.env.RATE_LOWER_THRESHOLD = '8.0';
      process.env.POLLING_INTERVAL_HOURS = '25';
      process.env.RESEND_API_KEY = 're_test_key';
      process.env.FROM_EMAIL = 'from@example.com';
      process.env.TO_EMAIL = 'to@example.com';

      const configService = new ConfigService();

      expect(() => configService.load()).toThrow('POLLING_INTERVAL_HOURS must be between 1 and 24 hours');
    });

    it('should throw error when email format is invalid', () => {
      process.env.EXCHANGE_API_URL = 'https://api.example.com';
      process.env.EXCHANGE_API_KEY = 'test-key';
      process.env.BASE_CURRENCY = 'EUR';
      process.env.TARGET_CURRENCY = 'CNY';
      process.env.RATE_UPPER_THRESHOLD = '8.5';
      process.env.RATE_LOWER_THRESHOLD = '8.0';
      process.env.POLLING_INTERVAL_HOURS = '2';
      process.env.RESEND_API_KEY = 're_test_key';
      process.env.FROM_EMAIL = 'invalid-email';
      process.env.TO_EMAIL = 'to@example.com';

      const configService = new ConfigService();

      expect(() => configService.load()).toThrow('FROM_EMAIL must be a valid email address');
    });
  });
});
