// Shareable rate cards for social media and inline sharing

import { formatDuration, formatNumber } from './formatting';
import { getFreshnessIndicator, getTrendIndicator } from './indicators';

export interface RateCardData {
  currency: string;
  rate: number;
  buyRate?: number;
  sellRate?: number;
  source: string;
  timestamp: Date;
  change?: number;
  changePercent?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
}

export interface ComparisonCardData {
  currencies: Array<{
    currency: string;
    rate: number;
    change: number;
    changePercent: number;
  }>;
  baseCurrency: string;
  timestamp: Date;
}

// Generate a shareable rate card
export function generateRateCard(data: RateCardData): string {
  const { currency, source, timestamp } = data;
  const trend = data.changePercent ? getTrendIndicator(data.changePercent) : '';
  const freshness = getFreshnessIndicator(timestamp);

  let card = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
  card += `┃  💱 ${currency}/MMK Exchange Rate   ┃\n`;
  card += `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n`;

  // Main rate display
  if (data.buyRate && data.sellRate) {
    card += `┃  BUY:  ${formatNumber(data.buyRate).padStart(12)}  ${trend}     ┃\n`;
    card += `┃  SELL: ${formatNumber(data.sellRate).padStart(12)}       ┃\n`;
    const spread = ((data.sellRate - data.buyRate) / data.buyRate) * 100;
    card += `┃  Spread: ${spread.toFixed(2)}%                ┃\n`;
  } else {
    card += `┃  Rate: ${formatNumber(data.rate).padStart(12)}  ${trend}     ┃\n`;
  }

  card += `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n`;

  // Change information
  if (data.changePercent !== undefined) {
    const changeSign = data.changePercent >= 0 ? '+' : '';
    const changeEmoji = data.changePercent >= 0 ? '📈' : '📉';
    card += `${`┃  ${changeEmoji} 24h: ${changeSign}${data.changePercent.toFixed(2)}%`.padEnd(31)}┃\n`;
  }

  // 24h high/low
  if (data.high24h && data.low24h) {
    card += `${`┃  H: ${formatNumber(data.high24h)} L: ${formatNumber(data.low24h)}`.padEnd(31)}┃\n`;
  }

  // Volume
  if (data.volume24h) {
    card += `${`┃  Vol: ${formatCompactNumber(data.volume24h)}`.padEnd(31)}┃\n`;
  }

  card += `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n`;
  card += `┃  Source: ${source.padEnd(15)} ${freshness}   ┃\n`;
  card += `${`┃  ${formatCardTimestamp(timestamp)}`.padEnd(31)}┃\n`;
  card += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n`;
  card += `\n📲 @MMKCurrencyBot`;

  return `\`\`\`\n${card}\n\`\`\``;
}

// Generate a multi-currency comparison card
export function generateComparisonCard(data: ComparisonCardData): string {
  const { currencies, baseCurrency, timestamp } = data;

  let card = `╔═══════════════════════════════════╗\n`;
  card += `║   📊 Currency Comparison          ║\n`;
  card += `║   Base: 1 ${baseCurrency}                    ║\n`;
  card += `╠═══════════════════════════════════╣\n`;

  // Sort by rate value
  const sorted = [...currencies].sort((a, b) => b.rate - a.rate);

  sorted.forEach((curr, index) => {
    const trend = getTrendIndicator(curr.changePercent);
    const changeSign = curr.changePercent >= 0 ? '+' : '';

    card += `║ ${curr.currency} │ ${formatNumber(curr.rate).padStart(10)} │ ${changeSign}${curr.changePercent.toFixed(1)}% ${trend} ║\n`;

    if (index < sorted.length - 1) {
      card += `║ ───┼──────────────┼──────────║\n`;
    }
  });

  card += `╠═══════════════════════════════════╣\n`;
  card += `${`║ ${formatCardTimestamp(timestamp)}`.padEnd(35)}║\n`;
  card += `╚═══════════════════════════════════╝\n`;
  card += `\n💬 Share: @MMKCurrencyBot`;

  return `\`\`\`\n${card}\n\`\`\``;
}

// Generate a mini rate card for inline queries
export function generateMiniRateCard(data: RateCardData): string {
  const trend = data.changePercent ? getTrendIndicator(data.changePercent) : '';
  const changeText = data.changePercent
    ? `(${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(1)}%)`
    : '';

  return `${data.currency}/MMK: ${formatNumber(data.rate)} ${changeText} ${trend} - ${data.source}`;
}

// Generate an alert card
export function generateAlertCard(alert: {
  currency: string;
  type: 'above' | 'below';
  targetRate: number;
  currentRate: number;
  triggered: boolean;
}): string {
  const emoji = alert.type === 'above' ? '📈' : '📉';
  const status = alert.triggered ? '✅ TRIGGERED' : '⏳ WAITING';
  const diff = alert.currentRate - alert.targetRate;
  const diffPercent = (diff / alert.targetRate) * 100;

  let card = `┌─────────────────────────┐\n`;
  card += `│  ${emoji} RATE ALERT ${emoji}     │\n`;
  card += `├─────────────────────────┤\n`;
  card += `│ ${alert.currency}/MMK ${alert.type.toUpperCase()}        │\n`;
  card += `│ Target: ${formatNumber(alert.targetRate).padStart(10)}    │\n`;
  card += `│ Current: ${formatNumber(alert.currentRate).padStart(9)}    │\n`;
  card += `│ Diff: ${diff >= 0 ? '+' : ''}${diffPercent.toFixed(1)}%          │\n`;
  card += `├─────────────────────────┤\n`;
  card += `│ Status: ${status}     │\n`;
  card += `└─────────────────────────┘`;

  return `\`\`\`\n${card}\n\`\`\``;
}

// Generate a subscription summary card
export function generateSubscriptionCard(subscription: {
  type: 'daily' | 'weekly';
  time: string;
  timezone: string;
  currencies: string[];
  nextDelivery: Date;
}): string {
  const emoji = subscription.type === 'daily' ? '📅' : '📊';
  const timeUntilNext = formatDuration(
    Math.floor((subscription.nextDelivery.getTime() - Date.now()) / 1000)
  );

  let card = `╭───────────────────────────╮\n`;
  card += `│ ${emoji} ${subscription.type.toUpperCase()} SUBSCRIPTION │\n`;
  card += `├───────────────────────────┤\n`;
  card += `│ Time: ${subscription.time} ${subscription.timezone}     │\n`;
  card += `│ Currencies: ${subscription.currencies.length} selected   │\n`;
  card += `│ ${subscription.currencies.join(', ').padEnd(23)}│\n`;
  card += `├───────────────────────────┤\n`;
  card += `│ Next in: ${timeUntilNext.padEnd(15)}│\n`;
  card += `╰───────────────────────────╯`;

  return `\`\`\`\n${card}\n\`\`\``;
}

// Generate a market summary card
export function generateMarketSummaryCard(summary: {
  topGainers: Array<{ currency: string; changePercent: number }>;
  topLosers: Array<{ currency: string; changePercent: number }>;
  mostTraded: Array<{ currency: string; volume: number }>;
  timestamp: Date;
}): string {
  let card = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
  card += `┃   📈 MARKET SUMMARY 📉    ┃\n`;
  card += `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n`;

  // Top gainers
  card += `┃ 🚀 TOP GAINERS           ┃\n`;
  summary.topGainers.slice(0, 3).forEach((item) => {
    const sign = item.changePercent >= 0 ? '+' : '';
    card += `${`┃ ${item.currency} ${sign}${item.changePercent.toFixed(1)}%`.padEnd(27)}┃\n`;
  });

  card += `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n`;

  // Top losers
  card += `┃ 📉 TOP LOSERS            ┃\n`;
  summary.topLosers.slice(0, 3).forEach((item) => {
    card += `${`┃ ${item.currency} ${item.changePercent.toFixed(1)}%`.padEnd(27)}┃\n`;
  });

  card += `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n`;

  // Most traded
  card += `┃ 💹 MOST TRADED           ┃\n`;
  summary.mostTraded.slice(0, 3).forEach((item) => {
    card += `${`┃ ${item.currency} Vol: ${formatCompactNumber(item.volume)}`.padEnd(27)}┃\n`;
  });

  card += `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n`;
  card += `${`┃ ${formatCardTimestamp(summary.timestamp)}`.padEnd(27)}┃\n`;
  card += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`;

  return `\`\`\`\n${card}\n\`\`\``;
}

// Generate an inline query result card
export function generateInlineCard(
  query: string,
  results: Array<RateCardData>
): {
  title: string;
  description: string;
  message: string;
} {
  if (results.length === 0) {
    return {
      title: 'No results found',
      description: `No rates found for "${query}"`,
      message: `No exchange rate data available for "${query}"`,
    };
  }

  const primaryResult = results[0];
  const trend = primaryResult?.changePercent ? getTrendIndicator(primaryResult.changePercent) : '';

  const title = `${primaryResult?.currency}/MMK: ${formatNumber(primaryResult?.rate ?? 0)} ${trend}`;
  const description = `${primaryResult?.source} - ${primaryResult?.changePercent ? `${primaryResult.changePercent >= 0 ? '+' : ''}${primaryResult.changePercent.toFixed(1)}%` : 'No change data'}`;

  // Build full message
  let message = primaryResult ? generateRateCard(primaryResult) : '';

  // Add other sources if available
  if (results.length > 1) {
    message += '\n\nOther sources:\n';
    results.slice(1, 4).forEach((result) => {
      message += `• ${result.source}: ${formatNumber(result.rate)}\n`;
    });
  }

  return { title, description, message };
}

// Helper functions
function formatCardTimestamp(date: Date): string {
  return `${date.toLocaleString('en-US', {
    timeZone: 'Asia/Yangon',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} MMT`;
}

function formatCompactNumber(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toFixed(0);
}
