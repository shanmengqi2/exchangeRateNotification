/**
 * Rate Service - Fetches exchange rate data from ExchangeRate-API
 */

import axios, { AxiosInstance } from 'axios';
import { AppConfig } from '../config/types';
import { RateData, ExchangeRateApiResponse } from '../models/RateData';

export class RateService {
  private httpClient: AxiosInstance;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    this.httpClient = axios.create({
      timeout: 10000, // 10 seconds timeout
    });
  }

  /**
   * Fetch current exchange rate from ExchangeRate-API
   * @returns RateData object or null if request fails
   */
  async fetchCurrentRate(): Promise<RateData | null> {
    try {
      const url = this.buildApiUrl();
      console.log(`[RateService] Fetching rate from: ${url}`);

      const response = await this.httpClient.get<ExchangeRateApiResponse>(url);

      if (response.data.result !== 'success') {
        console.error(`[RateService] API returned non-success result: ${response.data.result}`);
        return null;
      }

      const rateData = this.parseApiResponse(response.data);
      console.log(`[RateService] Successfully fetched rate: ${rateData.conversionRate}`);

      return rateData;
    } catch (error) {
      this.logError(error);
      return null;
    }
  }

  /**
   * Build the API URL with configured parameters
   */
  private buildApiUrl(): string {
    const { apiUrl, apiKey, baseCurrency, targetCurrency } = this.config.exchangeRate;
    return `${apiUrl}/${apiKey}/pair/${baseCurrency}/${targetCurrency}`;
  }

  /**
   * Parse API response and convert to RateData format
   */
  private parseApiResponse(response: ExchangeRateApiResponse): RateData {
    return {
      baseCurrency: response.base_code,
      targetCurrency: response.target_code,
      conversionRate: response.conversion_rate,
      timestamp: new Date(response.time_last_update_unix * 1000),
      source: 'ExchangeRate-API',
    };
  }

  /**
   * Log error details with context information
   */
  private logError(error: unknown): void {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        console.error('[RateService] Request timeout after 10 seconds');
      } else if (error.response) {
        console.error(`[RateService] API error: ${error.response.status} - ${error.response.statusText}`);
        console.error(`[RateService] Response data:`, error.response.data);
      } else if (error.request) {
        console.error('[RateService] No response received from API');
        console.error(`[RateService] Request details:`, error.message);
      } else {
        console.error(`[RateService] Request setup error: ${error.message}`);
      }
    } else {
      console.error('[RateService] Unexpected error:', error);
    }
  }
}
