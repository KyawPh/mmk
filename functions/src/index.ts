import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export a simple health check function to verify deployment
export const healthCheck = functions.https.onRequest((_request, response) => {
  response.json({
    status: 'ok',
    service: 'MMK Currency Bot',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Placeholder for Telegram webhook handler
export const telegramWebhook = functions.https.onRequest((_request, response) => {
  // TODO: Implement webhook handler
  response.status(501).json({ error: 'Not implemented yet' });
});
