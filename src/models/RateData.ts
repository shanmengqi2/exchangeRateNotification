/**
 * Rate data models and interfaces
 */

export interface RateData {
  baseCurrency: string;
  targetCurrency: string;
  conversionRate: number;
  timestamp: Date;
  source: string;
}

export interface ExchangeRateApiResponse {
  result: string;
  base_code: string;
  target_code: string;
  conversion_rate: number;
  time_last_update_unix: number;
}
