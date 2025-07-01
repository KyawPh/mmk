import * as functions from 'firebase-functions';

interface Config {
  telegram: {
    botToken: string;
    webhookSecret: string;
  };
  admin: {
    telegramIds: string[];
  };
  features: {
    enableAnalytics: boolean;
    enableDebugLogs: boolean;
  };
  rateLimit: {
    perUserPerMinute: number;
    globalPerMinute: number;
  };
  cache: {
    ttlRates: number;
    ttlUserData: number;
  };
  monitoring: {
    sentryDsn?: string;
    enabled: boolean;
  };
  apis: {
    wise?: string;
    westernUnion?: string;
  };
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  // First try Firebase functions config
  const firebaseConfig = functions.config() as Record<string, unknown>;
  const keys = key.toLowerCase().split('_');
  let value: unknown = firebaseConfig;

  for (const k of keys) {
    if (typeof value === 'object' && value !== null && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      value = undefined;
      break;
    }
  }

  if (value !== undefined && value !== null) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
  }

  // Fallback to process.env for local development
  const envValue = process.env[key];
  if (envValue) {
    return envValue;
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new Error(`Missing required environment variable: ${key}`);
};

const getBooleanEnv = (key: string, defaultValue: boolean): boolean => {
  try {
    const value = getEnvVar(key, String(defaultValue));
    return value.toLowerCase() === 'true';
  } catch {
    return defaultValue;
  }
};

const getNumberEnv = (key: string, defaultValue: number): number => {
  try {
    const value = getEnvVar(key, String(defaultValue));
    return parseInt(value, 10);
  } catch {
    return defaultValue;
  }
};

export const config: Config = {
  telegram: {
    botToken: getEnvVar('TELEGRAM_BOT_TOKEN'),
    webhookSecret: getEnvVar('TELEGRAM_WEBHOOK_SECRET', 'default-webhook-secret'),
  },
  admin: {
    telegramIds: getEnvVar('ADMIN_TELEGRAM_IDS', '').split(',').filter(Boolean),
  },
  features: {
    enableAnalytics: getBooleanEnv('ENABLE_ANALYTICS', true),
    enableDebugLogs: getBooleanEnv('ENABLE_DEBUG_LOGS', false),
  },
  rateLimit: {
    perUserPerMinute: getNumberEnv('RATE_LIMIT_PER_USER_PER_MINUTE', 20),
    globalPerMinute: getNumberEnv('RATE_LIMIT_GLOBAL_PER_MINUTE', 1000),
  },
  cache: {
    ttlRates: getNumberEnv('CACHE_TTL_RATES', 300),
    ttlUserData: getNumberEnv('CACHE_TTL_USER_DATA', 3600),
  },
  monitoring: {
    sentryDsn: getEnvVar('SENTRY_DSN', ''),
    enabled: getBooleanEnv('MONITORING_ENABLED', false),
  },
  apis: {
    wise: getEnvVar('WISE_API_KEY', ''),
    westernUnion: getEnvVar('WESTERN_UNION_API_KEY', ''),
  },
};

export const isProduction = (): boolean => process.env['NODE_ENV'] === 'production';

export const isDevelopment = (): boolean => process.env['NODE_ENV'] === 'development';

export const isAdmin = (telegramId: string): boolean =>
  config.admin.telegramIds.includes(telegramId);
