import { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from '../utils/firebase';
import {
  UserAlert,
  UserPreferences,
  UserProfile,
  UserRole,
  UserStatistics,
  UserStatus,
  UserSubscription,
} from '../types/user';
import { BaseError } from '../utils/errors';

export class UserService {
  private db: Firestore;
  private readonly COLLECTION = 'users';
  private readonly ALERTS_COLLECTION = 'alerts';

  constructor() {
    this.db = getFirestore();
  }

  // Create or update user profile
  async upsertUser(telegramUser: any): Promise<UserProfile> {
    const userId = telegramUser.id.toString();
    const userRef = this.db.collection(this.COLLECTION).doc(userId);

    try {
      const doc = await userRef.get();
      const now = new Date();

      if (doc.exists) {
        // Update existing user
        const existingUser = doc.data() as UserProfile;
        const updates: Partial<UserProfile> = {
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          languageCode: telegramUser.language_code,
          isPremium: telegramUser.is_premium ?? false,
          lastActive: now,
          updatedAt: now,
        };

        // Update statistics
        const createdAtDate =
          existingUser.createdAt instanceof Date
            ? existingUser.createdAt
            : (existingUser.createdAt as any).toDate();
        const daysSinceCreated = Math.floor(
          (now.getTime() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        updates.statistics = {
          ...existingUser.statistics,
          daysActive: daysSinceCreated,
        };

        await userRef.update(updates);
        return { ...existingUser, ...updates };
      } else {
        // Create new user
        const newUser: UserProfile = {
          id: userId,
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          languageCode: telegramUser.language_code,
          isBot: telegramUser.is_bot ?? false,
          isPremium: telegramUser.is_premium ?? false,
          createdAt: now,
          updatedAt: now,
          lastActive: now,
          status: UserStatus.ACTIVE,
          role: UserRole.USER,
          preferences: this.getDefaultPreferences(telegramUser.language_code),
          statistics: this.getDefaultStatistics(now),
        };

        await userRef.set(newUser);
        return newUser;
      }
    } catch (error) {
      throw new BaseError('Failed to upsert user', 'USER_UPSERT_ERROR', 500, error);
    }
  }

  // Get user by ID
  async getUser(userId: string): Promise<UserProfile | null> {
    try {
      const doc = await this.db.collection(this.COLLECTION).doc(userId).get();
      return doc.exists ? (doc.data() as UserProfile) : null;
    } catch (error) {
      throw new BaseError('Failed to get user', 'USER_GET_ERROR', 500, error);
    }
  }

  // Update user preferences
  async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserProfile> {
    try {
      const userRef = this.db.collection(this.COLLECTION).doc(userId);
      const doc = await userRef.get();

      if (!doc.exists) {
        throw new Error('User not found');
      }

      const user = doc.data() as UserProfile;
      const updatedPreferences = { ...user.preferences, ...preferences };

      await userRef.update({
        preferences: updatedPreferences,
        updatedAt: new Date(),
      });

      return { ...user, preferences: updatedPreferences };
    } catch (error) {
      throw new BaseError('Failed to update preferences', 'PREFERENCES_UPDATE_ERROR', 500, error);
    }
  }

  // Update user statistics
  async recordCommand(userId: string, command: string): Promise<void> {
    try {
      const userRef = this.db.collection(this.COLLECTION).doc(userId);
      const doc = await userRef.get();

      if (!doc.exists) {
        return; // User not found, skip recording
      }

      const user = doc.data() as UserProfile;
      const stats = user.statistics;
      const now = new Date();

      // Update command counts
      const commandCounts = { ...stats.commandCounts };
      commandCounts[command] = (Number(commandCounts[command]) || 0) + 1;

      // Find favorite command
      const favoriteCommand =
        Object.entries(commandCounts).length > 0
          ? Object.entries(commandCounts).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
          : undefined;

      // Calculate average commands per day
      const createdAtDate =
        user.createdAt instanceof Date ? user.createdAt : (user.createdAt as any).toDate();
      const daysSinceCreated = Math.max(
        1,
        Math.floor((now.getTime() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      const totalCommands = stats.totalCommands + 1;
      const averageCommandsPerDay = totalCommands / daysSinceCreated;

      await userRef.update({
        'statistics.totalCommands': totalCommands,
        'statistics.commandCounts': commandCounts,
        'statistics.lastCommand': command,
        'statistics.lastCommandAt': now,
        'statistics.favoriteCommand': favoriteCommand,
        'statistics.averageCommandsPerDay': averageCommandsPerDay,
        lastActive: now,
      });
    } catch (error) {
      // Log error but don't throw - statistics shouldn't break the bot
      console.error('Failed to record command:', error);
    }
  }

  // Get user alerts
  async getUserAlerts(userId: string, activeOnly: boolean = true): Promise<UserAlert[]> {
    try {
      let query = this.db
        .collection(this.ALERTS_COLLECTION)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc');

      if (activeOnly) {
        query = query.where('active', '==', true);
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UserAlert);
    } catch (error) {
      throw new BaseError('Failed to get user alerts', 'ALERTS_GET_ERROR', 500, error);
    }
  }

  // Create user alert
  async createAlert(
    userId: string,
    alert: Omit<UserAlert, 'id' | 'userId' | 'createdAt' | 'triggeredCount' | 'active'>
  ): Promise<UserAlert> {
    try {
      const newAlert = {
        ...alert,
        userId,
        createdAt: new Date(),
        triggeredCount: 0,
        active: true,
      };

      const docRef = await this.db.collection(this.ALERTS_COLLECTION).add(newAlert);
      return { id: docRef.id, ...newAlert };
    } catch (error) {
      throw new BaseError('Failed to create alert', 'ALERT_CREATE_ERROR', 500, error);
    }
  }

  // Update user subscription
  async updateSubscription(userId: string, subscription: UserSubscription | null): Promise<void> {
    try {
      await this.db.collection(this.COLLECTION).doc(userId).update({
        subscription,
        updatedAt: new Date(),
      });
    } catch (error) {
      throw new BaseError('Failed to update subscription', 'SUBSCRIPTION_UPDATE_ERROR', 500, error);
    }
  }

  // Get users by role
  async getUsersByRole(role: UserRole): Promise<UserProfile[]> {
    try {
      const snapshot = await this.db
        .collection(this.COLLECTION)
        .where('role', '==', role)
        .where('status', '==', UserStatus.ACTIVE)
        .get();

      return snapshot.docs.map((doc) => doc.data() as UserProfile);
    } catch (error) {
      throw new BaseError('Failed to get users by role', 'USERS_BY_ROLE_ERROR', 500, error);
    }
  }

  // Get active users count
  async getActiveUsersCount(periodHours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - periodHours * 60 * 60 * 1000);
      const snapshot = await this.db
        .collection(this.COLLECTION)
        .where('lastActive', '>', cutoffTime)
        .where('status', '==', UserStatus.ACTIVE)
        .count()
        .get();

      return snapshot.data().count;
    } catch (error) {
      throw new BaseError(
        'Failed to get active users count',
        'ACTIVE_USERS_COUNT_ERROR',
        500,
        error
      );
    }
  }

  // Ban/unban user
  async updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    try {
      await this.db.collection(this.COLLECTION).doc(userId).update({
        status,
        updatedAt: new Date(),
      });
    } catch (error) {
      throw new BaseError('Failed to update user status', 'USER_STATUS_UPDATE_ERROR', 500, error);
    }
  }

  // Check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      return user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
    } catch {
      return false;
    }
  }

  // Helper methods
  private getDefaultPreferences(languageCode?: string): UserPreferences {
    return {
      language: languageCode ?? 'en',
      timezone: 'Asia/Yangon',
      defaultCurrency: 'USD',
      defaultSource: 'CBM',
      notificationsEnabled: true,
      compactMode: false,
      showSourceAttribution: true,
    };
  }

  private getDefaultStatistics(createdAt: Date): UserStatistics {
    return {
      totalCommands: 0,
      commandCounts: {},
      totalMessages: 0,
      firstSeen: createdAt,
      daysActive: 0,
      averageCommandsPerDay: 0,
    };
  }
}

// Singleton instance
export const userService = new UserService();
