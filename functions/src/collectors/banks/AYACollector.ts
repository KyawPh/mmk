import { BaseCollector } from '../BaseCollector';
import { CollectorResult, ExchangeRate } from '../../types/collectors';
import * as cheerio from 'cheerio';

export class AYACollector extends BaseCollector {
  name = 'AYA Bank';
  priority = 'high' as const;

  private readonly AYA_URL = 'https://www.ayabank.com/en_US/';
  private readonly AYA_RATES_API = 'https://www.ayabank.com/api/exchange-rates'; // If available

  async collect(): Promise<CollectorResult> {
    try {
      const { result, time } = await this.withTiming(() => this.collectRates());

      if (result.success && result.metadata) {
        result.metadata.collectionTime = time;
      }

      return result;
    } catch (error) {
      console.error('AYA collector error:', error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  private async collectRates(): Promise<CollectorResult> {
    // Try API first if available
    try {
      return await this.collectFromAPI();
    } catch (apiError) {
      console.warn('AYA API failed, falling back to web scraping:', apiError);
      return await this.collectFromWebsite();
    }
  }

  private async collectFromAPI(): Promise<CollectorResult> {
    try {
      const response = await this.axios.get<any>(this.AYA_RATES_API);
      const data = response.data;

      if (!data || !Array.isArray(data.rates)) {
        throw new Error('Invalid API response structure');
      }

      const timestamp = new Date();
      const rates: ExchangeRate[] = [];

      for (const item of data.rates) {
        if (item.currency && item.buy_rate && item.sell_rate) {
          const buyRate = this.parseNumber(item.buy_rate.toString());
          const sellRate = this.parseNumber(item.sell_rate.toString());
          const rate = (buyRate + sellRate) / 2;

          const exchangeRate: ExchangeRate = {
            currency: item.currency.toUpperCase(),
            rate,
            buyRate,
            sellRate,
            timestamp,
            source: 'AYA',
            sourceUrl: this.AYA_RATES_API,
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
      const response = await this.axios.get<string>(this.AYA_URL);
      const $ = cheerio.load(response.data);

      const rates: ExchangeRate[] = [];
      const timestamp = new Date();

      // AYA Bank might have exchange rates in various locations
      // Try common selectors
      $('.exchange-rates table tr, .currency-exchange tr, .forex-rates tr').each(
        (index, element) => {
          if (index === 0) {
            return;
          } // Skip header

          const cells = $(element).find('td');
          if (cells.length >= 3) {
            const currencyText = $(cells[0]).text().trim();
            const buyText = $(cells[1]).text().trim();
            const sellText = $(cells[2]).text().trim();

            // Extract currency code
            const currencyMatch = currencyText.match(/\(([A-Z]{3})\)|([A-Z]{3})$/);
            let currency = currencyMatch ? currencyMatch[1] || currencyMatch[2] : null;

            // If no match, try common currency names
            if (!currency) {
              if (currencyText.includes('Dollar') || currencyText.includes('USD')) {
                currency = 'USD';
              } else if (currencyText.includes('Euro') || currencyText.includes('EUR')) {
                currency = 'EUR';
              } else if (currencyText.includes('Singapore')) {
                currency = 'SGD';
              } else if (currencyText.includes('Thai') || currencyText.includes('Baht')) {
                currency = 'THB';
              } else if (currencyText.includes('Yuan') || currencyText.includes('Renminbi')) {
                currency = 'CNY';
              }
            }

            if (currency) {
              const buyRate = this.parseNumber(buyText);
              const sellRate = this.parseNumber(sellText);
              const rate = (buyRate + sellRate) / 2;

              if (rate > 0) {
                const exchangeRate: ExchangeRate = {
                  currency,
                  rate,
                  buyRate,
                  sellRate,
                  timestamp,
                  source: 'AYA',
                  sourceUrl: this.AYA_URL,
                  lastUpdated: new Date(),
                };

                if (this.validateRate(exchangeRate)) {
                  rates.push(exchangeRate);
                }
              }
            }
          }
        }
      );

      // Alternative approach: look for rate cards or divs
      if (rates.length === 0) {
        $('.rate-card, .currency-card, .exchange-rate-item').each((_index, element) => {
          const $elem = $(element);
          const currencyText = $elem.find('.currency-name, .currency-code').text().trim();
          const buyText = $elem.find('.buy-rate, .buying-rate').text().trim();
          const sellText = $elem.find('.sell-rate, .selling-rate').text().trim();

          const currencyMatch = currencyText.match(/([A-Z]{3})/);
          const currency = currencyMatch ? currencyMatch[1] : null;

          if (currency) {
            const buyRate = this.parseNumber(buyText);
            const sellRate = this.parseNumber(sellText);
            const rate = (buyRate + sellRate) / 2;

            if (rate > 0) {
              const exchangeRate: ExchangeRate = {
                currency,
                rate,
                buyRate,
                sellRate,
                timestamp,
                source: 'AYA',
                sourceUrl: this.AYA_URL,
                lastUpdated: new Date(),
              };

              if (this.validateRate(exchangeRate)) {
                rates.push(exchangeRate);
              }
            }
          }
        });
      }

      if (rates.length === 0) {
        return this.createErrorResult('No rates found on AYA website', {
          method: 'webscrape',
          possibleIssue: 'Website structure might have changed or rates not on homepage',
        });
      }

      return this.createSuccessResult(rates, {
        method: 'webscrape',
        bank: 'AYA',
      });
    } catch (error) {
      return this.createErrorResult(
        `AYA website scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { method: 'webscrape' }
      );
    }
  }
}
