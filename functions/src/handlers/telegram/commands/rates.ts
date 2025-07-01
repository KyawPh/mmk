import { CommandHandler } from './index';
import { sendMessage } from '../../../utils/telegram';

export const handleRates: CommandHandler = async (message, _args) => {
  // TODO: Implement rates command
  await sendMessage(message.chat.id, '💱 Exchange rates feature coming soon!');
};
