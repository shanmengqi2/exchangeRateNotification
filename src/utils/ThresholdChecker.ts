/**
 * Threshold checking logic for rate monitoring
 */

import { RateData } from '../models';
import { AppConfig } from '../config/types';

export interface ThresholdResult {
  shouldNotify: boolean;
  condition?: 'above_upper' | 'below_lower';
  message?: string;
}

export class ThresholdChecker {
  constructor(private config: AppConfig) { }

  /**
   * Check if the rate data exceeds configured thresholds
   * @param rateData - The current rate data to check
   * @returns ThresholdResult indicating if notification should be sent
   */
  check(rateData: RateData): ThresholdResult {
    const { conversionRate } = rateData;
    const { upper, lower } = this.config.thresholds;

    // Check if rate exceeds upper threshold
    if (conversionRate > upper) {
      return {
        shouldNotify: true,
        condition: 'above_upper',
        message: this.formatMessage(rateData, 'above_upper')
      };
    }

    // Check if rate falls below lower threshold
    if (conversionRate < lower) {
      return {
        shouldNotify: true,
        condition: 'below_lower',
        message: this.formatMessage(rateData, 'below_lower')
      };
    }

    // Rate is within acceptable range
    return {
      shouldNotify: false
    };
  }

  /**
   * Format a descriptive notification message
   * @param rateData - The rate data that triggered the notification
   * @param condition - The condition that was triggered
   * @returns Formatted message string
   */
  private formatMessage(rateData: RateData, condition: 'above_upper' | 'below_lower'): string {
    const { baseCurrency, targetCurrency, conversionRate } = rateData;
    const { upper, lower } = this.config.thresholds;

    if (condition === 'above_upper') {
      return `汇率提醒：${baseCurrency}/${targetCurrency} 当前汇率 ${conversionRate.toFixed(4)} 已超过上限阈值 ${upper.toFixed(4)}`;
    } else {
      return `汇率提醒：${baseCurrency}/${targetCurrency} 当前汇率 ${conversionRate.toFixed(4)} 已低于下限阈值 ${lower.toFixed(4)}`;
    }
  }
}
