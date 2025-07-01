import { TelegramMessage } from '../webhook';
import { sendMessage } from '../../../utils/telegram';
import { ValidationError } from '../../../utils/errors';

// Command handler type
export type CommandHandler = (message: TelegramMessage, args: string) => Promise<void>;

// Command metadata
export interface CommandInfo {
  command: string;
  description: string;
  usage?: string;
  adminOnly?: boolean;
  handler: CommandHandler;
}

// Command router class
class CommandRouter {
  private commands: Map<string, CommandInfo> = new Map();
  private adminIds: Set<string> = new Set();

  constructor() {
    // Load admin IDs from config
    this.loadAdminIds();

    // Register all commands
    this.registerCommands();
  }

  private loadAdminIds() {
    const { config } = require('../../../config');
    const adminIds = config.admin.telegramIds;
    adminIds.forEach((id: string) => this.adminIds.add(id));
  }

  private registerCommands() {
    // Import command handlers
    const { handleStart } = require('./start');
    const { handleHelp } = require('./help');
    const { handleRates } = require('./rates');
    const { handleHistory } = require('./history');
    const { handleAlert } = require('./alert');
    const { handleSubscribe } = require('./subscribe');
    const { handleSettings } = require('./settings');
    const { handlePredict } = require('./predict');
    const { handleCompare } = require('./compare');

    // Register commands
    this.register({
      command: '/start',
      description: 'Welcome message and bot introduction',
      handler: handleStart,
    });

    this.register({
      command: '/help',
      description: 'Show available commands',
      handler: handleHelp,
    });

    this.register({
      command: '/rates',
      description: 'Get current exchange rates',
      usage: '/rates [currency]',
      handler: handleRates,
    });

    this.register({
      command: '/history',
      description: 'View historical exchange rates',
      usage: '/history [days] [currency]',
      handler: handleHistory,
    });

    this.register({
      command: '/alert',
      description: 'Set price alerts',
      usage: '/alert <above|below> <rate> [currency]',
      handler: handleAlert,
    });

    this.register({
      command: '/subscribe',
      description: 'Subscribe to daily/weekly updates',
      usage: '/subscribe <daily|weekly|off>',
      handler: handleSubscribe,
    });

    this.register({
      command: '/settings',
      description: 'Manage your preferences',
      handler: handleSettings,
    });

    this.register({
      command: '/predict',
      description: 'Get rate predictions based on trends',
      usage: '/predict [currency] [days]',
      handler: handlePredict,
    });

    this.register({
      command: '/compare',
      description: 'Compare multiple currencies',
      usage: '/compare [currency1] [currency2] ...',
      handler: handleCompare,
    });

    // Admin commands
    this.register({
      command: '/admin',
      description: 'Admin panel',
      adminOnly: true,
      handler: async (message) => {
        await sendMessage(message.chat.id, 'Admin panel - Coming soon!');
      },
    });
  }

  // Register a command
  register(info: CommandInfo) {
    // Normalize command (ensure it starts with /)
    const command = info.command.startsWith('/') ? info.command : `/${info.command}`;

    // Remove @botname suffix if present
    const baseCommand = command.split('@')[0] || command;

    this.commands.set(baseCommand, { ...info, command: baseCommand });
  }

  // Handle incoming command
  async handle(command: string, message: TelegramMessage, args: string) {
    // Normalize command
    const baseCommand = (command.split('@')[0] || command).toLowerCase();

    // Find command handler
    const commandInfo = this.commands.get(baseCommand);

    if (!commandInfo) {
      await sendMessage(
        message.chat.id,
        `Unknown command: ${command}\nUse /help to see available commands.`
      );
      return;
    }

    // Check admin permission
    if (commandInfo.adminOnly && !this.isAdmin(message.from.id)) {
      await sendMessage(message.chat.id, '⛔ This command is restricted to administrators.');
      return;
    }

    // Update command stats
    await this.updateCommandStats(message.from.id.toString(), baseCommand);

    // Execute command handler
    try {
      await commandInfo.handler(message, args);
    } catch (error) {
      console.error(`Error in command ${baseCommand}:`, error);

      // Send user-friendly error message
      let errorMessage = '❌ An error occurred while processing your command.';

      if (error instanceof ValidationError) {
        errorMessage = `❌ ${error.message}`;
        if (commandInfo.usage) {
          errorMessage += `\n\nUsage: ${commandInfo.usage}`;
        }
      }

      await sendMessage(message.chat.id, errorMessage);
    }
  }

  // Get all commands (for help)
  getCommands(includeAdmin: boolean = false): CommandInfo[] {
    const commands = Array.from(this.commands.values());

    if (!includeAdmin) {
      return commands.filter((cmd) => !cmd.adminOnly);
    }

    return commands;
  }

  // Check if user is admin
  isAdmin(userId: number): boolean {
    return this.adminIds.has(userId.toString());
  }

  // Update command usage statistics
  private async updateCommandStats(userId: string, command: string) {
    try {
      const { db } = await import('../../../utils/firebase');
      const userRef = db.collection('users').doc(userId);

      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(userRef);

        if (!doc.exists) {
          return;
        }

        const userData = doc.data()!;
        const stats = userData['stats'] || { commandsUsed: 0, favoriteCommands: [] };

        stats.commandsUsed = (stats.commandsUsed || 0) + 1;
        stats.lastCommand = command;

        // Update favorite commands
        const favorites = stats.favoriteCommands || [];
        const commandIndex = favorites.findIndex((f: any) => f.command === command);

        if (commandIndex >= 0) {
          favorites[commandIndex].count += 1;
        } else {
          favorites.push({ command, count: 1 });
        }

        // Keep top 5 favorites
        favorites.sort((a: any, b: any) => b.count - a.count);
        stats.favoriteCommands = favorites.slice(0, 5);

        transaction.update(userRef, { stats, lastActive: new Date() });
      });
    } catch (error) {
      console.error('Failed to update command stats:', error);
    }
  }
}

// Export singleton instance
export const commandRouter = new CommandRouter();
