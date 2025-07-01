import { CollectionOrchestrator } from '../../collectors/CollectionOrchestrator';
import * as functions from 'firebase-functions/v1';

export const collectRatesHandler = async (context: functions.EventContext) => {
  console.log('Starting scheduled rate collection...', {
    eventId: context.eventId,
    timestamp: context.timestamp,
  });

  const orchestrator = new CollectionOrchestrator();

  try {
    const result = await orchestrator.collectAll();

    console.log('Rate collection completed:', {
      successCount: result.successCount,
      failureCount: result.failureCount,
      totalRates: result.totalRates,
    });

    // Log any errors for monitoring
    if (result.errors.size > 0) {
      console.error('Collection errors:', Object.fromEntries(result.errors));
    }

    // You could send notifications here if there are failures
    if (result.failureCount > result.successCount) {
      console.error('More failures than successes in rate collection!');
      // TODO: Send alert to admin
    }

    // Return void for scheduled functions
    return;
  } catch (error) {
    console.error('Fatal error in rate collection:', error);
    throw error;
  }
};
