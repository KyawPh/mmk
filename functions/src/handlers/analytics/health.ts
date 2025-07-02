import { scheduledFunction } from '../../utils/functions';
import { analyticsService } from '../../analytics/AnalyticsService';
import { userService } from '../../user/UserService';
import { getFirestore } from '../../utils/firebase';
import { CollectorHealth } from '../../types/user';

// Scheduled function to update system health
export const updateSystemHealth = scheduledFunction('every 5 minutes', async () => {
  console.log('Updating system health metrics...');

  try {
    const db = getFirestore();
    const now = new Date();

    // Get user counts
    const [totalUsersSnapshot, activeUsers24h, activeUsers7d] = await Promise.all([
      db.collection('users').count().get(),
      userService.getActiveUsersCount(24),
      userService.getActiveUsersCount(24 * 7),
    ]);

    // Get command counts for today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const commandsSnapshot = await db
      .collection('analytics_events')
      .where('timestamp', '>', todayStart)
      .where('eventType', '==', 'command')
      .count()
      .get();

    const errorsSnapshot = await db
      .collection('analytics_events')
      .where('timestamp', '>', todayStart)
      .where('eventType', '==', 'error')
      .count()
      .get();

    // Calculate average response time from recent commands
    const recentCommands = await db
      .collection('analytics_events')
      .where('timestamp', '>', new Date(now.getTime() - 60 * 60 * 1000)) // Last hour
      .where('eventType', '==', 'command')
      .where('properties.executionTime', '>', 0)
      .limit(100)
      .get();

    let totalExecutionTime = 0;
    let commandCount = 0;
    recentCommands.docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.properties?.executionTime) {
        totalExecutionTime += data.properties.executionTime;
        commandCount++;
      }
    });

    const avgResponseTime = commandCount > 0 ? totalExecutionTime / commandCount : 0;

    // Get collector health from recent rates
    const collectorHealth = await getCollectorHealth();

    // Calculate uptime (simplified - time since last deploy)
    const uptime = Math.floor((now.getTime() - new Date('2024-01-01').getTime()) / 1000);

    // Update system health
    await analyticsService.updateSystemHealth({
      uptime,
      totalUsers: totalUsersSnapshot.data().count,
      activeUsers24h,
      activeUsers7d,
      commandsToday: commandsSnapshot.data().count,
      errorsToday: errorsSnapshot.data().count,
      avgResponseTime,
      collectorStatus: collectorHealth,
    });

    console.log('System health updated successfully');
  } catch (error) {
    console.error('Failed to update system health:', error);
  }
});

// Helper function to calculate collector health
async function getCollectorHealth(): Promise<Record<string, CollectorHealth>> {
  const db = getFirestore();
  const health: Record<string, CollectorHealth> = {};

  const sources = ['CBM', 'KBZ', 'AYA', 'Yoma', 'CB Bank', 'Binance P2P'];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const source of sources) {
    try {
      // Get recent rates for this source
      const snapshot = await db
        .collection('rates')
        .where('source', '==', source)
        .where('timestamp', '>', oneDayAgo)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      if (snapshot.empty) {
        health[source] = {
          name: source,
          status: 'down',
          successRate: 0,
          avgResponseTime: 0,
        };
        continue;
      }

      // Calculate metrics
      const rates = snapshot.docs.map((doc: any) => doc.data());
      const lastRate = rates[0];
      const lastSuccess = lastRate.timestamp.toDate();

      // Simple success rate calculation based on expected hourly updates
      const expectedUpdates = 24; // One per hour
      const actualUpdates = rates.length;
      const successRate = Math.min(actualUpdates / expectedUpdates, 1);

      // Determine status
      const hoursSinceLastUpdate = (Date.now() - lastSuccess.getTime()) / (1000 * 60 * 60);
      let status: 'healthy' | 'degraded' | 'down' = 'healthy';

      if (hoursSinceLastUpdate > 6) {
        status = 'down';
      } else if (hoursSinceLastUpdate > 2 || successRate < 0.8) {
        status = 'degraded';
      }

      health[source] = {
        name: source,
        status,
        lastSuccess,
        successRate,
        avgResponseTime: 1000, // Placeholder - would need actual timing data
      };
    } catch (error) {
      console.error(`Failed to get health for ${source}:`, error);
      health[source] = {
        name: source,
        status: 'down',
        lastError: new Date(),
        successRate: 0,
        avgResponseTime: 0,
      };
    }
  }

  return health;
}

// Function to check for critical issues and create alerts
export const monitorCriticalIssues = scheduledFunction('every 30 minutes', async () => {
  console.log('Monitoring for critical issues...');

  try {
    const health = await analyticsService.getSystemHealth();

    // Check error rate
    const errorRate = await analyticsService.getErrorRate(1); // Last hour
    if (errorRate > 10) {
      await analyticsService.addHealthAlert({
        severity: 'critical',
        component: 'system',
        message: `High error rate detected: ${errorRate.toFixed(1)}%`,
      });
    }

    // Check collector status
    const downCollectors = Object.entries(health.collectorStatus)
      .filter(([, status]) => status.status === 'down')
      .map(([name]) => name);

    if (downCollectors.length > 0) {
      await analyticsService.addHealthAlert({
        severity: 'error',
        component: 'collectors',
        message: `Collectors down: ${downCollectors.join(', ')}`,
      });
    }

    // Check response time
    if (health.avgResponseTime > 5000) {
      await analyticsService.addHealthAlert({
        severity: 'warning',
        component: 'performance',
        message: `High average response time: ${health.avgResponseTime.toFixed(0)}ms`,
      });
    }

    console.log('Critical issue monitoring completed');
  } catch (error) {
    console.error('Failed to monitor critical issues:', error);
  }
});
