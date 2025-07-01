import { CommandHandler } from './index';
import { sendMessage } from '../../../utils/telegram';
import { CollectionOrchestrator } from '../../../collectors/CollectionOrchestrator';

export const handlePredict: CommandHandler = async (message, args) => {
  const chatId = message.chat.id;

  // Parse arguments: /predict [currency] [days]
  const parts = args.trim().split(' ').filter(Boolean);
  const currency = (parts[0] ?? 'USD').toUpperCase();
  const days = parseInt(parts[1] ?? '7');

  if (days < 1 || days > 30) {
    await sendMessage(
      chatId,
      '❌ Please specify prediction period between 1-30 days.\n' +
        'Usage: `/predict [currency] [days]`',
      { parseMode: 'Markdown' }
    );
    return;
  }

  await sendMessage(chatId, `🔮 Analyzing ${currency} trends...`);

  try {
    const orchestrator = new CollectionOrchestrator();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Get 30 days of historical data

    const historicalRates = await orchestrator.getHistoricalRates(currency, startDate, endDate);

    if (historicalRates.length < 7) {
      await sendMessage(
        chatId,
        `❌ Not enough historical data for ${currency} to make predictions.`
      );
      return;
    }

    // Focus on CBM rates for prediction
    const cbmRates = historicalRates
      .filter((r) => r.source === 'CBM')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (cbmRates.length < 7) {
      await sendMessage(chatId, `❌ Not enough CBM data for ${currency} to make predictions.`);
      return;
    }

    // Simple trend analysis
    const recentRates = cbmRates.slice(-7).map((r) => r.rate);
    const avgRecent = recentRates.reduce((a, b) => a + b, 0) / recentRates.length;

    const olderRates = cbmRates.slice(-14, -7).map((r) => r.rate);
    const avgOlder = olderRates.reduce((a, b) => a + b, 0) / olderRates.length;

    const trend = avgRecent - avgOlder;
    const trendPercent = (trend / avgOlder) * 100;
    const dailyChange = trend / 7;

    // Calculate volatility
    const stdDev = calculateStandardDeviation(recentRates);
    const volatility = (stdDev / avgRecent) * 100;

    // Simple linear projection
    const currentRate = recentRates[recentRates.length - 1];
    if (!currentRate) {
      await sendMessage(chatId, `❌ Unable to get current rate for ${currency}.`);
      return;
    }
    const projectedRate = currentRate + dailyChange * days;
    const projectedHigh = projectedRate + stdDev * Math.sqrt(days);
    const projectedLow = projectedRate - stdDev * Math.sqrt(days);

    // Determine trend direction and strength
    let trendDirection = '➡️ Stable';
    let trendStrength = 'neutral';

    if (Math.abs(trendPercent) < 0.5) {
      trendDirection = '➡️ Stable';
      trendStrength = 'neutral';
    } else if (trendPercent > 2) {
      trendDirection = '📈 Strong Uptrend';
      trendStrength = 'bullish';
    } else if (trendPercent > 0.5) {
      trendDirection = '📈 Uptrend';
      trendStrength = 'slightly bullish';
    } else if (trendPercent < -2) {
      trendDirection = '📉 Strong Downtrend';
      trendStrength = 'bearish';
    } else {
      trendDirection = '📉 Downtrend';
      trendStrength = 'slightly bearish';
    }

    let messageText = `🔮 *${currency}/MMK ${days}-Day Prediction*\n\n`;

    messageText += `*Current Analysis*\n`;
    messageText += `Current Rate: ${formatNumber(currentRate)} MMK\n`;
    messageText += `7-Day Average: ${formatNumber(avgRecent)} MMK\n`;
    messageText += `Trend: ${trendDirection}\n`;
    messageText += `Weekly Change: ${trend >= 0 ? '+' : ''}${formatNumber(trend)} (${trendPercent >= 0 ? '+' : ''}${trendPercent.toFixed(2)}%)\n`;
    messageText += `Volatility: ${volatility.toFixed(2)}% ${volatility > 2 ? '⚠️ High' : '✅ Normal'}\n\n`;

    messageText += `*${days}-Day Forecast*\n`;
    messageText += `Projected Rate: ${formatNumber(projectedRate)} MMK\n`;
    messageText += `Confidence Range:\n`;
    messageText += `📈 High: ${formatNumber(projectedHigh)} MMK\n`;
    messageText += `📉 Low: ${formatNumber(projectedLow)} MMK\n\n`;

    // Market sentiment
    messageText += `*Market Outlook*\n`;
    if (volatility > 3) {
      messageText += `⚠️ High volatility detected. Predictions may be less reliable.\n`;
    }

    if (trendStrength === 'bullish') {
      messageText += `📈 The ${currency} is showing strong appreciation against MMK.\n`;
    } else if (trendStrength === 'bearish') {
      messageText += `📉 The ${currency} is showing depreciation against MMK.\n`;
    } else if (trendStrength === 'slightly bullish') {
      messageText += `📊 The ${currency} is showing slight appreciation against MMK.\n`;
    } else if (trendStrength === 'slightly bearish') {
      messageText += `📊 The ${currency} is showing slight depreciation against MMK.\n`;
    } else {
      messageText += `📊 The ${currency} is relatively stable against MMK.\n`;
    }

    messageText += `\n_⚠️ Disclaimer: This is a simple trend-based prediction and should not be used as financial advice._`;

    await sendMessage(chatId, messageText, { parseMode: 'Markdown' });
  } catch (error) {
    console.error('Error generating prediction:', error);
    await sendMessage(chatId, '❌ Failed to generate prediction. Please try again later.');
  }
};

function calculateStandardDeviation(values: number[]): number {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
