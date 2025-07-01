// Emoji indicators for various states and values

// Trend indicators based on percentage change
export function getTrendIndicator(changePercent: number): string {
  if (changePercent > 5) {
    return '🚀';
  } // Rocket for big gains
  if (changePercent > 2) {
    return '📈';
  } // Strong upward
  if (changePercent > 0.5) {
    return '↗️';
  } // Slight upward
  if (changePercent > -0.5) {
    return '➡️';
  } // Stable
  if (changePercent > -2) {
    return '↘️';
  } // Slight downward
  if (changePercent > -5) {
    return '📉';
  } // Strong downward
  return '💥'; // Crash for big losses
}

// Volatility indicators
export function getVolatilityIndicator(volatilityPercent: number): string {
  if (volatilityPercent < 1) {
    return '😴';
  } // Very stable
  if (volatilityPercent < 2) {
    return '✅';
  } // Normal
  if (volatilityPercent < 3) {
    return '⚠️';
  } // Caution
  if (volatilityPercent < 5) {
    return '🔥';
  } // High
  return '🌪️'; // Extreme volatility
}

// Source reliability indicators
export function getSourceReliabilityIndicator(source: string): string {
  const reliability: Record<string, string> = {
    CBM: '🏛️✨', // Official source
    KBZ: '🏦✅', // Major bank
    AYA: '🏦✅', // Major bank
    Yoma: '🏦✅', // Major bank
    'CB Bank': '🏦✅', // Major bank
    'Binance P2P': '💹⚠️', // Market-based, variable
    'Western Union': '💸✅', // Reliable remittance
    Wise: '💳✅', // Reliable remittance
  };
  return reliability[source] ?? '❓';
}

// Currency strength indicators
export function getCurrencyStrengthIndicator(
  averageChange: number,
  againstMMK: boolean = true
): string {
  const direction = againstMMK ? 1 : -1;
  const adjustedChange = averageChange * direction;

  if (adjustedChange > 3) {
    return '💪🟢';
  } // Very strong
  if (adjustedChange > 1) {
    return '💚';
  } // Strong
  if (adjustedChange > -1) {
    return '🟡';
  } // Neutral
  if (adjustedChange > -3) {
    return '🟠';
  } // Weak
  return '🔴'; // Very weak
}

// Time of day indicators
export function getTimeOfDayIndicator(hour: number): string {
  if (hour >= 5 && hour < 9) {
    return '🌅';
  } // Early morning
  if (hour >= 9 && hour < 12) {
    return '🌞';
  } // Morning
  if (hour >= 12 && hour < 15) {
    return '☀️';
  } // Noon
  if (hour >= 15 && hour < 18) {
    return '🌇';
  } // Afternoon
  if (hour >= 18 && hour < 21) {
    return '🌆';
  } // Evening
  if (hour >= 21 || hour < 5) {
    return '🌙';
  } // Night
  return '🕐';
}

// Alert status indicators
export function getAlertStatusIndicator(
  currentRate: number,
  targetRate: number,
  type: 'above' | 'below'
): string {
  const difference = currentRate - targetRate;
  const percentDiff = (Math.abs(difference) / targetRate) * 100;

  if (type === 'above') {
    if (currentRate >= targetRate) {
      return '✅🔔';
    } // Triggered
    if (percentDiff < 1) {
      return '🔴⚡';
    } // Very close
    if (percentDiff < 5) {
      return '🟡📍';
    } // Close
    return '🔵💤'; // Far
  } else {
    if (currentRate <= targetRate) {
      return '✅🔔';
    } // Triggered
    if (percentDiff < 1) {
      return '🔴⚡';
    } // Very close
    if (percentDiff < 5) {
      return '🟡📍';
    } // Close
    return '🔵💤'; // Far
  }
}

// Data freshness indicators
export function getFreshnessIndicator(timestamp: Date): string {
  const ageMinutes = (Date.now() - timestamp.getTime()) / (1000 * 60);

  if (ageMinutes < 5) {
    return '🟢';
  } // Very fresh
  if (ageMinutes < 15) {
    return '🟡';
  } // Recent
  if (ageMinutes < 60) {
    return '🟠';
  } // Getting old
  if (ageMinutes < 240) {
    return '🔴';
  } // Old
  return '⚫'; // Very old
}

// Market sentiment indicators
export function getMarketSentimentIndicator(buyVolume: number, sellVolume: number): string {
  const total = buyVolume + sellVolume;
  if (total === 0) {
    return '😐';
  } // No data

  const buyPercent = (buyVolume / total) * 100;

  if (buyPercent > 70) {
    return '🐂🟢';
  } // Very bullish
  if (buyPercent > 55) {
    return '📈';
  } // Bullish
  if (buyPercent > 45) {
    return '⚖️';
  } // Balanced
  if (buyPercent > 30) {
    return '📉';
  } // Bearish
  return '🐻🔴'; // Very bearish
}

// Rate difference indicators (from official rate)
export function getRateDifferenceIndicator(percentDiff: number): string {
  const absDiff = Math.abs(percentDiff);

  if (absDiff < 1) {
    return '✅';
  } // Very close to official
  if (absDiff < 5) {
    return '👍';
  } // Reasonable
  if (absDiff < 10) {
    return '⚠️';
  } // High difference
  if (absDiff < 20) {
    return '🚨';
  } // Very high
  return '❌'; // Extreme difference
}

// Loading animation frames
export function getLoadingFrame(index: number): string {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  return frames[index % frames.length] ?? '⠋';
}

// Progress bar
export function getProgressBar(percent: number, width: number = 10): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// Numeric indicators
export function getNumericIndicator(value: number, thresholds: number[]): string {
  const indicators = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

  for (let i = 0; i < thresholds.length && i < indicators.length; i++) {
    const threshold = thresholds[i];
    if (threshold !== undefined && value <= threshold) {
      return indicators[i] ?? '1️⃣';
    }
  }
  return '💯';
}

// Star rating
export function getStarRating(rating: number, maxRating: number = 5): string {
  const stars = Math.round((rating / maxRating) * 5);
  return '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
}

// Status indicators
export const StatusIndicators = {
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  PENDING: '⏳',
  PROCESSING: '⚙️',
  COMPLETED: '✨',
  CANCELLED: '🚫',
  PAUSED: '⏸️',
  ACTIVE: '🟢',
  INACTIVE: '🔴',
  ONLINE: '🌐',
  OFFLINE: '📴',
  SYNCING: '🔄',
  CONNECTED: '🔗',
  DISCONNECTED: '🔌',
} as const;

// Feature indicators
export const FeatureIndicators = {
  RATES: '💱',
  HISTORY: '📈',
  ALERTS: '🔔',
  PREDICTIONS: '🔮',
  COMPARISON: '📊',
  SUBSCRIPTION: '📬',
  SETTINGS: '⚙️',
  HELP: '❓',
  SEARCH: '🔍',
  FILTER: '🔽',
  SORT: '↕️',
  EXPORT: '📤',
  IMPORT: '📥',
  SHARE: '📱',
  FAVORITE: '⭐',
} as const;

// Action indicators
export const ActionIndicators = {
  ADD: '➕',
  REMOVE: '➖',
  EDIT: '✏️',
  DELETE: '🗑️',
  SAVE: '💾',
  CANCEL: '❌',
  CONFIRM: '✅',
  REFRESH: '🔄',
  BACK: '◀️',
  FORWARD: '▶️',
  UP: '⬆️',
  DOWN: '⬇️',
  EXPAND: '📂',
  COLLAPSE: '📁',
  COPY: '📋',
} as const;
