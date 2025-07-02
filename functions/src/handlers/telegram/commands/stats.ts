import { CommandContext } from '../../../types/telegram';
import { sendMessage } from '../../../utils/telegram';
import { userService } from '../../../user/UserService';
import { analyticsService } from '../../../analytics/AnalyticsService';
import { createBarChart, formatDuration, formatNumber } from '../../../ui/formatting';
import { getProgressBar } from '../../../ui/indicators';

// Handle stats command - show user's personal statistics
export async function handleStats(ctx: CommandContext): Promise<void> {
  const { chatId, userId } = ctx;

  try {
    await sendMessage(chatId, '📊 Loading your statistics...');

    // Get user profile
    const user = await userService.getUser(userId.toString());
    if (!user) {
      await sendMessage(chatId, '❌ User profile not found. Please try /start first.');
      return;
    }

    // Get user engagement data
    const engagement = await analyticsService.getUserEngagement(userId.toString(), 30);

    // Calculate member duration
    const createdAtDate =
      user.createdAt instanceof Date ? user.createdAt : (user.createdAt as any).toDate();
    const memberDays = Math.floor((Date.now() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get favorite commands
    const topCommands = Object.entries(user.statistics.commandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Create command usage chart
    const commandChart =
      topCommands.length > 0
        ? createBarChart(
            topCommands.map(([cmd, count]) => ({
              label: cmd.replace('/', ''),
              value: count,
            })),
            { width: 15, showValues: true }
          )
        : 'No commands used yet';

    // Calculate activity level
    const activityScore = Math.min(100, (engagement.avgEventsPerActiveDay / 10) * 100);
    const activityBar = getProgressBar(activityScore, 10);

    // Format daily activity
    const recentDays = Object.keys(engagement.dailyActivity).length;
    const avgActivity = engagement.totalEvents / (recentDays || 1);

    const message = `
📊 *Your Statistics*

*Profile:*
• Member for: ${memberDays} days
• Total Commands: ${formatNumber(user.statistics.totalCommands)}
• Favorite Command: ${user.statistics.favoriteCommand ?? 'None'}
• Avg Commands/Day: ${user.statistics.averageCommandsPerDay.toFixed(1)}

*Activity (Last 30 Days):*
• Active Days: ${engagement.activeDays}/30
• Total Actions: ${engagement.totalEvents}
• Daily Average: ${avgActivity.toFixed(1)}
• Activity Level: ${activityBar} ${activityScore.toFixed(0)}%

*Command Usage:*
${commandChart}

*Engagement:*
• Commands: ${engagement.commandCount}
• Actions: ${engagement.actionCount}
• Errors: ${engagement.errorCount}
${engagement.errorCount > 0 ? `• Error Rate: ${((engagement.errorCount / engagement.commandCount) * 100).toFixed(1)}%` : ''}

*Settings:*
• Language: ${user.preferences.language}
• Timezone: ${user.preferences.timezone}
• Default Currency: ${user.preferences.defaultCurrency}

_Last active: ${formatDuration(Math.floor((Date.now() - (user.lastActive instanceof Date ? user.lastActive : (user.lastActive as any).toDate()).getTime()) / 1000))} ago_
    `.trim();

    await sendMessage(chatId, message);
  } catch {
    await sendMessage(chatId, '❌ Failed to load statistics. Please try again later.');
  }
}
