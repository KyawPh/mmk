import { httpsFunction, scheduledFunction } from './utils/functions';
import { handleWebhook } from './handlers/telegram/webhook';
import { cleanupRateLimits } from './utils/rateLimiter';

// Health check endpoint
export const healthCheck = httpsFunction((_req, res) => {
  res.json({
    status: 'ok',
    service: 'MMK Currency Bot',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    region: process.env['FUNCTION_REGION'] || 'unknown',
  });
});

// Telegram webhook handler
export const telegramWebhook = httpsFunction(handleWebhook);

// Scheduled function to clean up rate limits
export const cleanupRateLimitsJob = scheduledFunction('every 1 hours', async () => {
  console.log('Running rate limit cleanup job');
  await cleanupRateLimits();
});

// TODO: Add more functions as we implement them
// export const collectRates = scheduledFunction('every 30 minutes', collectRatesHandler);
// export const processAlerts = scheduledFunction('every 5 minutes', processAlertsHandler);
// export const sendSubscriptions = scheduledFunction('0 9 * * *', sendSubscriptionsHandler);
