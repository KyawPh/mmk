// Graphics generation for rate comparisons and visual representations

import { getCurrencyStrengthIndicator, getTrendIndicator } from './indicators';
import { formatNumber } from './formatting';

export interface RateComparison {
  currency: string;
  sources: Array<{
    name: string;
    rate: number;
    buyRate?: number;
    sellRate?: number;
    timestamp: Date;
  }>;
}

export interface CurrencyComparison {
  baseCurrency: string;
  targetCurrencies: Array<{
    currency: string;
    rate: number;
    change: number;
    changePercent: number;
  }>;
}

// Generate a visual rate comparison across sources
export function generateRateComparisonGraphic(comparison: RateComparison): string {
  const { currency, sources } = comparison;

  if (sources.length === 0) {
    return `No rate data available for ${currency}`;
  }

  // Find min and max rates
  const rates = sources.map((s) => s.buyRate ?? s.rate);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const range = maxRate - minRate;
  const rangePercent = (range / minRate) * 100;

  let graphic = `╔═══════════════════════════════════════╗\n`;
  graphic += `║     ${currency}/MMK Rate Comparison      ║\n`;
  graphic += `╠═══════════════════════════════════════╣\n`;

  // Sort sources by rate
  const sortedSources = [...sources].sort((a, b) => (a.buyRate ?? a.rate) - (b.buyRate ?? b.rate));

  // Add source comparisons
  sortedSources.forEach((source) => {
    const rate = source.buyRate ?? source.rate;
    const position = range === 0 ? 0.5 : (rate - minRate) / range;
    const barLength = Math.floor(position * 20);
    const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);

    const sourceLabel = source.name.padEnd(12);
    const rateLabel = formatNumber(rate).padStart(10);

    // Calculate difference from best rate
    const diff = rate - minRate;
    const diffPercent = (diff / minRate) * 100;
    const diffLabel = diff === 0 ? 'BEST' : `+${diffPercent.toFixed(1)}%`;

    graphic += `║ ${sourceLabel} ${bar} ${rateLabel} ${diffLabel.padStart(6)} ║\n`;
  });

  graphic += `╠═══════════════════════════════════════╣\n`;

  // Add summary
  graphic += `${`║ Range: ${formatNumber(minRate)} - ${formatNumber(maxRate)} (${rangePercent.toFixed(1)}%)`.padEnd(
    39
  )}║\n`;
  const bestSource = sortedSources[0];
  if (bestSource) {
    graphic += `${`║ Best:  ${bestSource.name.padEnd(12)} @ ${formatNumber(bestSource.buyRate ?? bestSource.rate)}`.padEnd(
      39
    )}║\n`;
  }
  graphic += `╚═══════════════════════════════════════╝`;

  return `\`\`\`\n${graphic}\n\`\`\``;
}

// Generate a currency strength comparison
export function generateCurrencyStrengthGraphic(
  currencies: Array<{ currency: string; changePercent: number }>,
  period: string = '24h'
): string {
  if (currencies.length === 0) {
    return 'No currency data available';
  }

  // Sort by change percentage
  const sorted = [...currencies].sort((a, b) => b.changePercent - a.changePercent);

  let graphic = `┌─────────────────────────────────────┐\n`;
  graphic += `│    Currency Strength (${period})       │\n`;
  graphic += `├─────────────────────────────────────┤\n`;

  sorted.forEach((curr) => {
    const indicator = getCurrencyStrengthIndicator(curr.changePercent);
    const trend = getTrendIndicator(curr.changePercent);
    const bar = generateStrengthBar(curr.changePercent, 15);

    const currLabel = curr.currency.padEnd(4);
    const changeLabel = `${(curr.changePercent >= 0 ? '+' : '') + curr.changePercent.toFixed(2)}%`;

    graphic += `│ ${indicator} ${currLabel} ${bar} ${changeLabel.padStart(7)} ${trend} │\n`;
  });

  graphic += `└─────────────────────────────────────┘`;

  return `\`\`\`\n${graphic}\n\`\`\``;
}

// Generate a rate spread visualization
export function generateRateSpreadGraphic(
  spreads: Array<{
    source: string;
    currency: string;
    buyRate: number;
    sellRate: number;
  }>
): string {
  if (spreads.length === 0) {
    return 'No spread data available';
  }

  let graphic = `╭───────────────────────────────────────╮\n`;
  graphic += `│         Buy/Sell Spreads              │\n`;
  graphic += `├───────────────────────────────────────┤\n`;

  spreads.forEach((item) => {
    const spread = item.sellRate - item.buyRate;
    const spreadPercent = (spread / item.buyRate) * 100;
    const bar = generateSpreadBar(spreadPercent, 20);

    const label = `${item.source} ${item.currency}`.padEnd(15);
    const spreadLabel = `${spreadPercent.toFixed(2)}%`;

    graphic += `│ ${label} ${bar} ${spreadLabel.padStart(6)} │\n`;
    graphic += `│ Buy: ${formatNumber(item.buyRate).padStart(10)} Sell: ${formatNumber(item.sellRate).padStart(10)}     │\n`;

    if (spreads.indexOf(item) < spreads.length - 1) {
      graphic += `├───────────────────────────────────────┤\n`;
    }
  });

  graphic += `╰───────────────────────────────────────╯`;

  return `\`\`\`\n${graphic}\n\`\`\``;
}

// Generate a multi-currency comparison matrix
export function generateCurrencyMatrix(
  currencies: string[],
  getRateFunc: (from: string, to: string) => number | null
): string {
  const size = Math.min(currencies.length, 6); // Limit to 6x6 matrix
  const limitedCurrencies = currencies.slice(0, size);

  let matrix = '     ';
  // Header
  limitedCurrencies.forEach((curr) => {
    matrix += `│ ${curr} `;
  });
  matrix += '\n─────';
  matrix += `${'┼────'.repeat(size)}\n`;

  // Rows
  limitedCurrencies.forEach((fromCurr) => {
    matrix += ` ${fromCurr} `;

    limitedCurrencies.forEach((toCurr) => {
      if (fromCurr === toCurr) {
        matrix += '│  -  ';
      } else {
        const rate = getRateFunc(fromCurr, toCurr);
        if (rate === null) {
          matrix += '│  ?  ';
        } else {
          matrix += `│${formatCompactRate(rate).padStart(5)}`;
        }
      }
    });
    matrix += '\n';
  });

  return `\`\`\`\n${matrix}\`\`\``;
}

// Generate a rate timeline visualization
export function generateRateTimeline(
  data: Array<{
    timestamp: Date;
    rate: number;
    event?: string;
  }>,
  width: number = 40
): string {
  if (data.length === 0) {
    return 'No timeline data available';
  }

  // Sort by timestamp
  const sorted = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const minRate = Math.min(...sorted.map((d) => d.rate));
  const maxRate = Math.max(...sorted.map((d) => d.rate));
  const range = maxRate - minRate;

  let timeline = '📅 Rate Timeline\n\n';

  sorted.forEach((item, index) => {
    const date = item.timestamp.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const time = item.timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const position = range === 0 ? 0.5 : (item.rate - minRate) / range;
    const barPos = Math.floor(position * width);

    let line = `${' '.repeat(barPos)}●${' '.repeat(width - barPos)}`;

    // Add connecting lines
    if (index > 0) {
      const prevItem = sorted[index - 1];
      if (!prevItem) {
        return;
      }
      const prevPos = range === 0 ? 0.5 : (prevItem.rate - minRate) / range;
      const prevBarPos = Math.floor(prevPos * width);

      const start = Math.min(barPos, prevBarPos);
      const end = Math.max(barPos, prevBarPos);

      for (let i = start; i <= end; i++) {
        if (line[i] === ' ') {
          line = `${line.substring(0, i)}─${line.substring(i + 1)}`;
        }
      }
    }

    timeline += `${date} ${time} │${line}│ ${formatNumber(item.rate)}\n`;

    if (item.event) {
      timeline += `             └─ ${item.event}\n`;
    }
  });

  timeline += `\n${' '.repeat(14)}└${'─'.repeat(width)}┘\n`;
  timeline += `${' '.repeat(14)} ${formatNumber(minRate)}${' '.repeat(
    width - 20
  )}${formatNumber(maxRate)}`;

  return `\`\`\`\n${timeline}\n\`\`\``;
}

// Helper function to generate strength bar
function generateStrengthBar(percent: number, width: number): string {
  const normalizedPercent = Math.max(-10, Math.min(10, percent));
  const centerPos = Math.floor(width / 2);
  const barPos = Math.floor(((normalizedPercent + 10) / 20) * width);

  let bar = '';
  for (let i = 0; i < width; i++) {
    if (i === centerPos) {
      bar += '│';
    } else if (
      (normalizedPercent >= 0 && i > centerPos && i <= barPos) ||
      (normalizedPercent < 0 && i < centerPos && i >= barPos)
    ) {
      bar += '█';
    } else {
      bar += '·';
    }
  }

  return bar;
}

// Helper function to generate spread bar
function generateSpreadBar(spreadPercent: number, width: number): string {
  const maxSpread = 5; // Max 5% spread for visualization
  const normalizedSpread = Math.min(spreadPercent, maxSpread);
  const fillLength = Math.floor((normalizedSpread / maxSpread) * width);

  const filled = '▓'.repeat(fillLength);
  const empty = '░'.repeat(width - fillLength);

  return filled + empty;
}

// Helper function to format compact rate
function formatCompactRate(rate: number): string {
  if (rate >= 1000) {
    return `${(rate / 1000).toFixed(1)}k`;
  } else if (rate >= 1) {
    return rate.toFixed(1);
  } else {
    return rate.toFixed(3);
  }
}

// Generate a visual alert status
export function generateAlertStatusGraphic(
  alerts: Array<{
    id: string;
    currency: string;
    type: 'above' | 'below';
    targetRate: number;
    currentRate: number;
    isActive: boolean;
  }>
): string {
  if (alerts.length === 0) {
    return 'No active alerts';
  }

  let graphic = '🔔 Alert Status\n\n';

  alerts.forEach((alert) => {
    const diff = alert.currentRate - alert.targetRate;
    const diffPercent = (diff / alert.targetRate) * 100;
    const isTriggered = alert.type === 'above' ? diff >= 0 : diff <= 0;

    const status = isTriggered ? '✅ TRIGGERED' : '⏳ WAITING';
    const progress = generateAlertProgress(alert.currentRate, alert.targetRate, alert.type);

    graphic += `${alert.currency} ${alert.type} ${formatNumber(alert.targetRate)}\n`;
    graphic += `${progress}\n`;
    graphic += `Current: ${formatNumber(alert.currentRate)} (${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(2)}%) ${status}\n\n`;
  });

  return graphic;
}

// Helper function to generate alert progress bar
function generateAlertProgress(current: number, target: number, type: 'above' | 'below'): string {
  const width = 30;
  const range = Math.abs(target * 0.1); // 10% range around target
  const min = target - range;

  const currentPos = Math.floor(((current - min) / (range * 2)) * width);
  const targetPos = Math.floor(width / 2);

  let bar = '';
  for (let i = 0; i < width; i++) {
    if (i === targetPos) {
      bar += '🎯';
    } else if (i === currentPos) {
      bar += '●';
    } else if ((type === 'above' && i > targetPos) || (type === 'below' && i < targetPos)) {
      bar += '█';
    } else {
      bar += '░';
    }
  }

  return `[${bar}]`;
}
