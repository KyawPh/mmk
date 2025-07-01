import { CommandHandler } from './index';
import { sendMessage } from '../../../utils/telegram';

export const handleHistory: CommandHandler = async (message, _args) => {
  // TODO: Implement history command
  await sendMessage(message.chat.id, '📈 Historical rates feature coming soon!');
};
