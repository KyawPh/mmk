// Exchange rate data types for collectors

export interface ExchangeRate {
  currency: string; // e.g., 'USD', 'EUR'
  rate: number; // Exchange rate in MMK
  buyRate?: number; // Buy rate (if different from base rate)
  sellRate?: number; // Sell rate (if different from base rate)
  timestamp: Date;
  source: string; // e.g., 'CBM', 'KBZ', 'AYA'
  sourceUrl?: string;
  lastUpdated: Date;
}

export interface CollectorResult {
  success: boolean;
  rates: ExchangeRate[];
  error?: string;
  metadata?: {
    collectionTime: number; // milliseconds
    rateCount: number;
    warnings?: string[];
  };
}

export interface Collector {
  name: string;
  priority: 'high' | 'medium' | 'low';
  collect(): Promise<CollectorResult>;
}

// Rate document structure for Firestore
export interface RateDocument {
  id: string; // Format: {source}_{currency}_{timestamp}
  source: string;
  currency: string;
  rate: number;
  buyRate?: number;
  sellRate?: number;
  timestamp: Date;
  createdAt: Date;
  metadata?: {
    sourceUrl?: string;
    collectorVersion?: string;
    [key: string]: any;
  };
}

// Collection status for monitoring
export interface CollectionStatus {
  source: string;
  lastRun: Date;
  lastSuccess?: Date;
  consecutiveFailures: number;
  lastError?: string;
  isActive: boolean;
}
