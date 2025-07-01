import { TelegramCallbackQuery } from './webhook';
import { answerCallbackQuery, editMessageText } from '../../utils/telegram';

// Callback handler type
export type CallbackHandler = (query: TelegramCallbackQuery, data: any) => Promise<void>;

// Callback router class
class CallbackRouter {
  private handlers: Map<string, CallbackHandler> = new Map();

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers() {
    // Currency selection callbacks
    this.register('currency', async (query, data) => {
      const { currency } = data;
      await answerCallbackQuery(query.id, `Selected ${currency}`);

      // Handle currency selection based on context
      // This will be implemented based on the previous action
    });

    // Settings callbacks
    this.register('settings', async (query, data) => {
      const { action, value } = data;

      switch (action as string) {
        case 'language':
          await this.handleLanguageChange(query, value);
          break;
        case 'timezone':
          await this.handleTimezoneChange(query, value);
          break;
        case 'currency':
          await this.handleDefaultCurrencyChange(query, value);
          break;
      }
    });

    // Alert callbacks
    this.register('alert', async (query, data) => {
      const { action, alertId } = data;

      switch (action) {
        case 'delete':
          await this.handleAlertDelete(query, alertId);
          break;
        case 'toggle':
          await this.handleAlertToggle(query, alertId);
          break;
      }
    });

    // Pagination callbacks
    this.register('page', async (query, _data) => {
      await answerCallbackQuery(query.id);

      // Handle pagination based on context
      // This will be implemented based on the previous message
    });
  }

  // Register a callback handler
  register(prefix: string, handler: CallbackHandler) {
    this.handlers.set(prefix, handler);
  }

  // Handle incoming callback query
  async handle(callbackData: string, query: TelegramCallbackQuery) {
    try {
      // Parse callback data
      const { prefix, data } = this.parseCallbackData(callbackData);

      // Find handler
      const handler = this.handlers.get(prefix);

      if (!handler) {
        console.error('No handler for callback prefix:', prefix);
        await answerCallbackQuery(query.id, 'Invalid action');
        return;
      }

      // Execute handler
      await handler(query, data);
    } catch (error) {
      console.error('Error handling callback:', error);
      await answerCallbackQuery(query.id, 'An error occurred');
    }
  }

  // Parse callback data format: "prefix:json_data"
  private parseCallbackData(callbackData: string): { prefix: string; data: any } {
    const colonIndex = callbackData.indexOf(':');

    if (colonIndex === -1) {
      return { prefix: callbackData, data: {} };
    }

    const prefix = callbackData.substring(0, colonIndex);
    const jsonStr = callbackData.substring(colonIndex + 1);

    try {
      const data = JSON.parse(jsonStr);
      return { prefix, data };
    } catch {
      console.error('Failed to parse callback data:', jsonStr);
      return { prefix, data: {} };
    }
  }

  // Handler implementations
  private async handleLanguageChange(query: TelegramCallbackQuery, language: string) {
    const { db } = await import('../../utils/firebase');
    const userId = query.from.id.toString();

    await db.collection('users').doc(userId).update({
      'preferences.language': language,
    });

    await answerCallbackQuery(query.id, 'Language updated!');

    if (query.message) {
      await editMessageText(
        query.message.chat.id,
        query.message.message_id,
        language === 'en'
          ? '✅ Language set to English'
          : '✅ ဘာသာစကားကို မြန်မာသို့ သတ်မှတ်ပြီးပါပြီ'
      );
    }
  }

  private async handleTimezoneChange(query: TelegramCallbackQuery, timezone: string) {
    const { db } = await import('../../utils/firebase');
    const userId = query.from.id.toString();

    await db.collection('users').doc(userId).update({
      'preferences.timezone': timezone,
    });

    await answerCallbackQuery(query.id, 'Timezone updated!');
  }

  private async handleDefaultCurrencyChange(query: TelegramCallbackQuery, currency: string) {
    const { db } = await import('../../utils/firebase');
    const userId = query.from.id.toString();

    await db.collection('users').doc(userId).update({
      'preferences.defaultCurrency': currency,
    });

    await answerCallbackQuery(query.id, `Default currency set to ${currency}`);
  }

  private async handleAlertDelete(query: TelegramCallbackQuery, alertId: string) {
    const { db } = await import('../../utils/firebase');
    const userId = query.from.id.toString();

    // Verify ownership
    const alertDoc = await db.collection('alerts').doc(alertId).get();
    const alertData = alertDoc.data();

    if (!alertDoc.exists || !alertData || alertData['userId'] !== userId) {
      await answerCallbackQuery(query.id, 'Alert not found');
      return;
    }

    // Delete alert
    await db.collection('alerts').doc(alertId).delete();

    await answerCallbackQuery(query.id, '✅ Alert deleted');

    if (query.message) {
      await editMessageText(
        query.message.chat.id,
        query.message.message_id,
        '✅ Alert has been deleted'
      );
    }
  }

  private async handleAlertToggle(query: TelegramCallbackQuery, alertId: string) {
    const { db } = await import('../../utils/firebase');
    const userId = query.from.id.toString();

    // Verify ownership
    const alertRef = db.collection('alerts').doc(alertId);
    const alertDoc = await alertRef.get();
    const alertData = alertDoc.data();

    if (!alertDoc.exists || !alertData || alertData['userId'] !== userId) {
      await answerCallbackQuery(query.id, 'Alert not found');
      return;
    }

    // Toggle alert status
    const isActive = alertData ? !alertData['isActive'] : true;
    await alertRef.update({ isActive });

    await answerCallbackQuery(query.id, isActive ? '✅ Alert activated' : '⏸️ Alert paused');
  }
}

// Create callback data helper
export function createCallbackData(prefix: string, data: any): string {
  // Telegram has a 64-byte limit for callback data
  const fullData = `${prefix}:${JSON.stringify(data)}`;

  if (fullData.length > 64) {
    // For large data, store in cache and use ID
    console.warn('Callback data too large:', fullData.length, 'bytes');
    // TODO: Implement caching for large callback data
  }

  return fullData;
}

// Export singleton instance
export const callbackRouter = new CallbackRouter();
