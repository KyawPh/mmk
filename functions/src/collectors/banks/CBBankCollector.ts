import { BaseCollector } from '../BaseCollector';
import { CollectorResult, ExchangeRate } from '../../types/collectors';
import * as cheerio from 'cheerio';

export class CBBankCollector extends BaseCollector {
  name = 'CB Bank';
  priority = 'high' as const;

  private readonly CB_URL = 'https://www.cbbank.com.mm/en';
  private readonly CB_RATES_URL = 'https://www.cbbank.com.mm/en/exchange-rates'; // Potential rates page
  private readonly CB_API = 'https://www.cbbank.com.mm/api/rates'; // Potential API endpoint

  async collect(): Promise<CollectorResult> {
    try {
      const { result, time } = await this.withTiming(() => this.collectRates());

      if (result.success && result.metadata) {
        result.metadata.collectionTime = time;
      }

      return result;
    } catch (error) {
      console.error('CB Bank collector error:', error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  private async collectRates(): Promise<CollectorResult> {
    // Try different approaches in order
    try {
      // Try API first
      return await this.collectFromAPI();
    } catch {
      try {
        // Try rates page
        return await this.collectFromRatesPage();
      } catch {
        // Fall back to main page
        return await this.collectFromMainPage();
      }
    }
  }

  private async collectFromAPI(): Promise<CollectorResult> {
    try {
      const response = await this.axios.get<any>(this.CB_API);
      const data = response.data;

      if (!data) {
        throw new Error('Invalid API response');
      }

      const timestamp = new Date();
      const rates: ExchangeRate[] = [];

      // Handle different possible API response formats
      const ratesData = data.rates || data.data || data;

      if (Array.isArray(ratesData)) {
        for (const item of ratesData) {
          if (item.currency && (item.rate || (item.buy && item.sell))) {
            const currency = item.currency.toUpperCase();
            const buyRate = item.buy ? this.parseNumber(item.buy.toString()) : undefined;
            const sellRate = item.sell ? this.parseNumber(item.sell.toString()) : undefined;
            const rate = item.rate
              ? this.parseNumber(item.rate.toString())
              : buyRate && sellRate
                ? (buyRate + sellRate) / 2
                : 0;

            if (rate > 0) {
              const exchangeRate: ExchangeRate = {
                currency,
                rate,
                buyRate,
                sellRate,
                timestamp,
                source: 'CB Bank',
                sourceUrl: this.CB_API,
                lastUpdated: new Date(),
              };

              if (this.validateRate(exchangeRate)) {
                rates.push(exchangeRate);
              }
            }
          }
        }
      }

      if (rates.length === 0) {
        throw new Error('No valid rates found in API response');
      }

      return this.createSuccessResult(rates, {
        method: 'api',
      });
    } catch (error) {
      throw new Error(
        `API collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async collectFromRatesPage(): Promise<CollectorResult> {
    try {
      const response = await this.axios.get<string>(this.CB_RATES_URL);
      return this.parseWebsiteRates(response.data, this.CB_RATES_URL);
    } catch (error) {
      throw new Error(
        `Rates page collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async collectFromMainPage(): Promise<CollectorResult> {
    try {
      const response = await this.axios.get<string>(this.CB_URL);
      return this.parseWebsiteRates(response.data, this.CB_URL);
    } catch (error) {
      return this.createErrorResult(
        `CB Bank website scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { method: 'webscrape' }
      );
    }
  }

  private parseWebsiteRates(html: string, sourceUrl: string): CollectorResult {
    const $ = cheerio.load(html);
    const rates: ExchangeRate[] = [];
    const timestamp = new Date();

    // Try various table selectors
    $(
      'table.exchange-rates tr, table.rates tr, .exchange-rate-table tr, .currency-exchange tr, table tr'
    ).each((_index, element) => {
      const cells = $(element).find('td');
      if (cells.length >= 2) {
        // Check if this row contains exchange rate data
        const firstCellText = $(cells[0]).text().trim();
        const hasCurrency =
          firstCellText.match(/USD|EUR|SGD|THB|CNY|GBP|JPY|AUD/i) ||
          firstCellText.match(/Dollar|Euro|Singapore|Thai|Yuan|Pound|Yen/i);

        if (hasCurrency) {
          let currency = '';
          let buyRate = 0;
          let sellRate = 0;

          // Extract currency
          const currencyMatch = firstCellText.match(/\(([A-Z]{3})\)|([A-Z]{3})$/);
          if (currencyMatch) {
            currency = currencyMatch[1] || currencyMatch[2] || '';
          } else {
            // Map common names to codes
            if (firstCellText.match(/Dollar|USD/i)) {
              currency = 'USD';
            } else if (firstCellText.match(/Euro|EUR/i)) {
              currency = 'EUR';
            } else if (firstCellText.match(/Singapore|SGD/i)) {
              currency = 'SGD';
            } else if (firstCellText.match(/Thai|Baht|THB/i)) {
              currency = 'THB';
            } else if (firstCellText.match(/Yuan|Chinese|CNY/i)) {
              currency = 'CNY';
            } else if (firstCellText.match(/Pound|Sterling|GBP/i)) {
              currency = 'GBP';
            } else if (firstCellText.match(/Yen|Japanese|JPY/i)) {
              currency = 'JPY';
            } else if (firstCellText.match(/Australian|AUD/i)) {
              currency = 'AUD';
            }
          }

          // Extract rates based on column count
          if (cells.length === 2) {
            // Single rate column
            const rateText = $(cells[1]).text().trim();
            const rate = this.parseNumber(rateText);
            if (currency && rate > 0) {
              rates.push({
                currency,
                rate,
                timestamp,
                source: 'CB Bank',
                sourceUrl,
                lastUpdated: new Date(),
              });
            }
          } else if (cells.length >= 3) {
            // Buy and sell columns
            buyRate = this.parseNumber($(cells[1]).text().trim());
            sellRate = this.parseNumber($(cells[2]).text().trim());
            const rate = (buyRate + sellRate) / 2;

            if (currency && rate > 0) {
              const exchangeRate: ExchangeRate = {
                currency,
                rate,
                buyRate,
                sellRate,
                timestamp,
                source: 'CB Bank',
                sourceUrl,
                lastUpdated: new Date(),
              };

              if (this.validateRate(exchangeRate)) {
                rates.push(exchangeRate);
              }
            }
          }
        }
      }
    });

    // Alternative: Look for rate widgets or cards
    if (rates.length === 0) {
      $('.rate-widget, .currency-widget, .exchange-box, .rate-display').each((_index, element) => {
        const $elem = $(element);
        const text = $elem.text();

        // Try to extract currency and rate from text
        const matches = text.match(/([A-Z]{3})\s*[:=]\s*([\d,]+)/g);
        if (matches) {
          matches.forEach((match) => {
            const parts = match.match(/([A-Z]{3})\s*[:=]\s*([\d,]+)/);
            if (parts) {
              const currency = parts[1] || '';
              const rate = this.parseNumber(parts[2] || '0');
              if (rate > 0) {
                const exchangeRate: ExchangeRate = {
                  currency,
                  rate,
                  timestamp,
                  source: 'CB Bank',
                  sourceUrl,
                  lastUpdated: new Date(),
                };

                if (this.validateRate(exchangeRate)) {
                  rates.push(exchangeRate);
                }
              }
            }
          });
        }
      });
    }

    if (rates.length === 0) {
      return this.createErrorResult('No rates found on CB Bank website', {
        method: 'webscrape',
        possibleIssue: 'CB Bank may not publish rates publicly or structure has changed',
        sourceUrl,
      });
    }

    return this.createSuccessResult(rates, {
      method: 'webscrape',
      bank: 'CB Bank',
      sourceUrl,
    });
  }
}
