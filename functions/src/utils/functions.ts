import * as functions from 'firebase-functions/v1';

// Define regions for deployment
export const FUNCTION_REGION = 'asia-southeast1'; // Singapore - closest to Myanmar

// Function naming prefix
export const FUNCTION_PREFIX = 'mmk';

// Runtime options
export const runtimeOpts: functions.RuntimeOptions = {
  timeoutSeconds: 60,
  memory: '256MB',
};

// Create HTTPS function with standard configuration
export const httpsFunction = (
  handler: (req: functions.https.Request, res: functions.Response) => void | Promise<void>
) => functions.region(FUNCTION_REGION).runWith(runtimeOpts).https.onRequest(handler);

// Create scheduled function with standard configuration
export const scheduledFunction = (
  schedule: string,
  handler: (context: functions.EventContext) => void | Promise<void>
) =>
  functions
    .region(FUNCTION_REGION)
    .runWith(runtimeOpts)
    .pubsub.schedule(schedule)
    .timeZone('Asia/Yangon')
    .onRun(handler);

// Create Firestore trigger with standard configuration
export const firestoreFunction = (
  documentPath: string,
  trigger: 'onCreate' | 'onUpdate' | 'onDelete' | 'onWrite'
) => {
  const firestoreFunctions = functions
    .region(FUNCTION_REGION)
    .runWith(runtimeOpts)
    .firestore.document(documentPath);

  switch (trigger) {
    case 'onCreate':
      return (
        handler: (
          snapshot: functions.firestore.QueryDocumentSnapshot,
          context: functions.EventContext
        ) => void | Promise<void>
      ) => firestoreFunctions.onCreate(handler);

    case 'onUpdate':
      return (
        handler: (
          change: functions.Change<functions.firestore.QueryDocumentSnapshot>,
          context: functions.EventContext
        ) => void | Promise<void>
      ) => firestoreFunctions.onUpdate(handler);

    case 'onDelete':
      return (
        handler: (
          snapshot: functions.firestore.QueryDocumentSnapshot,
          context: functions.EventContext
        ) => void | Promise<void>
      ) => firestoreFunctions.onDelete(handler);

    case 'onWrite':
      return (
        handler: (
          change: functions.Change<functions.firestore.DocumentSnapshot>,
          context: functions.EventContext
        ) => void | Promise<void>
      ) => firestoreFunctions.onWrite(handler);
  }
};

// Function name builder
export const functionName = (name: string): string => `${FUNCTION_PREFIX}_${name}`;

// Verify function authentication (for admin endpoints)
export const requireAuth = async (
  req: functions.https.Request,
  res: functions.Response
): Promise<string | null> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // Verify Firebase Auth token
    const admin = await import('firebase-admin');
    const decodedToken = await admin.auth().verifyIdToken(token || '');
    return decodedToken.uid;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
};

// Verify webhook token (for Telegram webhook)
export const verifyWebhookToken = (
  req: functions.https.Request,
  expectedToken: string
): boolean => {
  const token = req.headers['x-telegram-bot-api-secret-token'] as string;
  return token === expectedToken;
};
