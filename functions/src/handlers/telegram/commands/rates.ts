import { CommandHandler } from './index';
import { Keyboard, sendMessage } from '../../../utils/telegram';
import { CollectionOrchestrator } from '../../../collectors/CollectionOrchestrator';

interface LatestRate {
  source: string;
  currency: string;
  rate: number;
  buyRate?: number;
  sellRate?: number;
  timestamp: Date;
}

export const handleRates: CommandHandler = async (message, args) => {
  const chatId = message.chat.id;

  // Send loading message
  await sendMessage(chatId, '⏳ Fetching latest exchange rates...');

  try {
    // Parse currency from args (default to all if not specified)
    const requestedCurrency = args.trim().toUpperCase() || null;

    // Get latest rates from Firestore
    const orchestrator = new CollectionOrchestrator();
    const rates = await orchestrator.getLatestRates(requestedCurrency || undefined);

    if (rates.length === 0) {
      await sendMessage(
        chatId,
        '❌ No exchange rates available at the moment. Please try again later.'
      );
      return;
    }

    // Group rates by currency
    const ratesByCurrency = new Map<string, LatestRate[]>();
    rates.forEach((rate) => {
      const currency = rate.currency;
      if (!ratesByCurrency.has(currency)) {
        ratesByCurrency.set(currency, []);
      }
      ratesByCurrency.get(currency)?.push(rate as LatestRate);
    });

    // Format the message
    let messageText = '💱 *Current Exchange Rates*\n\n';

    // Sort currencies with USD first
    const sortedCurrencies = Array.from(ratesByCurrency.keys()).sort((a, b) => {
      if (a === 'USD') {
        return -1;
      }
      if (b === 'USD') {
        return 1;
      }
      return a.localeCompare(b);
    });

    for (const currency of sortedCurrencies) {
      const currencyRates = ratesByCurrency.get(currency) || [];

      // Skip USDT_REMITTANCE and other special rates in main display
      if (currency.includes('_')) {
        continue;
      }

      messageText += `*${currency}/MMK*\n`;

      // Sort by source priority (CBM first)
      currencyRates.sort((a, b) => {
        if (a.source === 'CBM') {
          return -1;
        }
        if (b.source === 'CBM') {
          return 1;
        }
        return a.source.localeCompare(b.source);
      });

      currencyRates.forEach((rate) => {
        const sourceEmoji = getSourceEmoji(rate.source);

        if (rate.buyRate && rate.sellRate) {
          messageText += `${sourceEmoji} ${rate.source}: Buy ${formatNumber(rate.buyRate)} | Sell ${formatNumber(rate.sellRate)}\n`;
        } else {
          messageText += `${sourceEmoji} ${rate.source}: ${formatNumber(rate.rate)}\n`;
        }
      });

      messageText += '\n';
    }

    // Add special rates if available
    const specialRates = rates.filter((r) => r.currency.includes('_'));
    if (specialRates.length > 0) {
      messageText += '*Special Rates*\n';
      specialRates.forEach((rate) => {
        if (rate.currency === 'USD_REMITTANCE') {
          messageText += `💸 Worker Remittance: 1 USD = ${formatNumber(rate.rate)} MMK\n`;
        }
      });
      messageText += '\n';
    }

    // Add last update time
    const latestTimestamp = Math.max(...rates.map((r) => new Date(r.timestamp).getTime()));
    const lastUpdate = new Date(latestTimestamp);
    messageText += `_Last updated: ${formatDateTime(lastUpdate)}_`;

    // Create inline keyboard
    const keyboard = Keyboard.inline([
      [
        { text: '🔄 Refresh', callback_data: 'rates:refresh' },
        { text: '📊 Compare', callback_data: 'cmd:compare' },
      ],
      [
        { text: '📈 History', callback_data: 'cmd:history' },
        { text: '🔔 Set Alert', callback_data: 'cmd:alert' },
      ],
    ]);

    await sendMessage(chatId, messageText, {
      parseMode: 'Markdown',
      replyMarkup: keyboard,
    });
  } catch (error) {
    console.error('Error fetching rates:', error);
    await sendMessage(chatId, '❌ Failed to fetch exchange rates. Please try again later.');
  }
};

function getSourceEmoji(source: string): string {
  const emojiMap: Record<string, string> = {
    CBM: '🏛️',
    KBZ: '🏦',
    AYA: '🏦',
    Yoma: '🏦',
    'CB Bank': '🏦',
    'Binance P2P': '💹',
  };
  return emojiMap[source] || '💱';
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Yangon',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
