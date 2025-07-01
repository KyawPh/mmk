import { CommandHandler } from './index';
import { Keyboard, sendMessage } from '../../../utils/telegram';
import { db } from '../../../utils/firebase';
import { FieldValue } from 'firebase-admin/firestore';

interface Alert {
  id: string;
  userId: string;
  chatId: number;
  currency: string;
  source?: string;
  type: 'above' | 'below';
  targetRate: number;
  isActive: boolean;
  createdAt: Date;
  triggeredAt?: Date;
  triggeredCount: number;
}

export const handleAlert: CommandHandler = async (message, args) => {
  const chatId = message.chat.id;
  const userId = message.from.id.toString();

  // Parse arguments: /alert [above|below] [rate] [currency] [source]
  const parts = args.trim().split(' ').filter(Boolean);

  if (parts.length === 0) {
    // Show current alerts
    await showUserAlerts(chatId, userId);
    return;
  }

  // Parse alert parameters
  const type = parts[0]?.toLowerCase() as 'above' | 'below';
  if (type !== 'above' && type !== 'below') {
    await sendMessage(
      chatId,
      '❌ Invalid alert type. Usage:\n' +
        '`/alert above [rate] [currency]` - Alert when rate goes above\n' +
        '`/alert below [rate] [currency]` - Alert when rate goes below\n' +
        '`/alert` - View your active alerts',
      { parseMode: 'Markdown' }
    );
    return;
  }

  const rate = parseFloat(parts[1] || '0');
  if (isNaN(rate) || rate <= 0) {
    await sendMessage(chatId, '❌ Please provide a valid rate number.');
    return;
  }

  const currency = (parts[2] || 'USD').toUpperCase();
  const source = parts[3]?.toUpperCase() || 'ANY';

  try {
    // Create the alert
    const alertData = {
      userId,
      chatId,
      currency,
      source: source === 'ANY' ? null : source,
      type,
      targetRate: rate,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      triggeredCount: 0,
    };

    const alertRef = await db.collection('alerts').add(alertData);

    const sourceText = source === 'ANY' ? 'any source' : source;
    const alertMessage =
      `✅ Alert created!\n\n` +
      `I'll notify you when *${currency}/MMK* rate goes *${type} ${formatNumber(rate)}* ` +
      `from ${sourceText}.\n\n` +
      `Alert ID: \`${alertRef.id.slice(-6)}\``;

    // Create keyboard for alert management
    const keyboard = Keyboard.inline([
      [
        { text: '📋 View All Alerts', callback_data: 'alert:list' },
        { text: '❌ Delete Alert', callback_data: `alert:delete:${alertRef.id}` },
      ],
      [{ text: '💱 Current Rates', callback_data: 'cmd:rates' }],
    ]);

    await sendMessage(chatId, alertMessage, {
      parseMode: 'Markdown',
      replyMarkup: keyboard,
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    await sendMessage(chatId, '❌ Failed to create alert. Please try again later.');
  }
};

async function showUserAlerts(chatId: number, userId: string) {
  try {
    const alertsSnapshot = await db
      .collection('alerts')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (alertsSnapshot.empty) {
      await sendMessage(
        chatId,
        '📭 You have no active alerts.\n\n' +
          'To create an alert, use:\n' +
          '`/alert above [rate] [currency]`\n' +
          '`/alert below [rate] [currency]`',
        { parseMode: 'Markdown' }
      );
      return;
    }

    let messageText = '🔔 *Your Active Alerts*\n\n';
    const buttons: any[][] = [];

    alertsSnapshot.forEach((doc) => {
      const alert = { id: doc.id, ...doc.data() } as Alert;
      const sourceText = alert.source || 'Any';
      const typeEmoji = alert.type === 'above' ? '📈' : '📉';

      messageText += `${typeEmoji} *${alert.currency}/MMK* ${alert.type} ${formatNumber(alert.targetRate)}\n`;
      messageText += `Source: ${sourceText} | ID: \`${alert.id.slice(-6)}\`\n\n`;

      // Add delete button for this alert
      buttons.push([
        { text: `❌ Delete ${alert.id.slice(-6)}`, callback_data: `alert:delete:${alert.id}` },
      ]);
    });

    messageText += '_You can have up to 10 active alerts._';

    // Add common actions
    buttons.push([
      { text: '➕ Create New Alert', callback_data: 'alert:create' },
      { text: '💱 Current Rates', callback_data: 'cmd:rates' },
    ]);

    const keyboard = Keyboard.inline(buttons);

    await sendMessage(chatId, messageText, {
      parseMode: 'Markdown',
      replyMarkup: keyboard,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    await sendMessage(chatId, '❌ Failed to fetch alerts. Please try again later.');
  }
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
