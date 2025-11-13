import * as dotenv from 'dotenv';
import { AppConfig, ConfigurationError } from './types';

/**
 * ConfigService loads and validates application configuration from environment variables
 */
export class ConfigService {
  private config: AppConfig | null = null;

  /**
   * Load configuration from environment variables
   * @returns Validated AppConfig object
   * @throws ConfigurationError if required parameters are missing or invalid
   */
  load(): AppConfig {
    // Load .env file
    dotenv.config();

    // Build configuration object
    const config: AppConfig = {
      exchangeRate: {
        apiUrl: process.env.EXCHANGE_API_URL || '',
        apiKey: process.env.EXCHANGE_API_KEY || '',
        baseCurrency: process.env.BASE_CURRENCY || '',
        targetCurrency: process.env.TARGET_CURRENCY || '',
      },
      thresholds: {
        upper: parseFloat(process.env.RATE_UPPER_THRESHOLD || ''),
        lower: parseFloat(process.env.RATE_LOWER_THRESHOLD || ''),
      },
      polling: {
        intervalHours: parseInt(process.env.POLLING_INTERVAL_HOURS || '', 10),
      },
      notification: {
        resendApiKey: process.env.RESEND_API_KEY || '',
        fromEmail: process.env.FROM_EMAIL || '',
        toEmail: process.env.TO_EMAIL || '',
        cooldownMinutes: parseInt(process.env.NOTIFICATION_COOLDOWN_MINUTES || '60', 10),
      },
      logging: {
        level: this.validateLogLevel(process.env.LOG_LEVEL || 'info'),
      },
    };

    // Validate configuration
    this.validate(config);

    this.config = config;
    return config;
  }

  /**
   * Validate the configuration object
   * @param config Configuration to validate
   * @throws ConfigurationError if validation fails
   */
  validate(config: AppConfig): void {
    const errors: string[] = [];

    // Validate ExchangeRate API configuration
    if (!config.exchangeRate.apiUrl) {
      errors.push('EXCHANGE_API_URL is required');
    }
    if (!config.exchangeRate.apiKey) {
      errors.push('EXCHANGE_API_KEY is required');
    }
    if (!config.exchangeRate.baseCurrency) {
      errors.push('BASE_CURRENCY is required');
    }
    if (!config.exchangeRate.targetCurrency) {
      errors.push('TARGET_CURRENCY is required');
    }

    // Validate currency codes (should be 3 letters)
    if (config.exchangeRate.baseCurrency && !/^[A-Z]{3}$/.test(config.exchangeRate.baseCurrency)) {
      errors.push('BASE_CURRENCY must be a 3-letter currency code (e.g., EUR, USD)');
    }
    if (config.exchangeRate.targetCurrency && !/^[A-Z]{3}$/.test(config.exchangeRate.targetCurrency)) {
      errors.push('TARGET_CURRENCY must be a 3-letter currency code (e.g., CNY, USD)');
    }

    // Validate thresholds
    if (isNaN(config.thresholds.upper)) {
      errors.push('RATE_UPPER_THRESHOLD is required and must be a valid number');
    }
    if (isNaN(config.thresholds.lower)) {
      errors.push('RATE_LOWER_THRESHOLD is required and must be a valid number');
    }
    if (!isNaN(config.thresholds.upper) && !isNaN(config.thresholds.lower)) {
      if (config.thresholds.lower >= config.thresholds.upper) {
        errors.push('RATE_LOWER_THRESHOLD must be less than RATE_UPPER_THRESHOLD');
      }
    }

    // Validate polling interval
    if (isNaN(config.polling.intervalHours)) {
      errors.push('POLLING_INTERVAL_HOURS is required and must be a valid number');
    } else if (config.polling.intervalHours < 1 || config.polling.intervalHours > 24) {
      errors.push('POLLING_INTERVAL_HOURS must be between 1 and 24 hours');
    }

    // Validate notification configuration
    if (!config.notification.resendApiKey) {
      errors.push('RESEND_API_KEY is required');
    }
    if (!config.notification.fromEmail) {
      errors.push('FROM_EMAIL is required');
    }
    if (!config.notification.toEmail) {
      errors.push('TO_EMAIL is required');
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (config.notification.fromEmail && !emailRegex.test(config.notification.fromEmail)) {
      errors.push('FROM_EMAIL must be a valid email address');
    }
    if (config.notification.toEmail && !emailRegex.test(config.notification.toEmail)) {
      errors.push('TO_EMAIL must be a valid email address');
    }

    // Validate cooldown minutes
    if (isNaN(config.notification.cooldownMinutes) || config.notification.cooldownMinutes < 0) {
      errors.push('NOTIFICATION_COOLDOWN_MINUTES must be a non-negative number');
    }

    // If there are validation errors, throw with descriptive message
    if (errors.length > 0) {
      const errorMessage = [
        'Configuration validation failed:',
        ...errors.map(err => `  - ${err}`),
        '',
        'Please check your .env file and ensure all required parameters are set correctly.',
      ].join('\n');

      throw new ConfigurationError(errorMessage);
    }
  }

  /**
   * Validate and normalize log level
   * @param level Log level string
   * @returns Validated log level
   */
  private validateLogLevel(level: string): 'info' | 'warning' | 'error' {
    const normalized = level.toLowerCase();
    if (normalized === 'info' || normalized === 'warning' || normalized === 'error') {
      return normalized;
    }
    return 'info'; // Default to info if invalid
  }

  /**
   * Get the loaded configuration
   * @returns Current configuration or null if not loaded
   */
  getConfig(): AppConfig | null {
    return this.config;
  }
}
