import { CommandHandler } from './index';
import { sendMessage } from '../../../utils/telegram';

export const handleAlert: CommandHandler = async (message, _args) => {
  // TODO: Implement alert command
  await sendMessage(message.chat.id, '🔔 Price alerts feature coming soon!');
};
