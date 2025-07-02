import { CommandContext } from '../../../types/telegram';
import { sendMessage } from '../../../utils/telegram';
import { userService } from '../../../user/UserService';
import { analyticsService } from '../../../analytics/AnalyticsService';
import { collectionOrchestrator } from '../../../collectors/CollectionOrchestrator';
import { createBarChart, createTable, formatNumber } from '../../../ui/formatting';
import { UserStatus } from '../../../types/user';
import { getFirestore } from '../../../utils/firebase';

// Admin command handler
export async function handleAdminCommand(ctx: CommandContext): Promise<void> {
  const { chatId, userId, args } = ctx;

  // Check if user is admin
  const isAdmin = await userService.isAdmin(userId.toString());
  if (!isAdmin) {
    await sendMessage(chatId, '❌ This command is only available to administrators.');
    return;
  }

  const subCommand = args[0]?.toLowerCase();

  switch (subCommand) {
    case 'stats':
      await handleStatsCommand(ctx);
      break;
    case 'users':
      await handleUsersCommand(ctx);
      break;
    case 'health':
      await handleHealthCommand(ctx);
      break;
    case 'collect':
      await handleCollectCommand(ctx);
      break;
    case 'ban':
      await handleBanCommand(ctx);
      break;
    case 'unban':
      await handleUnbanCommand(ctx);
      break;
    case 'broadcast':
      await handleBroadcastCommand(ctx);
      break;
    case 'cleanup':
      await handleCleanupCommand(ctx);
      break;
    case 'setrate':
      await handleSetRateCommand(ctx);
      break;
    default:
      await showAdminHelp(chatId);
  }
}

// Show admin help
async function showAdminHelp(chatId: number): Promise<void> {
  const message = `
🛡️ *Admin Commands*

*Statistics & Monitoring:*
• \`/admin stats\` - System statistics
• \`/admin users [count]\` - User list/stats
• \`/admin health\` - System health check

*Data Management:*
• \`/admin collect\` - Force rate collection
• \`/admin setrate [currency] [rate]\` - Manual rate update
• \`/admin cleanup [days]\` - Clean old data

*User Management:*
• \`/admin ban [userId]\` - Ban user
• \`/admin unban [userId]\` - Unban user
• \`/admin broadcast [message]\` - Send to all users

_Use with caution!_
  `.trim();

  await sendMessage(chatId, message);
}

// Handle stats command
async function handleStatsCommand(ctx: CommandContext): Promise<void> {
  const { chatId } = ctx;

  try {
    await sendMessage(chatId, '📊 Gathering system statistics...');

    // Get various statistics
    const [health, metrics, errorRate, activeUsers24h, activeUsers7d] = await Promise.all([
      analyticsService.getSystemHealth(),
      analyticsService.getCommandMetrics(10),
      analyticsService.getErrorRate(24),
      userService.getActiveUsersCount(24),
      userService.getActiveUsersCount(24 * 7),
    ]);

    // Format command metrics table
    const commandData = metrics.map((m) => ({
      command: m.command,
      uses: m.count,
      users: m.uniqueUsers,
      lastUsed: new Date(m.lastUsed).toLocaleString('en-US', { timeZone: 'Asia/Yangon' }),
    }));

    const commandTable = createTable(
      commandData,
      [
        { key: 'command', label: 'Command', align: 'left' },
        { key: 'uses', label: 'Uses', align: 'right' },
        { key: 'users', label: 'Users', align: 'right' },
        { key: 'lastUsed', label: 'Last Used', align: 'left' },
      ],
      { maxWidth: 20 }
    );

    // Create usage chart
    const usageChart = createBarChart(
      metrics.slice(0, 5).map((m) => ({ label: m.command, value: m.count })),
      { width: 15, showValues: true }
    );

    const message = `
📊 *System Statistics*

*User Activity:*
• Total Users: ${formatNumber(health.totalUsers)}
• Active (24h): ${formatNumber(activeUsers24h)}
• Active (7d): ${formatNumber(activeUsers7d)}

*Performance:*
• Commands Today: ${formatNumber(health.commandsToday)}
• Avg Response: ${health.avgResponseTime.toFixed(0)}ms
• Error Rate: ${errorRate.toFixed(2)}%

*Top Commands:*
${commandTable}

*Usage Distribution:*
${usageChart}

_Generated at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Yangon' })}_
    `.trim();

    await sendMessage(chatId, message);
  } catch {
    await sendMessage(chatId, '❌ Failed to get statistics. Please try again.');
  }
}

// Handle users command
async function handleUsersCommand(ctx: CommandContext): Promise<void> {
  const { chatId, args } = ctx;
  const limit = parseInt(args[1] ?? '10');

  try {
    await sendMessage(chatId, '👥 Fetching user data...');

    const db = getFirestore();
    const snapshot = await db
      .collection('users')
      .orderBy('lastActive', 'desc')
      .limit(Math.min(limit, 50))
      .get();

    const users = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        name: data.firstName ?? 'Unknown',
        username: data.username ? `@${data.username}` : '-',
        commands: data.statistics?.totalCommands ?? 0,
        lastActive: new Date(data.lastActive.toDate()).toLocaleDateString(),
        role: data.role,
      };
    });

    const userTable = createTable(
      users,
      [
        { key: 'name', label: 'Name', align: 'left' },
        { key: 'username', label: 'Username', align: 'left' },
        { key: 'commands', label: 'Cmds', align: 'right' },
        { key: 'lastActive', label: 'Last Active', align: 'left' },
        { key: 'role', label: 'Role', align: 'left' },
      ],
      { maxWidth: 15 }
    );

    const message = `
👥 *Recent Users* (Top ${limit})

${userTable}

Total users shown: ${users.length}
    `.trim();

    await sendMessage(chatId, message);
  } catch {
    await sendMessage(chatId, '❌ Failed to get user list. Please try again.');
  }
}

// Handle health command
async function handleHealthCommand(ctx: CommandContext): Promise<void> {
  const { chatId } = ctx;

  try {
    await sendMessage(chatId, '🏥 Running health checks...');

    const health = await analyticsService.getSystemHealth();

    // Format collector status
    const collectorRows = Object.entries(health.collectorStatus).map(([name, status]) => ({
      name,
      status: status.status === 'healthy' ? '✅' : status.status === 'degraded' ? '⚠️' : '❌',
      success: `${(status.successRate * 100).toFixed(0)}%`,
      time: `${status.avgResponseTime.toFixed(0)}ms`,
    }));

    const collectorTable = createTable(
      collectorRows,
      [
        { key: 'name', label: 'Collector', align: 'left' },
        { key: 'status', label: 'Status', align: 'center' },
        { key: 'success', label: 'Success', align: 'right' },
        { key: 'time', label: 'Avg Time', align: 'right' },
      ],
      { maxWidth: 20 }
    );

    // Format recent alerts
    const recentAlerts = health.alerts
      .filter((a) => !a.resolved)
      .slice(-5)
      .map(
        (a) =>
          `${a.severity === 'critical' ? '🚨' : a.severity === 'error' ? '❌' : '⚠️'} ${a.message}`
      );

    const message = `
🏥 *System Health Check*

*Overall Status:* ${health.errorsToday < 10 ? '✅ Healthy' : '⚠️ Degraded'}
*Uptime:* ${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m

*Collectors:*
${collectorTable}

${recentAlerts.length > 0 ? `*Recent Alerts:*\n${recentAlerts.join('\n')}\n` : ''}
_Last check: ${new Date(health.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Yangon' })}_
    `.trim();

    await sendMessage(chatId, message);
  } catch {
    await sendMessage(chatId, '❌ Failed to run health check. Please try again.');
  }
}

// Handle collect command
async function handleCollectCommand(ctx: CommandContext): Promise<void> {
  const { chatId } = ctx;

  try {
    await sendMessage(chatId, '🔄 Starting manual collection...');

    const startTime = Date.now();
    const results = await collectionOrchestrator.collectAll();
    const duration = Date.now() - startTime;

    const successful = results.successCount;
    const failed = results.failureCount;
    const total = results.results.size;

    const resultDetails = Array.from(results.results.entries())
      .map(
        ([source, result]) =>
          `${result.success ? '✅' : '❌'} ${source}: ${result.success ? `${result.rates?.length ?? 0} rates` : (results.errors.get(source) ?? 'Unknown error')}`
      )
      .join('\n');

    const message = `
🔄 *Manual Collection Complete*

*Summary:*
• Success: ${successful}/${total}
• Failed: ${failed}
• Duration: ${(duration / 1000).toFixed(1)}s

*Details:*
${resultDetails}
    `.trim();

    await sendMessage(chatId, message);
  } catch {
    await sendMessage(chatId, '❌ Failed to run collection. Please try again.');
  }
}

// Handle ban command
async function handleBanCommand(ctx: CommandContext): Promise<void> {
  const { chatId, args } = ctx;
  const targetUserId = args[1];

  if (!targetUserId) {
    await sendMessage(chatId, '❌ Please provide a user ID to ban.\nUsage: `/admin ban [userId]`');
    return;
  }

  try {
    await userService.updateUserStatus(targetUserId, UserStatus.BANNED);
    await sendMessage(chatId, `✅ User ${targetUserId} has been banned.`);
  } catch {
    await sendMessage(chatId, '❌ Failed to ban user. Please check the user ID and try again.');
  }
}

// Handle unban command
async function handleUnbanCommand(ctx: CommandContext): Promise<void> {
  const { chatId, args } = ctx;
  const targetUserId = args[1];

  if (!targetUserId) {
    await sendMessage(
      chatId,
      '❌ Please provide a user ID to unban.\nUsage: `/admin unban [userId]`'
    );
    return;
  }

  try {
    await userService.updateUserStatus(targetUserId, UserStatus.ACTIVE);
    await sendMessage(chatId, `✅ User ${targetUserId} has been unbanned.`);
  } catch {
    await sendMessage(chatId, '❌ Failed to unban user. Please check the user ID and try again.');
  }
}

// Handle broadcast command
async function handleBroadcastCommand(ctx: CommandContext): Promise<void> {
  const { chatId, args } = ctx;
  const message = args.slice(1).join(' ');

  if (!message) {
    await sendMessage(
      chatId,
      '❌ Please provide a message to broadcast.\nUsage: `/admin broadcast [message]`'
    );
    return;
  }

  try {
    await sendMessage(
      chatId,
      '📢 Starting broadcast...\n\n⚠️ This feature is not yet implemented for safety reasons.'
    );
    // TODO: Implement with rate limiting and user consent checks
  } catch {
    await sendMessage(chatId, '❌ Failed to broadcast message.');
  }
}

// Handle cleanup command
async function handleCleanupCommand(ctx: CommandContext): Promise<void> {
  const { chatId, args } = ctx;
  const days = parseInt(args[1] ?? '90');

  try {
    await sendMessage(chatId, `🧹 Starting cleanup of data older than ${days} days...`);

    const deletedCount = await analyticsService.cleanupOldEvents(days);

    await sendMessage(chatId, `✅ Cleanup complete!\n\nDeleted ${deletedCount} old events.`);
  } catch {
    await sendMessage(chatId, '❌ Failed to run cleanup. Please try again.');
  }
}

// Handle set rate command
async function handleSetRateCommand(ctx: CommandContext): Promise<void> {
  const { chatId, args } = ctx;
  const currency = args[1]?.toUpperCase();
  const rate = parseFloat(args[2] ?? '');

  if (!currency || isNaN(rate)) {
    await sendMessage(
      chatId,
      '❌ Invalid parameters.\nUsage: `/admin setrate [currency] [rate]`\nExample: `/admin setrate USD 3500`'
    );
    return;
  }

  try {
    // Create manual rate entry
    const db = getFirestore();
    await db.collection('rates').add({
      currency,
      rate,
      buyRate: rate,
      sellRate: rate,
      source: 'Manual',
      timestamp: new Date(),
      metadata: {
        setBy: ctx.userId.toString(),
        type: 'manual_override',
      },
    });

    await sendMessage(
      chatId,
      `✅ Manual rate set successfully!\n\n${currency}/MMK: ${formatNumber(rate)}`
    );
  } catch {
    await sendMessage(chatId, '❌ Failed to set rate. Please try again.');
  }
}
