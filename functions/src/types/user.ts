// User management types

export interface UserProfile {
  id: string; // Telegram user ID
  username?: string;
  firstName: string;
  lastName?: string;
  languageCode?: string;
  isBot: boolean;
  isPremium?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActive: Date;
  status: UserStatus;
  role: UserRole;
  preferences: UserPreferences;
  subscription?: UserSubscription;
  statistics: UserStatistics;
  metadata?: Record<string, any>;
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
  DELETED = 'deleted',
}

export enum UserRole {
  USER = 'user',
  PREMIUM = 'premium',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export interface UserPreferences {
  language: string;
  timezone: string;
  defaultCurrency: string;
  defaultSource: string;
  notificationsEnabled: boolean;
  compactMode: boolean;
  showSourceAttribution: boolean;
  theme?: 'light' | 'dark';
}

export interface UserSubscription {
  type: SubscriptionType;
  frequency: SubscriptionFrequency;
  time: string; // HH:MM format
  timezone: string;
  currencies: string[];
  sources: string[];
  active: boolean;
  lastSent?: Date;
  nextScheduled?: Date;
}

export enum SubscriptionType {
  RATES = 'rates',
  ALERTS = 'alerts',
  SUMMARY = 'summary',
}

export enum SubscriptionFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export interface UserStatistics {
  totalCommands: number;
  commandCounts: Record<string, number>;
  lastCommand?: string;
  lastCommandAt?: Date;
  totalMessages: number;
  firstSeen: Date;
  daysActive: number;
  favoriteCommand?: string;
  averageCommandsPerDay: number;
}

export interface UserSession {
  userId: string;
  sessionId: string;
  startedAt: Date;
  lastActivity: Date;
  commandCount: number;
  context?: Record<string, any>;
  isActive: boolean;
}

export interface UserAlert {
  id: string;
  userId: string;
  currency: string;
  source?: string;
  type: 'above' | 'below';
  targetRate: number;
  createdAt: Date;
  triggeredAt?: Date;
  triggeredCount: number;
  active: boolean;
  expiresAt?: Date;
}

// Analytics types
export interface UserEvent {
  userId: string;
  eventType: EventType;
  eventName: string;
  timestamp: Date;
  properties?: Record<string, any>;
  sessionId?: string;
  platform: 'telegram' | 'viber' | 'messenger';
}

export enum EventType {
  COMMAND = 'command',
  ACTION = 'action',
  ERROR = 'error',
  SYSTEM = 'system',
  ENGAGEMENT = 'engagement',
}

export interface CommandMetric {
  command: string;
  count: number;
  uniqueUsers: number;
  avgExecutionTime: number;
  errorRate: number;
  lastUsed: Date;
  peakHour?: number;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  timestamp: Date;
  uptime: number;
  totalUsers: number;
  activeUsers24h: number;
  activeUsers7d: number;
  commandsToday: number;
  errorsToday: number;
  avgResponseTime: number;
  collectorStatus: Record<string, CollectorHealth>;
  alerts: HealthAlert[];
}

export interface CollectorHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastSuccess?: Date;
  lastError?: Date;
  successRate: number;
  avgResponseTime: number;
}

export interface HealthAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}
