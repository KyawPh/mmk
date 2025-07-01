import { CommandHandler } from './index';
import { sendMessage } from '../../../utils/telegram';

export const handleHelp: CommandHandler = async (message, _args) => {
  const helpText = `
📚 *Available Commands:*

/start - Welcome message
/help - Show this help message
/rates - Get current exchange rates
/history - View historical rates
/alert - Set price alerts
/subscribe - Daily/weekly updates
/settings - Manage preferences

💡 *Examples:*
• /rates USD
• /history 7 USD
• /alert above 3500 USD

For more information, visit our website.
  `.trim();

  await sendMessage(message.chat.id, helpText, {
    parseMode: 'Markdown',
  });
};
