import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export initialized services
export const db = admin.firestore();
export const getFirestore = () => db;
export const auth = admin.auth();
export const storage = admin.storage();

// Firestore converter for type safety
export function createConverter<
  T extends admin.firestore.DocumentData,
>(): admin.firestore.FirestoreDataConverter<T> {
  return {
    toFirestore: (data: T) => data,
    fromFirestore: (snapshot: admin.firestore.QueryDocumentSnapshot) => snapshot.data() as T,
  };
}

// Common Firestore operations
export const FirestoreOps = {
  // Batch write helper
  async batchWrite(
    collection: string,
    documents: Array<{ id: string; data: admin.firestore.DocumentData }>
  ): Promise<void> {
    const batch = db.batch();

    documents.forEach(({ id, data }) => {
      const ref = db.collection(collection).doc(id);
      batch.set(ref, data);
    });

    await batch.commit();
  },

  // Batch update helper
  async batchUpdate<T>(
    collection: string,
    updates: Array<{ id: string; data: Partial<T> }>
  ): Promise<void> {
    const batch = db.batch();

    updates.forEach(({ id, data }) => {
      const ref = db.collection(collection).doc(id);
      batch.update(ref, data);
    });

    await batch.commit();
  },

  // Batch delete helper
  async batchDelete(collection: string, ids: string[]): Promise<void> {
    const batch = db.batch();

    ids.forEach((id) => {
      const ref = db.collection(collection).doc(id);
      batch.delete(ref);
    });

    await batch.commit();
  },

  // Query with pagination
  async queryWithPagination<T>(
    collection: string,
    pageSize: number,
    startAfter?: admin.firestore.DocumentSnapshot
  ): Promise<{
    data: T[];
    lastDoc?: admin.firestore.DocumentSnapshot;
    hasMore: boolean;
  }> {
    let query = db
      .collection(collection)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize + 1);

    if (startAfter) {
      query = query.startAfter(startAfter);
    }

    const snapshot = await query.get();
    const data = snapshot.docs.slice(0, pageSize).map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as T
    );

    return {
      data,
      lastDoc: snapshot.docs[pageSize - 1],
      hasMore: snapshot.docs.length > pageSize,
    };
  },
};

// Timestamp helpers
export const Timestamp = admin.firestore.Timestamp;
export const FieldValue = admin.firestore.FieldValue;
export const FieldPath = admin.firestore.FieldPath;

// Export types
export type DocumentData = admin.firestore.DocumentData;
export type QuerySnapshot = admin.firestore.QuerySnapshot;
export type DocumentSnapshot = admin.firestore.DocumentSnapshot;
export type WriteBatch = admin.firestore.WriteBatch;
export type Transaction = admin.firestore.Transaction;
