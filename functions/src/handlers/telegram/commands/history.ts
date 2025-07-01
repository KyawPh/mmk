import { CommandHandler } from './index';
import { Keyboard, sendMessage } from '../../../utils/telegram';
import { CollectionOrchestrator } from '../../../collectors/CollectionOrchestrator';

export const handleHistory: CommandHandler = async (message, args) => {
  const chatId = message.chat.id;

  // Parse arguments: /history [days] [currency]
  const parts = args.trim().split(' ').filter(Boolean);
  let days = 7; // Default to 7 days
  let currency = 'USD'; // Default to USD

  // Parse days and currency from args
  for (const part of parts) {
    const num = parseInt(part);
    if (!isNaN(num) && num > 0 && num <= 30) {
      days = num;
    } else if (part.length === 3 && /^[A-Z]{3}$/.test(part.toUpperCase())) {
      currency = part.toUpperCase();
    }
  }

  await sendMessage(chatId, `📊 Fetching ${days}-day history for ${currency}...`);

  try {
    const orchestrator = new CollectionOrchestrator();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const historicalRates = await orchestrator.getHistoricalRates(currency, startDate, endDate);

    if (historicalRates.length === 0) {
      await sendMessage(chatId, `❌ No historical data available for ${currency}.`);
      return;
    }

    // Group by source and calculate trends
    const ratesBySource = new Map<string, any[]>();
    historicalRates.forEach((rate) => {
      if (!ratesBySource.has(rate.source)) {
        ratesBySource.set(rate.source, []);
      }
      ratesBySource.get(rate.source)?.push(rate);
    });

    let messageText = `📈 *${currency}/MMK ${days}-Day History*\n\n`;

    // Analyze each source
    for (const [source, rates] of ratesBySource) {
      if (rates.length < 2) {
        continue;
      }

      // Sort by timestamp
      rates.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const oldestRate = rates[0];
      const latestRate = rates[rates.length - 1];
      const change = latestRate.rate - oldestRate.rate;
      const changePercent = (change / oldestRate.rate) * 100;

      // Calculate min/max
      const allRates = rates.map((r) => r.rate);
      const minRate = Math.min(...allRates);
      const maxRate = Math.max(...allRates);
      const avgRate = allRates.reduce((a, b) => a + b, 0) / allRates.length;

      const trend = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
      const sourceEmoji = getSourceEmoji(source);

      messageText += `${sourceEmoji} *${source}*\n`;
      messageText += `${trend} Current: ${formatNumber(latestRate.rate)} MMK\n`;
      messageText += `📊 Change: ${change >= 0 ? '+' : ''}${formatNumber(change)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)\n`;
      messageText += `📈 High: ${formatNumber(maxRate)} | 📉 Low: ${formatNumber(minRate)}\n`;
      messageText += `📊 Average: ${formatNumber(avgRate)}\n\n`;
    }

    // Add simple text chart for CBM rates if available
    const cbmRates = ratesBySource.get('CBM');
    if (cbmRates && cbmRates.length > 1) {
      messageText += '*Trend Chart (CBM)*\n```\n';
      messageText += generateSimpleChart(cbmRates, 10);
      messageText += '```\n';
    }

    messageText += `_Data from last ${days} days_`;

    // Create inline keyboard
    const keyboard = Keyboard.inline([
      [
        { text: '📊 7 Days', callback_data: `history:7:${currency}` },
        { text: '📊 14 Days', callback_data: `history:14:${currency}` },
        { text: '📊 30 Days', callback_data: `history:30:${currency}` },
      ],
      [
        { text: '💵 USD', callback_data: `history:${days}:USD` },
        { text: '💶 EUR', callback_data: `history:${days}:EUR` },
        { text: '🇸🇬 SGD', callback_data: `history:${days}:SGD` },
      ],
      [
        { text: '🔔 Set Alert', callback_data: `alert:${currency}` },
        { text: '💱 Current Rates', callback_data: 'cmd:rates' },
      ],
    ]);

    await sendMessage(chatId, messageText, {
      parseMode: 'Markdown',
      replyMarkup: keyboard,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    await sendMessage(chatId, '❌ Failed to fetch historical data. Please try again later.');
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

function generateSimpleChart(rates: any[], height: number = 10): string {
  if (rates.length < 2) {
    return 'Not enough data';
  }

  const values = rates.map((r) => r.rate);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) {
    return 'No variation in rates';
  }

  const width = Math.min(rates.length, 20);
  const chart: string[] = [];

  // Create chart
  for (let y = height - 1; y >= 0; y--) {
    let line = '';
    for (let x = 0; x < width; x++) {
      const idx = Math.floor((x / width) * rates.length);
      const value = values[idx];
      const normalized = (value - min) / range;
      const charHeight = Math.floor(normalized * height);

      if (charHeight === y) {
        line += '█';
      } else if (charHeight > y) {
        line += '│';
      } else {
        line += ' ';
      }
    }
    chart.push(line);
  }

  // Add bottom line
  chart.push('─'.repeat(width));

  // Add date labels
  const startDate = new Date(rates[0].timestamp);
  const endDate = new Date(rates[rates.length - 1].timestamp);
  const dateLabel = `${startDate.getMonth() + 1}/${startDate.getDate()} - ${endDate.getMonth() + 1}/${endDate.getDate()}`;
  chart.push(dateLabel);

  return chart.join('\n');
}
