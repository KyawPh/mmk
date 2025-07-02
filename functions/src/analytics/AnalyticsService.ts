import { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from '../utils/firebase';
import {
  CollectorHealth,
  CommandMetric,
  EventType,
  HealthAlert,
  SystemHealth,
  UserEvent,
} from '../types/user';
import { BaseError } from '../utils/errors';

export class AnalyticsService {
  private db: Firestore;
  private readonly EVENTS_COLLECTION = 'analytics_events';
  private readonly METRICS_COLLECTION = 'analytics_metrics';
  private readonly HEALTH_COLLECTION = 'system_health';

  constructor() {
    this.db = getFirestore();
  }

  // Track user event
  async trackEvent(event: Omit<UserEvent, 'timestamp'>): Promise<void> {
    try {
      const eventData = {
        ...event,
        timestamp: new Date(),
      };

      await this.db.collection(this.EVENTS_COLLECTION).add(eventData);

      // Update command metrics if it's a command event
      if (event.eventType === EventType.COMMAND) {
        await this.updateCommandMetric(event.eventName, event.userId);
      }
    } catch (error) {
      // Don't throw - analytics shouldn't break the bot
      console.error('Failed to track event:', error);
    }
  }

  // Track command usage
  async trackCommand(
    userId: string,
    command: string,
    executionTime: number,
    success: boolean,
    properties?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      userId,
      eventType: EventType.COMMAND,
      eventName: command,
      platform: 'telegram',
      properties: {
        ...properties,
        executionTime,
        success,
      },
    });
  }

  // Track user action
  async trackAction(
    userId: string,
    action: string,
    properties?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      userId,
      eventType: EventType.ACTION,
      eventName: action,
      platform: 'telegram',
      properties,
    });
  }

  // Track error
  async trackError(userId: string, error: string, context?: Record<string, any>): Promise<void> {
    await this.trackEvent({
      userId,
      eventType: EventType.ERROR,
      eventName: error,
      platform: 'telegram',
      properties: context,
    });
  }

  // Update command metric
  private async updateCommandMetric(command: string, userId: string): Promise<void> {
    try {
      const metricRef = this.db.collection(this.METRICS_COLLECTION).doc(command);
      const doc = await metricRef.get();
      const now = new Date();

      if (doc.exists) {
        const metric = doc.data() as CommandMetric;
        const uniqueUsersSet = new Set((metric.metadata?.['uniqueUsersList'] as string[]) ?? []);
        uniqueUsersSet.add(userId);

        await metricRef.update({
          count: metric.count + 1,
          uniqueUsers: uniqueUsersSet.size,
          lastUsed: now,
          'metadata.uniqueUsersList': Array.from(uniqueUsersSet).slice(-1000), // Keep last 1000 users
        });
      } else {
        const newMetric: CommandMetric = {
          command,
          count: 1,
          uniqueUsers: 1,
          avgExecutionTime: 0,
          errorRate: 0,
          lastUsed: now,
          metadata: {
            uniqueUsersList: [userId],
          },
        };
        await metricRef.set(newMetric);
      }
    } catch (error) {
      console.error('Failed to update command metric:', error);
    }
  }

  // Get command metrics
  async getCommandMetrics(limit: number = 20): Promise<CommandMetric[]> {
    try {
      const snapshot = await this.db
        .collection(this.METRICS_COLLECTION)
        .orderBy('count', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data() as CommandMetric);
    } catch (error) {
      throw new BaseError('Failed to get command metrics', 'METRICS_GET_ERROR', 500, error);
    }
  }

  // Get user engagement metrics
  async getUserEngagement(userId: string, days: number = 30): Promise<any> {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const snapshot = await this.db
        .collection(this.EVENTS_COLLECTION)
        .where('userId', '==', userId)
        .where('timestamp', '>', cutoffDate)
        .orderBy('timestamp', 'desc')
        .get();

      const events = snapshot.docs.map((doc) => doc.data() as UserEvent);

      // Calculate engagement metrics
      const commandCount = events.filter((e) => e.eventType === EventType.COMMAND).length;
      const actionCount = events.filter((e) => e.eventType === EventType.ACTION).length;
      const errorCount = events.filter((e) => e.eventType === EventType.ERROR).length;

      // Group by day
      const dailyActivity: Record<string, number> = {};
      events.forEach((event) => {
        const eventDate =
          event.timestamp instanceof Date ? event.timestamp : (event.timestamp as any).toDate();
        const day = eventDate.toISOString().split('T')[0];
        dailyActivity[day] = (Number(dailyActivity[day]) || 0) + 1;
      });

      const activeDays = Object.keys(dailyActivity).length;
      const avgEventsPerActiveDay = events.length / (activeDays || 1);

      return {
        totalEvents: events.length,
        commandCount,
        actionCount,
        errorCount,
        activeDays,
        avgEventsPerActiveDay,
        dailyActivity,
        recentEvents: events.slice(0, 10),
      };
    } catch (error) {
      throw new BaseError('Failed to get user engagement', 'ENGAGEMENT_GET_ERROR', 500, error);
    }
  }

  // Get system health
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const now = new Date();
      const healthRef = this.db.collection(this.HEALTH_COLLECTION).doc('current');
      const doc = await healthRef.get();

      if (doc.exists) {
        return doc.data() as SystemHealth;
      }

      // Return default health if not found
      return {
        timestamp: now,
        uptime: 0,
        totalUsers: 0,
        activeUsers24h: 0,
        activeUsers7d: 0,
        commandsToday: 0,
        errorsToday: 0,
        avgResponseTime: 0,
        collectorStatus: {},
        alerts: [],
      };
    } catch (error) {
      throw new BaseError('Failed to get system health', 'HEALTH_GET_ERROR', 500, error);
    }
  }

  // Update system health
  async updateSystemHealth(health: Partial<SystemHealth>): Promise<void> {
    try {
      const healthRef = this.db.collection(this.HEALTH_COLLECTION).doc('current');
      await healthRef.set(
        {
          ...health,
          timestamp: new Date(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Failed to update system health:', error);
    }
  }

  // Update collector health
  async updateCollectorHealth(collectorName: string, health: CollectorHealth): Promise<void> {
    try {
      await this.updateSystemHealth({
        [`collectorStatus.${collectorName}`]: health,
      });
    } catch (error) {
      console.error('Failed to update collector health:', error);
    }
  }

  // Add health alert
  async addHealthAlert(alert: Omit<HealthAlert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    try {
      const healthRef = this.db.collection(this.HEALTH_COLLECTION).doc('current');
      const doc = await healthRef.get();
      const currentHealth = doc.exists ? (doc.data() as SystemHealth) : null;

      const newAlert: HealthAlert = {
        ...alert,
        id: Date.now().toString(),
        timestamp: new Date(),
        resolved: false,
      };

      const alerts = [...(currentHealth?.alerts ?? []), newAlert].slice(-50); // Keep last 50 alerts

      await healthRef.update({ alerts });
    } catch (error) {
      console.error('Failed to add health alert:', error);
    }
  }

  // Get error rate
  async getErrorRate(hours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const [totalSnapshot, errorSnapshot] = await Promise.all([
        this.db
          .collection(this.EVENTS_COLLECTION)
          .where('timestamp', '>', cutoffTime)
          .where('eventType', '==', EventType.COMMAND)
          .count()
          .get(),
        this.db
          .collection(this.EVENTS_COLLECTION)
          .where('timestamp', '>', cutoffTime)
          .where('eventType', '==', EventType.ERROR)
          .count()
          .get(),
      ]);

      const totalCommands = totalSnapshot.data().count;
      const totalErrors = errorSnapshot.data().count;

      return totalCommands > 0 ? (totalErrors / totalCommands) * 100 : 0;
    } catch (error) {
      console.error('Failed to get error rate:', error);
      return 0;
    }
  }

  // Get popular commands by hour
  async getPopularCommandsByHour(): Promise<Record<number, string[]>> {
    try {
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const snapshot = await this.db
        .collection(this.EVENTS_COLLECTION)
        .where('timestamp', '>', last7Days)
        .where('eventType', '==', EventType.COMMAND)
        .get();

      const hourlyCommands: Record<number, Record<string, number>> = {};

      snapshot.docs.forEach((doc) => {
        const event = doc.data() as UserEvent;
        const eventDate =
          event.timestamp instanceof Date ? event.timestamp : (event.timestamp as any).toDate();
        const hour = eventDate.getHours();

        hourlyCommands[hour] ??= {};

        const command = event.eventName;
        hourlyCommands[hour][command] = (Number(hourlyCommands[hour][command]) || 0) + 1;
      });

      // Get top 3 commands for each hour
      const popularByHour: Record<number, string[]> = {};
      Object.entries(hourlyCommands).forEach(([hour, commands]) => {
        popularByHour[parseInt(hour)] = Object.entries(commands)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([cmd]) => cmd);
      });

      return popularByHour;
    } catch (error) {
      console.error('Failed to get popular commands by hour:', error);
      return {};
    }
  }

  // Clean up old events
  async cleanupOldEvents(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      const snapshot = await this.db
        .collection(this.EVENTS_COLLECTION)
        .where('timestamp', '<', cutoffDate)
        .limit(500) // Delete in batches
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return snapshot.size;
    } catch (error) {
      console.error('Failed to cleanup old events:', error);
      return 0;
    }
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();
