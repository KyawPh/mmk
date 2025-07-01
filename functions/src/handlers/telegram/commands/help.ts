import { CommandHandler } from './index';
import { Keyboard, sendMessage } from '../../../utils/telegram';

export const handleHelp: CommandHandler = async (message, _args) => {
  const helpText = `
📚 *Myanmar Currency Bot - Help*

🔹 *Basic Commands:*
/start - Welcome message and quick actions
/help - Show this help message
/rates [currency] - Get current exchange rates
/history [days] [currency] - View historical rates
/alert [above|below] [rate] [currency] - Set price alerts
/subscribe [daily|weekly] - Get scheduled updates
/settings - Manage your preferences

🔹 *Command Examples:*
• \`/rates\` - Show all currency rates
• \`/rates USD\` - Show only USD rates
• \`/history 7 USD\` - Show 7-day USD history
• \`/history 14\` - Show 14-day history for USD (default)
• \`/alert above 3600 USD\` - Alert when USD > 3,600
• \`/alert below 3500 USD KBZ\` - Alert when KBZ USD < 3,500
• \`/subscribe daily\` - Get daily rate updates at 9 AM
• \`/subscribe\` - View your subscriptions

🔹 *Supported Currencies:*
USD, EUR, SGD, THB, CNY, GBP, JPY, AUD

🔹 *Data Sources:*
• 🏛️ CBM - Central Bank of Myanmar (Official)
• 🏦 Banks - KBZ, AYA, Yoma, CB Bank
• 💹 Binance P2P - Crypto market rates
• 💸 Worker Remittance - Special USD rates

🔹 *Quick Tips:*
• Tap inline buttons for quick actions
• Set alerts to monitor rate changes
• Subscribe for automatic daily/weekly updates
• Historical data shows trends and averages
• All times are in Myanmar Time (MMT)

💬 *Support:*
For issues or suggestions, contact @mmkcurrencybot_support
  `.trim();

  // Create inline keyboard with common actions
  const keyboard = Keyboard.inline([
    [
      { text: '💱 Current Rates', callback_data: 'cmd:rates' },
      { text: '📈 History', callback_data: 'cmd:history' },
    ],
    [
      { text: '🔔 Set Alert', callback_data: 'cmd:alert' },
      { text: '📬 Subscribe', callback_data: 'cmd:subscribe' },
    ],
    [{ text: '⚙️ Settings', callback_data: 'cmd:settings' }],
  ]);

  await sendMessage(message.chat.id, helpText, {
    parseMode: 'Markdown',
    replyMarkup: keyboard,
  });
};
