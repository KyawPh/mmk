import { CollectionOrchestrator } from '../../collectors/CollectionOrchestrator';
import * as functions from 'firebase-functions/v1';
import { requireAuth } from '../../utils/functions';

export const manualCollectRates = async (req: functions.https.Request, res: functions.Response) => {
  try {
    // Check if request is authenticated (admin only)
    const userId = await requireAuth(req, res);
    if (!userId) {
      return;
    }

    // Verify admin
    const adminIds = process.env['ADMIN_IDS']?.split(',') || [];
    if (!adminIds.includes(userId)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const orchestrator = new CollectionOrchestrator();

    // Allow filtering by source
    const source = req.query['source'] as string;

    if (source) {
      // TODO: Implement single source collection
      res.status(501).json({ error: 'Single source collection not yet implemented' });
      return;
    }

    res.status(200).json({ message: 'Collection started' });

    // Run collection asynchronously
    orchestrator
      .collectAll()
      .then((result) => {
        console.log('Manual collection completed:', result);
      })
      .catch((error) => {
        console.error('Manual collection failed:', error);
      });
  } catch (error) {
    console.error('Error in manual rate collection:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
