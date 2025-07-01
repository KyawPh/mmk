import { CommandHandler } from './index';
import { sendMessage } from '../../../utils/telegram';

export const handleSettings: CommandHandler = async (message, _args) => {
  // TODO: Implement settings command
  await sendMessage(message.chat.id, '⚙️ Settings feature coming soon!');
};
