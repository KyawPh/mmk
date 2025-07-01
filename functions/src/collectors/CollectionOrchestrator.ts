import { Collector, CollectorResult, ExchangeRate, RateDocument } from '../types/collectors';
import { db } from '../utils/firebase';
import { CBMCollector } from './CBMCollector';
import { KBZCollector } from './banks/KBZCollector';
import { AYACollector } from './banks/AYACollector';
import { YomaCollector } from './banks/YomaCollector';
import { CBBankCollector } from './banks/CBBankCollector';
import { BinanceP2PCollector } from './crypto/BinanceP2PCollector';

export class CollectionOrchestrator {
  private collectors: Collector[] = [];
  private readonly COLLECTOR_TIMEOUT = 30000; // 30 seconds per collector

  constructor() {
    this.initializeCollectors();
  }

  private initializeCollectors() {
    // Add all active collectors
    this.collectors = [
      new CBMCollector(),
      new KBZCollector(),
      new AYACollector(),
      new YomaCollector(),
      new CBBankCollector(),
      new BinanceP2PCollector(),
    ];

    // Sort by priority
    this.collectors.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  async collectAll(): Promise<{
    successCount: number;
    failureCount: number;
    totalRates: number;
    results: Map<string, CollectorResult>;
    errors: Map<string, string>;
  }> {
    console.log(`Starting collection from ${this.collectors.length} sources...`);
    const startTime = Date.now();

    const results = new Map<string, CollectorResult>();
    const errors = new Map<string, string>();

    try {
      // Run all collectors in parallel with timeout
      const collectionPromises = this.collectors.map((collector) =>
        this.collectWithTimeout(collector)
      );

      const collectionResults = await Promise.allSettled(collectionPromises);

      // Process results
      let successCount = 0;
      let failureCount = 0;
      let totalRates = 0;

      collectionResults.forEach((result, index) => {
        const collector = this.collectors[index];
        if (!collector) {
          return;
        }

        if (result.status === 'fulfilled') {
          const collectorResult = result.value;
          results.set(collector.name, collectorResult);

          if (collectorResult.success) {
            successCount++;
            totalRates += collectorResult.rates.length;

            // Store rates in Firestore
            this.storeRates(collectorResult.rates).catch((error) => {
              console.error(`Failed to store rates from ${collector.name}:`, error);
            });
          } else {
            failureCount++;
            errors.set(collector.name, collectorResult.error || 'Unknown error');
          }
        } else {
          failureCount++;
          const error =
            result.reason instanceof Error ? result.reason.message : 'Collection failed';
          errors.set(collector.name, error);

          results.set(collector.name, {
            success: false,
            rates: [],
            error,
          });
        }
      });

      const totalTime = Date.now() - startTime;
      console.log(
        `Collection completed in ${totalTime}ms: ${successCount} success, ${failureCount} failures, ${totalRates} total rates`
      );

      // Update collection status
      await this.updateCollectionStatus(results);

      return {
        successCount,
        failureCount,
        totalRates,
        results,
        errors,
      };
    } catch (error) {
      console.error('Fatal error in collection orchestrator:', error);
      throw error;
    }
  }

  private async collectWithTimeout(collector: Collector): Promise<CollectorResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const error = new Error(
          `Collector ${collector.name} timed out after ${this.COLLECTOR_TIMEOUT}ms`
        );
        reject(error);
      }, this.COLLECTOR_TIMEOUT);

      collector
        .collect()
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          const err = error instanceof Error ? error : new Error(String(error));
          reject(err);
        });
    });
  }

  private async storeRates(rates: ExchangeRate[]): Promise<void> {
    const batch = db.batch();
    const ratesCollection = db.collection('rates');

    for (const rate of rates) {
      // Create document ID
      const timestamp = rate.timestamp.getTime();
      const docId = `${rate.source}_${rate.currency}_${timestamp}`;

      const rateDoc: RateDocument = {
        id: docId,
        source: rate.source,
        currency: rate.currency,
        rate: rate.rate,
        buyRate: rate.buyRate,
        sellRate: rate.sellRate,
        timestamp: rate.timestamp,
        createdAt: new Date(),
        metadata: {
          sourceUrl: rate.sourceUrl,
          collectorVersion: '1.0.0',
        },
      };

      batch.set(ratesCollection.doc(docId), rateDoc);
    }

    // Also update latest rates collection for quick access
    const latestCollection = db.collection('latestRates');

    for (const rate of rates) {
      const latestDocId = `${rate.source}_${rate.currency}`;
      batch.set(
        latestCollection.doc(latestDocId),
        {
          ...rate,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }

    await batch.commit();
  }

  private async updateCollectionStatus(results: Map<string, CollectorResult>): Promise<void> {
    const batch = db.batch();
    const statusCollection = db.collection('collectionStatus');

    for (const [collectorName, result] of results) {
      const statusDoc = statusCollection.doc(collectorName);

      const currentStatus = await statusDoc.get();
      const currentData = currentStatus.data() || {};

      const update = {
        source: collectorName,
        lastRun: new Date(),
        isActive: true,
      };

      if (result.success) {
        Object.assign(update, {
          lastSuccess: new Date(),
          consecutiveFailures: 0,
          lastError: null,
        });
      } else {
        Object.assign(update, {
          consecutiveFailures: (currentData['consecutiveFailures'] || 0) + 1,
          lastError: result.error || 'Unknown error',
        });
      }

      batch.set(statusDoc, update, { merge: true });
    }

    await batch.commit();
  }

  // Get specific rates by currency
  async getLatestRates(currency?: string): Promise<ExchangeRate[]> {
    const latestCollection = db.collection('latestRates');

    let query = latestCollection.orderBy('timestamp', 'desc');

    if (currency) {
      query = query.where('currency', '==', currency.toUpperCase());
    }

    const snapshot = await query.limit(50).get();

    return snapshot.docs.map((doc) => doc.data() as ExchangeRate);
  }

  // Get historical rates
  async getHistoricalRates(
    currency: string,
    startDate: Date,
    endDate: Date,
    source?: string
  ): Promise<RateDocument[]> {
    let query = db
      .collection('rates')
      .where('currency', '==', currency.toUpperCase())
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .orderBy('timestamp', 'desc');

    if (source) {
      query = query.where('source', '==', source);
    }

    const snapshot = await query.limit(1000).get();

    return snapshot.docs.map((doc) => doc.data() as RateDocument);
  }
}
