import { CommandHandler } from './index';
import { Keyboard, sendMessage } from '../../../utils/telegram';

export const handleStart: CommandHandler = async (message) => {
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
