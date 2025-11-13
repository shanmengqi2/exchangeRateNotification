/**
 * Logger utility for structured logging with level filtering
 */

export type LogLevel = 'info' | 'warning' | 'error';

interface LogMetadata {
  [key: string]: any;
}

export class Logger {
  private level: LogLevel;
  private levelPriority: Record<LogLevel, number> = {
    info: 0,
    warning: 1,
    error: 2,
  };

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  /**
   * Log informational messages
   */
  info(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('info')) {
      this.write('INFO', message, meta);
    }
  }

  /**
   * Log warning messages
   */
  warning(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('warning')) {
      this.write('WARNING', message, meta);
    }
  }

  /**
   * Log error messages with optional Error object
   */
  error(message: string, error?: Error, meta?: LogMetadata): void {
    if (this.shouldLog('error')) {
      const errorMeta = error
        ? {
          ...meta,
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
        }
        : meta;
      this.write('ERROR', message, errorMeta);
    }
  }

  /**
   * Log rate check operations
   */
  logRateCheck(baseCurrency: string, targetCurrency: string, conversionRate: number): void {
    this.info('Rate check completed', {
      baseCurrency,
      targetCurrency,
      conversionRate,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log email notification operations
   */
  logEmailSent(recipient: string, condition: string, conversionRate: number): void {
    this.info('Email notification sent', {
      recipient,
      condition,
      conversionRate,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log startup information with sensitive data masked
   */
  logStartup(config: any): void {
    const sanitizedConfig = this.sanitizeConfig(config);
    this.info('Application started', {
      config: sanitizedConfig,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if a message should be logged based on current level
   */
  private shouldLog(messageLevel: LogLevel): boolean {
    return this.levelPriority[messageLevel] >= this.levelPriority[this.level];
  }

  /**
   * Write formatted log entry to console
   */
  private write(level: string, message: string, meta?: LogMetadata): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(meta && { meta }),
    };

    const output = JSON.stringify(logEntry);

    switch (level) {
      case 'ERROR':
        console.error(output);
        break;
      case 'WARNING':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  /**
   * Sanitize configuration to hide sensitive information
   */
  private sanitizeConfig(config: any): any {
    if (!config || typeof config !== 'object') {
      return config;
    }

    const sanitized = { ...config };
    const sensitiveKeys = ['apiKey', 'resendApiKey', 'password', 'secret', 'token'];

    for (const key in sanitized) {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeConfig(sanitized[key]);
      }
    }

    return sanitized;
  }
}
