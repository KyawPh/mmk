import { BaseCollector } from './BaseCollector';
import { CollectorResult, ExchangeRate } from '../types/collectors';
import * as cheerio from 'cheerio';

export class CBMCollector extends BaseCollector {
  name = 'Central Bank of Myanmar';
  priority = 'high' as const;

  private readonly CBM_URL = 'https://forex.cbm.gov.mm/index.php/fxrate';
  private readonly CBM_API_URL = 'https://forex.cbm.gov.mm/api/latest';

  async collect(): Promise<CollectorResult> {
    try {
      const { result, time } = await this.withTiming(() => this.collectRates());

      if (result.success && result.metadata) {
        result.metadata.collectionTime = time;
      }

      return result;
    } catch (error) {
      console.error('CBM collector error:', error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  private async collectRates(): Promise<CollectorResult> {
    // Try API first, fallback to web scraping
    try {
      return await this.collectFromAPI();
    } catch (apiError) {
      console.warn('CBM API failed, falling back to web scraping:', apiError);
      return await this.collectFromWebsite();
    }
  }

  private async collectFromAPI(): Promise<CollectorResult> {
    try {
      const response = await this.axios.get<any>(this.CBM_API_URL);
      const data = response.data;

      if (!data?.rates) {
        throw new Error('Invalid API response structure');
      }

      const timestamp = new Date(data.timestamp || Date.now());
      const rates: ExchangeRate[] = [];

      for (const [currency, rate] of Object.entries(data.rates)) {
        if (typeof rate === 'number') {
          const exchangeRate: ExchangeRate = {
            currency: currency.toUpperCase(),
            rate,
            timestamp,
            source: 'CBM',
            sourceUrl: this.CBM_API_URL,
            lastUpdated: new Date(),
          };

          if (this.validateRate(exchangeRate)) {
            rates.push(exchangeRate);
          }
        }
      }

      return this.createSuccessResult(rates, {
        method: 'api',
        warnings: rates.length === 0 ? ['No valid rates found'] : undefined,
      });
    } catch (error) {
      throw new Error(
        `API collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async collectFromWebsite(): Promise<CollectorResult> {
    try {
      const response = await this.axios.get<string>(this.CBM_URL);
      const $ = cheerio.load(response.data);

      const rates: ExchangeRate[] = [];
      const timestamp = new Date();

      // Find the exchange rate table
      // CBM website typically has a table with class 'table' or in a div with specific ID
      $('table tr').each((index, element) => {
        if (index === 0) {
          return;
        } // Skip header

        const cells = $(element).find('td');
        if (cells.length >= 3) {
          const currency = $(cells[1]).text().trim().toUpperCase();
          const rateText = $(cells[2]).text().trim();

          // Some rows might have buy/sell rates
          const buyText = cells.length > 3 ? $(cells[3]).text().trim() : null;
          const sellText = cells.length > 4 ? $(cells[4]).text().trim() : null;

          const rate = this.parseNumber(rateText);
          const buyRate = buyText ? this.parseNumber(buyText) : undefined;
          const sellRate = sellText ? this.parseNumber(sellText) : undefined;

          if (currency && rate > 0) {
            const exchangeRate: ExchangeRate = {
              currency,
              rate,
              buyRate,
              sellRate,
              timestamp,
              source: 'CBM',
              sourceUrl: this.CBM_URL,
              lastUpdated: new Date(),
            };

            if (this.validateRate(exchangeRate)) {
              rates.push(exchangeRate);
            }
          }
        }
      });

      // Alternative table selector if the above doesn't work
      if (rates.length === 0) {
        $('.fxrate-table tr, .exchange-rate-table tr, #fxrate tr').each((index, element) => {
          if (index === 0) {
            return;
          }

          const cells = $(element).find('td');
          if (cells.length >= 2) {
            const currencyCell = $(cells[0]).text().trim();
            const rateCell = $(cells[1]).text().trim();

            // Extract currency code (usually last 3 characters or in parentheses)
            const currencyMatch = currencyCell.match(/\(([A-Z]{3})\)|([A-Z]{3})$/);
            const currency = currencyMatch ? currencyMatch[1] || currencyMatch[2] : null;

            if (currency) {
              const rate = this.parseNumber(rateCell);

              if (rate > 0) {
                const exchangeRate: ExchangeRate = {
                  currency,
                  rate,
                  timestamp,
                  source: 'CBM',
                  sourceUrl: this.CBM_URL,
                  lastUpdated: new Date(),
                };

                if (this.validateRate(exchangeRate)) {
                  rates.push(exchangeRate);
                }
              }
            }
          }
        });
      }

      if (rates.length === 0) {
        return this.createErrorResult('No rates found on CBM website', {
          method: 'webscrape',
          html: response.data.substring(0, 500), // First 500 chars for debugging
        });
      }

      return this.createSuccessResult(rates, {
        method: 'webscrape',
      });
    } catch (error) {
      return this.createErrorResult(
        `Website scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { method: 'webscrape' }
      );
    }
  }
}
