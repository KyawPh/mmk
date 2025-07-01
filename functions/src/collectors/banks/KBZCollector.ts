import { BaseCollector } from '../BaseCollector';
import { CollectorResult, ExchangeRate } from '../../types/collectors';
import * as cheerio from 'cheerio';

export class KBZCollector extends BaseCollector {
  name = 'KBZ Bank';
  priority = 'high' as const;

  private readonly KBZ_URL = 'https://www.kbzbank.com/en/reference-exchange-rate/';

  async collect(): Promise<CollectorResult> {
    try {
      const { result, time } = await this.withTiming(() => this.collectRates());

      if (result.success && result.metadata) {
        result.metadata.collectionTime = time;
      }

      return result;
    } catch (error) {
      console.error('KBZ collector error:', error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  private async collectRates(): Promise<CollectorResult> {
    try {
      const response = await this.axios.get<string>(this.KBZ_URL);
      const $ = cheerio.load(response.data);

      const rates: ExchangeRate[] = [];
      const timestamp = new Date();

      // KBZ typically uses a table with exchange rates
      // Look for table with class like 'exchange-rate', 'rate-table', etc.
      $('table tr').each((index, element) => {
        if (index === 0) {
          return;
        } // Skip header

        const cells = $(element).find('td');
        if (cells.length >= 3) {
          // Extract currency and rates
          const currencyCell = $(cells[0]).text().trim();
          const buyRateText = $(cells[1]).text().trim();
          const sellRateText = $(cells[2]).text().trim();

          // Extract currency code - KBZ might show "US Dollar (USD)" format
          const currencyMatch = currencyCell.match(/\(([A-Z]{3})\)|([A-Z]{3})$/);
          const currency = currencyMatch ? currencyMatch[1] || currencyMatch[2] : null;

          if (currency) {
            const buyRate = this.parseNumber(buyRateText);
            const sellRate = this.parseNumber(sellRateText);

            // For KBZ, we'll use the average of buy and sell as the base rate
            const rate = (buyRate + sellRate) / 2;

            if (rate > 0) {
              const exchangeRate: ExchangeRate = {
                currency,
                rate,
                buyRate,
                sellRate,
                timestamp,
                source: 'KBZ',
                sourceUrl: this.KBZ_URL,
                lastUpdated: new Date(),
              };

              if (this.validateRate(exchangeRate)) {
                rates.push(exchangeRate);
              }
            }
          }
        }
      });

      // Alternative selectors if the above doesn't work
      if (rates.length === 0) {
        $('.exchange-rate-table tr, .rate-table tr, .forex-table tr').each((index, element) => {
          if (index === 0) {
            return;
          }

          const cells = $(element).find('td');
          if (cells.length >= 3) {
            const currencyText = $(cells[0]).text().trim();
            const buyText = $(cells[1]).text().trim();
            const sellText = $(cells[2]).text().trim();

            // Try to extract currency code
            let currency = '';
            if (currencyText.includes('USD') || currencyText.includes('Dollar')) {
              currency = 'USD';
            } else if (currencyText.includes('EUR') || currencyText.includes('Euro')) {
              currency = 'EUR';
            } else if (currencyText.includes('SGD') || currencyText.includes('Singapore')) {
              currency = 'SGD';
            } else if (currencyText.includes('THB') || currencyText.includes('Thai')) {
              currency = 'THB';
            } else if (currencyText.includes('JPY') || currencyText.includes('Yen')) {
              currency = 'JPY';
            } else if (currencyText.includes('CNY') || currencyText.includes('Yuan')) {
              currency = 'CNY';
            } else if (currencyText.includes('GBP') || currencyText.includes('Pound')) {
              currency = 'GBP';
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
                  source: 'KBZ',
                  sourceUrl: this.KBZ_URL,
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
        return this.createErrorResult('No rates found on KBZ website', {
          method: 'webscrape',
          possibleIssue: 'Website structure might have changed',
        });
      }

      return this.createSuccessResult(rates, {
        method: 'webscrape',
        bank: 'KBZ',
      });
    } catch (error) {
      return this.createErrorResult(
        `KBZ website scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { method: 'webscrape' }
      );
    }
  }
}
