import { CommandHandler } from './index';
import { sendMessage } from '../../../utils/telegram';

export const handleSubscribe: CommandHandler = async (message, _args) => {
  // TODO: Implement subscribe command
  await sendMessage(message.chat.id, '📬 Subscription feature coming soon!');
};
