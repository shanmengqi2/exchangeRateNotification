/**
 * Application configuration interfaces and types
 */

export interface AppConfig {
  exchangeRate: {
    apiUrl: string;
    apiKey: string;
    baseCurrency: string;
    targetCurrency: string;
  };
  thresholds: {
    upper: number;
    lower: number;
  };
  polling: {
    intervalHours: number;
  };
  notification: {
    resendApiKey: string;
    fromEmail: string;
    toEmail: string;
    cooldownMinutes: number;
  };
  logging: {
    level: 'info' | 'warning' | 'error';
  };
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
