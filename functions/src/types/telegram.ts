// Telegram bot types

export interface CommandContext {
  chatId: number;
  userId: number;
  command: string;
  args: string[];
  messageType: 'text' | 'callback';
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
  };
}

export interface CallbackContext {
  queryId: string;
  userId: number;
  chatId?: number;
  messageId?: number;
  data: string;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
}
