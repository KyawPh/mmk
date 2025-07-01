import { BaseCollector } from '../BaseCollector';
import { CollectorResult, ExchangeRate } from '../../types/collectors';

interface BinanceP2PResponse {
  code: string;
  message: string | null;
  data: Array<{
    adv: {
      advNo: string;
      price: string;
      surplusAmount: string;
      tradeMethods: Array<{
        identifier: string;
        tradeMethodName: string;
      }>;
      tradableQuantity: {
        min: string;
        max: string;
      };
    };
    advertiser: {
      nickName: string;
      userNo: string;
      userType: string;
      monthOrderCount: number;
      monthFinishRate: number;
    };
  }>;
}

export class BinanceP2PCollector extends BaseCollector {
  name = 'Binance P2P';
  priority = 'high' as const;

  private readonly BINANCE_P2P_API = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

  async collect(): Promise<CollectorResult> {
    try {
      const { result, time } = await this.withTiming(() => this.collectRates());

      if (result.success && result.metadata) {
        result.metadata.collectionTime = time;
      }

      return result;
    } catch (error) {
      console.error('Binance P2P collector error:', error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  private async collectRates(): Promise<CollectorResult> {
    try {
      const rates: ExchangeRate[] = [];
      const timestamp = new Date();

      // Collect both USDT buy and sell rates
      const [buyRates, sellRates] = await Promise.all([
        this.fetchP2PRates('BUY'),
        this.fetchP2PRates('SELL'),
      ]);

      // Calculate average rates for USDT/MMK
      const buyAvg = this.calculateAverage(buyRates);
      const sellAvg = this.calculateAverage(sellRates);
      const avgRate = (buyAvg + sellAvg) / 2;

      if (avgRate > 0) {
        // USDT rate
        const usdtRate: ExchangeRate = {
          currency: 'USDT',
          rate: avgRate,
          buyRate: buyAvg,
          sellRate: sellAvg,
          timestamp,
          source: 'Binance P2P',
          sourceUrl: 'https://p2p.binance.com/trade/all-payments/USDT?fiat=MMK',
          lastUpdated: new Date(),
        };

        if (this.validateRate(usdtRate)) {
          rates.push(usdtRate);
        }

        // Also provide USD rate (assuming USDT ≈ USD)
        const usdRate: ExchangeRate = {
          currency: 'USD',
          rate: avgRate,
          buyRate: buyAvg,
          sellRate: sellAvg,
          timestamp,
          source: 'Binance P2P',
          sourceUrl: 'https://p2p.binance.com/trade/all-payments/USDT?fiat=MMK',
          lastUpdated: new Date(),
        };

        if (this.validateRate(usdRate)) {
          rates.push(usdRate);
        }
      }

      if (rates.length === 0) {
        return this.createErrorResult('No valid P2P rates found', {
          buyRatesCount: buyRates.length,
          sellRatesCount: sellRates.length,
        });
      }

      return this.createSuccessResult(rates, {
        method: 'api',
        platform: 'Binance P2P',
        buyOffersAnalyzed: buyRates.length,
        sellOffersAnalyzed: sellRates.length,
        topBuyRates: buyRates.slice(0, 3),
        topSellRates: sellRates.slice(0, 3),
      });
    } catch (error) {
      return this.createErrorResult(
        `Binance P2P collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { method: 'api' }
      );
    }
  }

  private async fetchP2PRates(tradeType: 'BUY' | 'SELL'): Promise<number[]> {
    try {
      const payload = {
        page: 1,
        rows: 10, // Get top 10 offers
        payTypes: [], // All payment methods
        countries: [],
        publisherType: null,
        asset: 'USDT',
        fiat: 'MMK',
        tradeType,
      };

      const response = await this.axios.post<BinanceP2PResponse>(this.BINANCE_P2P_API, payload, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (response.data.code !== '000000' || !response.data.data) {
        throw new Error(`API error: ${response.data.message || 'Unknown error'}`);
      }

      // Extract rates from top offers
      const rates = response.data.data
        .filter((item: any) => item.adv?.price)
        .map((item: any) => this.parseNumber(item.adv.price))
        .filter((rate: number) => rate > 0);

      return rates;
    } catch (error) {
      console.error(`Failed to fetch ${tradeType} rates:`, error);
      return [];
    }
  }

  private calculateAverage(rates: number[]): number {
    if (rates.length === 0) {
      return 0;
    }

    // Use top 5 rates for average to avoid outliers
    const topRates = rates.slice(0, 5);
    const sum = topRates.reduce((acc, rate) => acc + rate, 0);
    return sum / topRates.length;
  }
}
