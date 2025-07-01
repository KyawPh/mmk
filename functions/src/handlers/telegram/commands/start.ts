import { CommandHandler } from './index';
import { Keyboard, sendMessage } from '../../../utils/telegram';
import { db } from '../../../utils/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export const handleStart: CommandHandler = async (message) => {
  // Register or update user in Firestore
  const userId = message.from.id.toString();
  const userRef = db.collection('users').doc(userId);

  try {
    await userRef.set(
      {
        telegramId: message.from.id,
        username: message.from.username || null,
        firstName: message.from.first_name,
        lastName: message.from.last_name || null,
        languageCode: message.from.language_code || 'en',
        chatId: message.chat.id,
        isBot: message.from.is_bot,
        createdAt: FieldValue.serverTimestamp(),
        lastSeen: FieldValue.serverTimestamp(),
        preferences: {
          language: 'en',
          defaultCurrency: 'USD',
          timezone: 'Asia/Yangon',
        },
        stats: {
          commandCount: FieldValue.increment(1),
          lastCommand: '/start',
        },
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Failed to register user:', error);
  }
  const welcomeText = `
🇲🇲 Welcome to Myanmar Currency Bot!

I help you track real-time exchange rates for Myanmar Kyat (MMK) from multiple sources:

📊 *Available Features:*
• Current exchange rates from banks and CBM
• Historical rate trends
• Price alerts
• Daily/weekly updates
• Multi-currency comparison

🏦 *Data Sources:*
• Central Bank of Myanmar (Official)
• Major local banks (KBZ, AYA, Yoma, CB)
• P2P market rates

Use /help to see all available commands.
  `.trim();

  const keyboard = Keyboard.inline([
    [
      { text: '💱 Current Rates', callback_data: 'cmd:rates' },
      { text: '📈 History', callback_data: 'cmd:history' },
    ],
    [
      { text: '🔔 Set Alert', callback_data: 'cmd:alert' },
      { text: '⚙️ Settings', callback_data: 'cmd:settings' },
    ],
  ]);

  await sendMessage(message.chat.id, welcomeText, {
    parseMode: 'Markdown',
    replyMarkup: keyboard,
  });
};
