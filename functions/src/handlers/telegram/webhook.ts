import * as crypto from 'crypto';
import { configHelper } from '../../utils/config';
import { asyncHandler, AuthenticationError, ValidationError } from '../../utils/errors';
import { commandRouter } from './commands';
import { callbackRouter } from './callbacks';
import { db } from '../../utils/firebase';
import { trackingMiddleware, userStatusMiddleware } from '../../middleware/tracking';
import { CommandContext } from '../../types/telegram';

// Telegram Update types
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: TelegramEntity[];
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramEntity {
  type:
    | 'bot_command'
    | 'mention'
    | 'hashtag'
    | 'url'
    | 'email'
    | 'phone_number'
    | 'bold'
    | 'italic';
  offset: number;
  length: number;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
}

// Verify webhook signature
const verifyWebhookSignature = (req: any, secretToken: string): boolean => {
  const signature = req.headers['x-telegram-bot-api-secret-token'] as string;
  return signature === secretToken;
};

// Parse and validate Telegram update
const parseUpdate = (body: any): TelegramUpdate => {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid update format');
  }

  if (!body.update_id) {
    throw new ValidationError('Missing update_id');
  }

  return body as TelegramUpdate;
};

// Main webhook handler
export const handleWebhook = asyncHandler(async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    throw new ValidationError('Only POST method is accepted');
  }

  // Verify webhook signature
  const secretToken = configHelper.getEnvVar('telegram.webhookSecret', '');
  if (secretToken && !verifyWebhookSignature(req, secretToken)) {
    throw new AuthenticationError('Invalid webhook signature');
  }

  // Parse update
  const update = parseUpdate(req.body);

  // Log incoming update
  console.log('Received Telegram update:', {
    update_id: update.update_id,
    type: update.message ? 'message' : update.callback_query ? 'callback_query' : 'other',
    from: update.message?.from.id || update.callback_query?.from.id,
  });

  // Process update based on type
  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    // Always return 200 OK to Telegram
    res.status(200).json({ ok: true });
  } catch (error) {
    // Log error but still return 200 to prevent Telegram retries
    console.error('Error processing update:', error);
    res.status(200).json({ ok: true });
  }
});

// Handle incoming messages
async function handleMessage(message: TelegramMessage) {
  // Update user information
  await updateUser(message.from, message.chat);

  // Ignore messages from bots
  if (message.from.is_bot) {
    return;
  }

  // Check if message contains a command
  if (message.text && message.entities) {
    const commandEntity = message.entities.find((e) => e.type === 'bot_command');

    if (commandEntity) {
      const command = message.text.substring(
        commandEntity.offset,
        commandEntity.offset + commandEntity.length
      );
      const args = message.text.substring(commandEntity.offset + commandEntity.length).trim();

      // Create command context
      const ctx: CommandContext = {
        chatId: message.chat.id,
        userId: message.from.id,
        command: command.split('@')[0] ?? command, // Remove bot username if present
        args: args.split(' ').filter(Boolean),
        messageType: 'text',
        from: message.from,
      };

      // Apply middleware and route to command handler
      await userStatusMiddleware(ctx, async () => {
        await trackingMiddleware(ctx, async () => {
          await commandRouter.handle(command, message, args);
        });
      });
      return;
    }
  }

  // Handle regular text messages
  if (message.text) {
    // Could implement natural language processing here
    // For now, suggest using commands
    const { sendMessage } = await import('../../utils/telegram');
    await sendMessage(
      message.chat.id,
      "I didn't understand that. Try /help to see available commands."
    );
  }
}

// Handle callback queries
async function handleCallbackQuery(query: TelegramCallbackQuery) {
  // Answer callback query immediately
  const { answerCallbackQuery } = await import('../../utils/telegram');
  await answerCallbackQuery(query.id);

  // Update user information
  await updateUser(query.from, query.message?.chat);

  // Route to callback handler
  if (query.data) {
    // Track callback query
    const { trackCallbackQuery } = await import('../../middleware/tracking');
    const actionName = query.data.split(':')[0] ?? 'unknown';
    await trackCallbackQuery(query.from.id.toString(), actionName, {
      data: query.data,
      messageId: query.message?.message_id,
    });

    await callbackRouter.handle(query.data, query);
  }
}

// Update user information in Firestore
async function updateUser(user: TelegramUser, _chat?: TelegramChat) {
  const userRef = db.collection('users').doc(user.id.toString());

  const userData = {
    id: user.id.toString(),
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    languageCode: user.language_code,
    lastActive: new Date(),
    platform: 'telegram' as const,
  };

  const doc = await userRef.get();

  if (!doc.exists) {
    // New user
    await userRef.set({
      ...userData,
      createdAt: new Date(),
      preferences: {
        language: user.language_code?.startsWith('my') ? 'my' : 'en',
        timezone: 'Asia/Yangon',
        defaultCurrency: 'USD',
        preferredSources: ['cbm'],
      },
      stats: {
        commandsUsed: 0,
        favoriteCommands: [],
      },
      isActive: true,
      isAdmin: false,
      isBanned: false,
    });

    console.log('New user registered:', user.id);
  } else {
    // Update existing user
    await userRef.update(userData);
  }
}

// Create webhook URL
export function getWebhookUrl(functionUrl: string, botToken: string): string {
  // Remove any trailing slashes
  const baseUrl = functionUrl.replace(/\/$/, '');

  // Create a hash of the bot token for the URL path
  const hash = crypto.createHash('sha256').update(botToken).digest('hex').substring(0, 16);

  return `${baseUrl}/webhook/${hash}`;
}
