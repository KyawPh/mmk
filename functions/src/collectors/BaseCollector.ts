import { Collector, CollectorResult, ExchangeRate } from '../types/collectors';
import axios from 'axios';

type AxiosInstance = ReturnType<typeof axios.create>;

export abstract class BaseCollector implements Collector {
  abstract name: string;
  abstract priority: 'high' | 'medium' | 'low';
  protected axios: AxiosInstance;

  constructor() {
    this.axios = axios.create({
      timeout: 30000, // 30 seconds
      headers: {
        'User-Agent': 'MMK-Currency-Bot/1.0 (Myanmar Currency Exchange Rate Collector)',
      },
    });
  }

  abstract collect(): Promise<CollectorResult>;

  protected createSuccessResult(rates: ExchangeRate[], metadata?: any): CollectorResult {
    return {
      success: true,
      rates,
      metadata: {
        collectionTime: 0, // Will be set by wrapper
        rateCount: rates.length,
        ...metadata,
      },
    };
  }

  protected createErrorResult(error: string, metadata?: any): CollectorResult {
    return {
      success: false,
      rates: [],
      error,
      metadata: {
        collectionTime: 0,
        rateCount: 0,
        ...metadata,
      },
    };
  }

  protected async withTiming<T>(operation: () => Promise<T>): Promise<{ result: T; time: number }> {
    const startTime = Date.now();
    const result = await operation();
    const time = Date.now() - startTime;
    return { result, time };
  }

  protected validateRate(rate: ExchangeRate): boolean {
    // Basic validation
    if (!rate.currency || rate.currency.length !== 3) {
      return false;
    }
    if (rate.rate <= 0 || rate.rate > 10000) {
      // Reasonable bounds for MMK exchange rates
      return false;
    }
    if (rate.buyRate && (rate.buyRate <= 0 || rate.buyRate > 10000)) {
      return false;
    }
    if (rate.sellRate && (rate.sellRate <= 0 || rate.sellRate > 10000)) {
      return false;
    }
    return true;
  }

  protected parseNumber(value: string): number {
    // Remove commas and spaces
    const cleaned = value.replace(/[,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
}
