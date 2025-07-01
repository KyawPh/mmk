import axios from 'axios';
import { configHelper } from './config';
import { ExternalServiceError, ValidationError } from './errors';

// Telegram API types
export interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  error_code?: number;
  description?: string;
}

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  switch_inline_query?: string;
  switch_inline_query_current_chat?: string;
  callback_game?: any;
  pay?: boolean;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface KeyboardButton {
  text: string;
  request_contact?: boolean;
  request_location?: boolean;
  request_poll?: {
    type?: 'quiz' | 'regular';
  };
}

export interface ReplyKeyboardMarkup {
  keyboard: (string | KeyboardButton)[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
  selective?: boolean;
}

export interface SendMessageParams {
  chat_id: number | string;
  text: string;
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  reply_to_message_id?: number;
  reply_markup?: any;
}

export interface EditMessageTextParams {
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  text: string;
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  disable_web_page_preview?: boolean;
  reply_markup?: any;
}

export interface AnswerCallbackQueryParams {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
  url?: string;
  cache_time?: number;
}

// Telegram API client
class TelegramClient {
  private api: any;
  private botToken: string;

  constructor() {
    this.botToken = configHelper.getEnvVar('telegram.botToken', '');

    if (!this.botToken) {
      throw new Error('Telegram bot token not configured');
    }

    this.api = axios.create({
      baseURL: `https://api.telegram.org/bot${this.botToken}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Make API request
  private async request<T>(method: string, params?: any): Promise<T> {
    try {
      const response = await this.api.post(method, params);

      if (!response.data.ok) {
        throw new Error(response.data.description || 'Telegram API error');
      }

      return response.data.result!;
    } catch (error: any) {
      if (error.response?.data?.description) {
        throw new ExternalServiceError('Telegram', error.response.data.description);
      }

      if (error.code === 'ECONNABORTED') {
        throw new ExternalServiceError('Telegram', 'Request timeout');
      }

      throw new ExternalServiceError('Telegram', error.message);
    }
  }

  // Send message
  async sendMessage(params: SendMessageParams): Promise<any> {
    // Validate message length
    if (params.text.length > 4096) {
      throw new ValidationError('Message too long (max 4096 characters)');
    }

    return this.request('sendMessage', params);
  }

  // Edit message text
  async editMessageText(params: EditMessageTextParams): Promise<any> {
    if (params.text.length > 4096) {
      throw new ValidationError('Message too long (max 4096 characters)');
    }

    return this.request('editMessageText', params);
  }

  // Answer callback query
  async answerCallbackQuery(params: AnswerCallbackQueryParams): Promise<boolean> {
    return this.request('answerCallbackQuery', params);
  }

  // Delete message
  async deleteMessage(chatId: number | string, messageId: number): Promise<boolean> {
    return this.request('deleteMessage', {
      chat_id: chatId,
      message_id: messageId,
    });
  }

  // Send photo
  async sendPhoto(
    chatId: number | string,
    photo: string | Buffer,
    caption?: string,
    replyMarkup?: any
  ): Promise<any> {
    return this.request('sendPhoto', {
      chat_id: chatId,
      photo,
      caption,
      reply_markup: replyMarkup,
    });
  }

  // Send document
  async sendDocument(
    chatId: number | string,
    document: string | Buffer,
    caption?: string,
    replyMarkup?: any
  ): Promise<any> {
    return this.request('sendDocument', {
      chat_id: chatId,
      document,
      caption,
      reply_markup: replyMarkup,
    });
  }

  // Set webhook
  async setWebhook(url: string, secretToken?: string): Promise<boolean> {
    return this.request('setWebhook', {
      url,
      secret_token: secretToken,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: false,
    });
  }

  // Delete webhook
  async deleteWebhook(): Promise<boolean> {
    return this.request('deleteWebhook', {
      drop_pending_updates: false,
    });
  }

  // Get webhook info
  async getWebhookInfo(): Promise<any> {
    return this.request('getWebhookInfo');
  }
}

// Create singleton instance
const client = new TelegramClient();

// Exported helper functions
export async function sendMessage(
  chatId: number | string,
  text: string,
  options?: {
    parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
    disablePreview?: boolean;
    replyMarkup?: any;
  }
): Promise<any> {
  return client.sendMessage({
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode || 'Markdown',
    disable_web_page_preview: options?.disablePreview,
    reply_markup: options?.replyMarkup,
  });
}

export async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  options?: {
    parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
    disablePreview?: boolean;
    replyMarkup?: any;
  }
): Promise<any> {
  return client.editMessageText({
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: options?.parseMode || 'Markdown',
    disable_web_page_preview: options?.disablePreview,
    reply_markup: options?.replyMarkup,
  });
}

export async function answerCallbackQuery(
  queryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<boolean> {
  return client.answerCallbackQuery({
    callback_query_id: queryId,
    text,
    show_alert: showAlert,
  });
}

export async function deleteMessage(chatId: number | string, messageId: number): Promise<boolean> {
  try {
    return await client.deleteMessage(chatId, messageId);
  } catch (error) {
    // Ignore errors when message is already deleted
    console.error('Failed to delete message:', error);
    return false;
  }
}

// Keyboard builders
export const Keyboard = {
  // Inline keyboard
  inline(buttons: Array<Array<{ text: string; callback_data?: string; url?: string }>>): any {
    return {
      inline_keyboard: buttons,
    };
  },

  // Reply keyboard
  reply(
    buttons: Array<
      Array<string | { text: string; request_contact?: boolean; request_location?: boolean }>
    >,
    options?: {
      resize?: boolean;
      oneTime?: boolean;
      placeholder?: string;
    }
  ): any {
    return {
      keyboard: buttons,
      resize_keyboard: options?.resize ?? true,
      one_time_keyboard: options?.oneTime ?? false,
      input_field_placeholder: options?.placeholder,
    };
  },

  // Remove keyboard
  remove(): any {
    return {
      remove_keyboard: true,
    };
  },
};

// Message formatting helpers
export const Format = {
  // Escape special characters for Markdown
  escapeMarkdown(text: string): string {
    return text.replace(/[*_`\[\]()]/g, '\\$&');
  },

  // Format currency amount
  currency(amount: number, currency: string = 'MMK'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  },

  // Format percentage
  percentage(value: number, decimals: number = 2): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}%`;
  },

  // Format date
  date(date: Date, timezone: string = 'Asia/Yangon'): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  },
};

// Export client for advanced usage
export { client as telegramClient };
