import { CommandContext } from '../types/telegram';
import { userService } from '../user/UserService';
import { analyticsService } from '../analytics/AnalyticsService';
import { UserStatus } from '../types/user';

// Middleware to track user activity
export async function trackingMiddleware(
  ctx: CommandContext,
  next: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  let success = true;

  try {
    // Update or create user profile
    if (ctx.from) {
      await userService.upsertUser(ctx.from);
    }

    // Execute the command
    await next();

    // Record command usage
    if (ctx.userId && ctx.command) {
      await userService.recordCommand(ctx.userId.toString(), ctx.command);
    }
  } catch (error) {
    success = false;
    throw error; // Re-throw to maintain error handling flow
  } finally {
    // Track analytics
    if (ctx.userId && ctx.command) {
      const executionTime = Date.now() - startTime;

      await analyticsService.trackCommand(
        ctx.userId.toString(),
        ctx.command,
        executionTime,
        success,
        {
          args: ctx.args,
          messageType: ctx.messageType,
          platform: 'telegram',
        }
      );

      // Track errors if failed
      if (!success) {
        await analyticsService.trackError(ctx.userId.toString(), `command_error_${ctx.command}`, {
          command: ctx.command,
          args: ctx.args,
        });
      }
    }
  }
}

// Middleware to check user status
export async function userStatusMiddleware(
  ctx: CommandContext,
  next: () => Promise<void>
): Promise<void> {
  if (ctx.userId) {
    const user = await userService.getUser(ctx.userId.toString());

    if (user?.status === UserStatus.BANNED) {
      // Silently ignore messages from banned users
      return;
    }
  }

  await next();
}

// Middleware to track callback queries
export async function trackCallbackQuery(
  userId: string,
  action: string,
  data?: any
): Promise<void> {
  await analyticsService.trackAction(userId.toString(), `callback_${action}`, data);
}
