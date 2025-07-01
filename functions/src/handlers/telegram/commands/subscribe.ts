import { CommandHandler } from './index';
import { Keyboard, sendMessage } from '../../../utils/telegram';
import { db } from '../../../utils/firebase';
import { FieldValue } from 'firebase-admin/firestore';

interface Subscription {
  id: string;
  userId: string;
  chatId: number;
  type: 'daily' | 'weekly';
  time: string; // HH:MM format
  timezone: string;
  currencies: string[];
  isActive: boolean;
  lastSent?: Date;
  createdAt: Date;
}

export const handleSubscribe: CommandHandler = async (message, args) => {
  const chatId = message.chat.id;
  const userId = message.from.id.toString();

  // If no args, show current subscriptions
  if (!args.trim()) {
    await showUserSubscriptions(chatId, userId);
    return;
  }

  // Parse subscription type
  const type = args.trim().toLowerCase() as 'daily' | 'weekly';
  if (type !== 'daily' && type !== 'weekly') {
    await sendMessage(
      chatId,
      '📬 *Subscription Options*\n\n' +
        '`/subscribe daily` - Get daily exchange rate updates\n' +
        '`/subscribe weekly` - Get weekly exchange rate summary\n' +
        '`/subscribe` - View your active subscriptions\n\n' +
        '_Updates are sent at 9:00 AM Myanmar time._',
      { parseMode: 'Markdown' }
    );
    return;
  }

  try {
    // Check if user already has this subscription type
    const existingSubSnapshot = await db
      .collection('subscriptions')
      .where('userId', '==', userId)
      .where('type', '==', type)
      .where('isActive', '==', true)
      .get();

    if (!existingSubSnapshot.empty) {
      // Update existing subscription
      const existingDoc = existingSubSnapshot.docs[0];
      if (existingDoc) {
        await existingDoc.ref.update({
          chatId,
          updatedAt: FieldValue.serverTimestamp(),
        });

        await sendMessage(chatId, `✅ Your ${type} subscription has been updated!`);
      }
    } else {
      // Create new subscription
      const subscriptionData = {
        userId,
        chatId,
        type,
        time: '09:00', // Default 9 AM
        timezone: 'Asia/Yangon',
        currencies: ['USD', 'EUR', 'SGD'], // Default currencies
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
      };

      await db.collection('subscriptions').add(subscriptionData);

      const scheduleText = type === 'daily' ? 'every day' : 'every Monday';
      await sendMessage(
        chatId,
        `✅ Subscribed to ${type} updates!\n\n` +
          `You'll receive exchange rate updates ${scheduleText} at 9:00 AM Myanmar time.\n\n` +
          `Default currencies: USD, EUR, SGD\n` +
          `Use /settings to customize your preferences.`
      );
    }

    // Show subscription management keyboard
    const keyboard = Keyboard.inline([
      [
        { text: '⚙️ Customize', callback_data: 'cmd:settings' },
        { text: '📋 View All', callback_data: 'subscribe:list' },
      ],
      [{ text: '💱 Current Rates', callback_data: 'cmd:rates' }],
    ]);

    await sendMessage(chatId, 'Manage your subscriptions:', {
      replyMarkup: keyboard,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    await sendMessage(chatId, '❌ Failed to create subscription. Please try again later.');
  }
};

async function showUserSubscriptions(chatId: number, userId: string) {
  try {
    const subsSnapshot = await db
      .collection('subscriptions')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    if (subsSnapshot.empty) {
      const keyboard = Keyboard.inline([
        [
          { text: '📅 Daily Updates', callback_data: 'subscribe:daily' },
          { text: '📊 Weekly Summary', callback_data: 'subscribe:weekly' },
        ],
      ]);

      await sendMessage(
        chatId,
        '📭 You have no active subscriptions.\n\n' + 'Choose a subscription type:',
        { replyMarkup: keyboard }
      );
      return;
    }

    let messageText = '📬 *Your Active Subscriptions*\n\n';
    const buttons: any[][] = [];

    subsSnapshot.forEach((doc) => {
      const sub = { id: doc.id, ...doc.data() } as Subscription;
      const typeEmoji = sub.type === 'daily' ? '📅' : '📊';
      const scheduleText = sub.type === 'daily' ? 'Every day' : 'Every Monday';

      messageText += `${typeEmoji} *${sub.type.charAt(0).toUpperCase() + sub.type.slice(1)} Updates*\n`;
      messageText += `${scheduleText} at ${sub.time} ${sub.timezone}\n`;
      messageText += `Currencies: ${sub.currencies.join(', ')}\n\n`;

      // Add unsubscribe button
      buttons.push([
        { text: `❌ Cancel ${sub.type}`, callback_data: `subscribe:cancel:${sub.id}` },
      ]);
    });

    // Add common actions
    buttons.push([
      { text: '➕ Add Subscription', callback_data: 'subscribe:add' },
      { text: '⚙️ Settings', callback_data: 'cmd:settings' },
    ]);

    const keyboard = Keyboard.inline(buttons);

    await sendMessage(chatId, messageText, {
      parseMode: 'Markdown',
      replyMarkup: keyboard,
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    await sendMessage(chatId, '❌ Failed to fetch subscriptions. Please try again later.');
  }
}
