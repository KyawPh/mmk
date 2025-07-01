import { CommandHandler } from './index';
import { Keyboard, sendMessage } from '../../../utils/telegram';
import { CollectionOrchestrator } from '../../../collectors/CollectionOrchestrator';

export const handleCompare: CommandHandler = async (message, args) => {
  const chatId = message.chat.id;

  // Parse arguments: /compare [currency1] [currency2] ...
  const currencies = args
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((c) => c.toUpperCase())
    .filter((c) => /^[A-Z]{3}$/.test(c));

  // Default to common currencies if none specified
  if (currencies.length === 0) {
    currencies.push('USD', 'EUR', 'SGD');
  } else if (currencies.length === 1) {
    // If only one currency specified, compare with USD
    if (currencies[0] !== 'USD') {
      currencies.push('USD');
    } else {
      currencies.push('EUR');
    }
  }

  // Limit to 5 currencies
  if (currencies.length > 5) {
    await sendMessage(
      chatId,
      `❌ Please compare up to 5 currencies at a time.\nUsage: \`/compare USD EUR SGD\``,
      { parseMode: 'Markdown' }
    );
    return;
  }

  await sendMessage(chatId, `📊 Comparing ${currencies.join(', ')}...`);

  try {
    const orchestrator = new CollectionOrchestrator();
    const allRates = await orchestrator.getLatestRates();

    if (allRates.length === 0) {
      await sendMessage(chatId, '❌ No exchange rates available at the moment.');
      return;
    }

    // Group rates by currency and source
    const ratesByCurrency = new Map<string, Map<string, any>>();

    for (const currency of currencies) {
      const currencyRates = allRates.filter((r) => r.currency === currency);
      const ratesBySource = new Map<string, any>();

      currencyRates.forEach((rate) => {
        ratesBySource.set(rate.source, rate);
      });

      if (ratesBySource.size > 0) {
        ratesByCurrency.set(currency, ratesBySource);
      }
    }

    if (ratesByCurrency.size === 0) {
      await sendMessage(chatId, `❌ No rates found for currencies: ${currencies.join(', ')}`);
      return;
    }

    // Get all unique sources
    const allSources = new Set<string>();
    ratesByCurrency.forEach((rates) => {
      rates.forEach((_, source) => allSources.add(source));
    });

    // Sort sources with CBM first
    const sortedSources = Array.from(allSources).sort((a, b) => {
      if (a === 'CBM') {
        return -1;
      }
      if (b === 'CBM') {
        return 1;
      }
      return a.localeCompare(b);
    });

    let messageText = '📊 *Currency Comparison*\n\n';

    // Add header
    messageText += '```\n';
    messageText += 'Source    ';
    currencies.forEach((currency) => {
      if (ratesByCurrency.has(currency)) {
        messageText += `│ ${currency.padEnd(10)} `;
      }
    });
    messageText += '\n';
    messageText += '─'.repeat(10);
    currencies.forEach((currency) => {
      if (ratesByCurrency.has(currency)) {
        messageText += `┼${'─'.repeat(12)}`;
      }
    });
    messageText += '\n';

    // Add rates for each source
    sortedSources.forEach((source) => {
      const sourceDisplay = source.padEnd(9);
      messageText += `${sourceDisplay} `;

      currencies.forEach((currency) => {
        if (ratesByCurrency.has(currency)) {
          const currencyRates = ratesByCurrency.get(currency);
          const rate = currencyRates?.get(source);

          if (rate) {
            // Use buy rate if available, otherwise use rate
            const displayRate = rate.buyRate ?? rate.rate;
            messageText += `│ ${formatCompactNumber(displayRate).padEnd(10)} `;
          } else {
            messageText += `│ ${'N/A'.padEnd(10)} `;
          }
        }
      });
      messageText += '\n';
    });

    messageText += '```\n\n';

    // Add percentage differences from CBM rate
    const cbmRates = new Map<string, number>();
    currencies.forEach((currency) => {
      const rates = ratesByCurrency.get(currency);
      const cbmRate = rates?.get('CBM');
      if (cbmRate) {
        cbmRates.set(currency, cbmRate.rate);
      }
    });

    if (cbmRates.size > 0) {
      messageText += '*Difference from CBM Rate*\n';

      sortedSources.forEach((source) => {
        if (source === 'CBM') {
          return;
        }

        let hasData = false;
        let sourceDiffs = `${source}: `;

        currencies.forEach((currency) => {
          if (ratesByCurrency.has(currency) && cbmRates.has(currency)) {
            const rates = ratesByCurrency.get(currency);
            const rate = rates?.get(source);
            const cbmRate = cbmRates.get(currency);

            if (rate && cbmRate) {
              const displayRate = rate.buyRate ?? rate.rate;
              const diff = displayRate - cbmRate;
              const diffPercent = (diff / cbmRate) * 100;
              const sign = diff >= 0 ? '+' : '';

              sourceDiffs += `${currency} ${sign}${diffPercent.toFixed(2)}% | `;
              hasData = true;
            }
          }
        });

        if (hasData) {
          messageText += `${sourceDiffs.slice(0, -3)}\n`;
        }
      });
    }

    // Add timestamp
    const latestTimestamp = Math.max(
      ...Array.from(ratesByCurrency.values())
        .flatMap((rates) => Array.from(rates.values()))
        .map((r) => new Date(r.timestamp).getTime())
    );
    messageText += `\n_Last updated: ${formatDateTime(new Date(latestTimestamp))}_`;

    // Create keyboard for actions
    const keyboard = Keyboard.inline([
      [
        { text: '🔄 Refresh', callback_data: 'compare:refresh' },
        { text: '📈 History', callback_data: 'cmd:history' },
      ],
      [
        { text: '🔔 Set Alert', callback_data: 'cmd:alert' },
        { text: '💱 All Rates', callback_data: 'cmd:rates' },
      ],
    ]);

    await sendMessage(chatId, messageText, {
      parseMode: 'Markdown',
      replyMarkup: keyboard,
    });
  } catch (error) {
    console.error('Error comparing currencies:', error);
    await sendMessage(chatId, '❌ Failed to compare currencies. Please try again later.');
  }
};

function formatCompactNumber(num: number): string {
  return num.toFixed(2);
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Yangon',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
