// Message templates for consistent formatting

export interface RateData {
  currency: string;
  rate: number;
  buyRate?: number;
  sellRate?: number;
  source: string;
  timestamp: Date;
  change?: number;
  changePercent?: number;
}

export interface AlertData {
  id: string;
  currency: string;
  type: 'above' | 'below';
  targetRate: number;
  currentRate?: number;
  source?: string;
}

export interface SubscriptionData {
  id: string;
  type: 'daily' | 'weekly';
  time: string;
  timezone: string;
  currencies: string[];
}

// Welcome message template
export const welcomeTemplate = (userName: string): string =>
  `
🇲🇲 *Welcome to Myanmar Currency Bot, ${escapeMarkdown(userName)}!*

I provide real-time Myanmar Kyat exchange rates from multiple trusted sources.

*What I can do for you:*
• 💱 Show current exchange rates
• 📈 Display historical trends
• 🔔 Send rate alerts
• 📊 Compare multiple currencies
• 🔮 Predict future rates
• 📬 Daily/weekly updates

*Quick Start:*
Use the buttons below or type /help for commands.

_Choose an action to begin_ 👇
`.trim();

// Rate display template
export const rateTemplate = (rates: RateData[], baseCurrency: string = 'MMK'): string => {
  const groupedByCurrency = new Map<string, RateData[]>();

  // Group rates by currency
  rates.forEach((rate) => {
    if (!groupedByCurrency.has(rate.currency)) {
      groupedByCurrency.set(rate.currency, []);
    }
    groupedByCurrency.get(rate.currency)?.push(rate);
  });

  let message = `💱 *Current Exchange Rates*\n`;
  message += `_Base: 1 ${baseCurrency}_\n\n`;

  // Sort currencies with USD first
  const sortedCurrencies = Array.from(groupedByCurrency.keys()).sort((a, b) => {
    if (a === 'USD') {
      return -1;
    }
    if (b === 'USD') {
      return 1;
    }
    return a.localeCompare(b);
  });

  sortedCurrencies.forEach((currency) => {
    const currencyRates = groupedByCurrency.get(currency) ?? [];
    message += `*${getCurrencyEmoji(currency)} ${currency}/${baseCurrency}*\n`;

    // Sort by source priority
    currencyRates.sort((a, b) => {
      const priority: Record<string, number> = {
        CBM: 1,
        KBZ: 2,
        AYA: 3,
        Yoma: 4,
        'CB Bank': 5,
        'Binance P2P': 6,
      };
      return (priority[a.source] ?? 99) - (priority[b.source] ?? 99);
    });

    currencyRates.forEach((rate) => {
      const sourceEmoji = getSourceEmoji(rate.source);
      if (rate.buyRate && rate.sellRate) {
        message += `${sourceEmoji} ${rate.source}: Buy ${formatNumber(
          rate.buyRate
        )} | Sell ${formatNumber(rate.sellRate)}`;
      } else {
        message += `${sourceEmoji} ${rate.source}: ${formatNumber(rate.rate)}`;
      }

      // Add change indicator if available
      if (rate.change !== undefined && rate.changePercent !== undefined) {
        const arrow = rate.change > 0 ? '📈' : rate.change < 0 ? '📉' : '➡️';
        const sign = rate.change > 0 ? '+' : '';
        message += ` ${arrow} ${sign}${rate.changePercent.toFixed(2)}%`;
      }

      message += '\n';
    });

    message += '\n';
  });

  // Add timestamp
  const latestTimestamp = Math.max(...rates.map((r) => r.timestamp.getTime()));
  message += `_Last updated: ${formatDateTime(new Date(latestTimestamp))}_`;

  return message;
};

// Alert notification template
export const alertTriggeredTemplate = (alert: AlertData): string => {
  const emoji = alert.type === 'above' ? '📈' : '📉';
  const action = alert.type === 'above' ? 'risen above' : 'fallen below';

  let message = `${emoji} *Rate Alert Triggered!*\n\n`;
  message += `${getCurrencyEmoji(alert.currency)} *${alert.currency}/MMK* has ${action} your target rate!\n\n`;
  message += `🎯 Target Rate: ${formatNumber(alert.targetRate)} MMK\n`;

  if (alert.currentRate) {
    message += `💱 Current Rate: ${formatNumber(alert.currentRate)} MMK\n`;
    const diff = alert.currentRate - alert.targetRate;
    const diffPercent = (Math.abs(diff) / alert.targetRate) * 100;
    message += `📊 Difference: ${diff > 0 ? '+' : ''}${formatNumber(diff)} (${
      diff > 0 ? '+' : '-'
    }${diffPercent.toFixed(2)}%)\n`;
  }

  if (alert.source) {
    message += `🏦 Source: ${alert.source}\n`;
  }

  message += `\n_Alert ID: ${alert.id.slice(-6)}_`;

  return message;
};

// Subscription confirmation template
export const subscriptionConfirmTemplate = (subscription: SubscriptionData): string => {
  const emoji = subscription.type === 'daily' ? '📅' : '📊';
  const frequency = subscription.type === 'daily' ? 'Daily' : 'Weekly';

  let message = `✅ *${frequency} Subscription Created!*\n\n`;
  message += `${emoji} You'll receive ${subscription.type} updates at *${subscription.time} ${subscription.timezone}*\n\n`;
  message += `*Currencies:* ${subscription.currencies
    .map((c) => `${getCurrencyEmoji(c)} ${c}`)
    .join(', ')}\n\n`;
  message += `_Subscription ID: ${subscription.id.slice(-6)}_\n`;
  message += `_Use /subscribe to manage your subscriptions_`;

  return message;
};

// Error message template
export const errorTemplate = (error: string, suggestion?: string): string => {
  let message = `❌ *Error*\n\n${escapeMarkdown(error)}`;
  if (suggestion) {
    message += `\n\n💡 *Suggestion:* ${escapeMarkdown(suggestion)}`;
  }
  return message;
};

// Success message template
export const successTemplate = (action: string, details?: string): string => {
  let message = `✅ *${escapeMarkdown(action)}*`;
  if (details) {
    message += `\n\n${escapeMarkdown(details)}`;
  }
  return message;
};

// Loading message template
export const loadingTemplate = (action: string): string => {
  const emojis = ['⏳', '⏰', '⌛', '🔄', '⚡'];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  return `${randomEmoji} ${escapeMarkdown(action)}...`;
};

// Help section template
export const helpSectionTemplate = (
  title: string,
  commands: Array<{ command: string; description: string; example?: string }>
): string => {
  let message = `*${escapeMarkdown(title)}*\n\n`;

  commands.forEach((cmd) => {
    message += `• \`${cmd.command}\` - ${escapeMarkdown(cmd.description)}\n`;
    if (cmd.example) {
      message += `  _Example: ${cmd.example}_\n`;
    }
  });

  return message;
};

// Statistics template
export const statsTemplate = (
  title: string,
  stats: Array<{ label: string; value: string | number; emoji?: string }>
): string => {
  let message = `📊 *${escapeMarkdown(title)}*\n\n`;

  stats.forEach((stat) => {
    const emoji = stat.emoji ?? '•';
    message += `${emoji} *${escapeMarkdown(stat.label)}:* ${stat.value}\n`;
  });

  return message;
};

// Inline query result template
export const inlineResultTemplate = (rate: RateData): string =>
  `💱 ${rate.currency}/MMK: ${formatNumber(rate.rate)} (${rate.source})`;

// Helper functions
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&');
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

function getCurrencyEmoji(currency: string): string {
  const emojis: Record<string, string> = {
    USD: '💵',
    EUR: '💶',
    SGD: '🇸🇬',
    THB: '🇹🇭',
    CNY: '🇨🇳',
    GBP: '💷',
    JPY: '💴',
    AUD: '🇦🇺',
    MMK: '🇲🇲',
  };
  return emojis[currency] ?? '💱';
}

function getSourceEmoji(source: string): string {
  const emojis: Record<string, string> = {
    CBM: '🏛️',
    KBZ: '🏦',
    AYA: '🏦',
    Yoma: '🏦',
    'CB Bank': '🏦',
    'Binance P2P': '💹',
  };
  return emojis[source] ?? '💱';
}

// Export helper functions for use in other modules
export const templateHelpers = {
  escapeMarkdown,
  formatNumber,
  formatDateTime,
  getCurrencyEmoji,
  getSourceEmoji,
};
