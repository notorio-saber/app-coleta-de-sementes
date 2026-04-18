import { openDB } from 'idb';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

const DB_NAME = 'seed-collection-db';
const STORE_NAME = 'offline-matrices';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'localId', autoIncrement: true });
      }
    },
  });
};

export const saveMatrixOffline = async (data: any) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.add({ ...data, synced: false, createdAt: new Date().toISOString() });
  await tx.done;
};

export const syncOfflineData = async () => {
  if (!navigator.onLine) return; // Only sync if online

  const dbIdb = await initDB();
  const tx = dbIdb.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const allRecords = await store.getAll();
  await tx.done;

  const unsynced = allRecords.filter(r => !r.synced);

  for (const record of unsynced) {
    try {
      let photoUrls: string[] = [];
      if (record.photoBase64s && record.photoBase64s.length > 0) {
        // Upload each photo to storage
        for (let i = 0; i < record.photoBase64s.length; i++) {
          const base64 = record.photoBase64s[i];
          const filename = `matrices/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const storageRef = ref(storage, filename);
          const snapshot = await uploadString(storageRef, base64, 'data_url');
          const url = await getDownloadURL(snapshot.ref);
          photoUrls.push(url);
        }
      }

      // Add to Firestore
      const matrixData = {
        scientificName: record.scientificName,
        commonName: record.commonName,
        fruitingStage: record.fruitingStage,
        lat: record.lat,
        lng: record.lng,
        notes: record.notes,
        photos: photoUrls,
        createdAt: serverTimestamp(),
        revisitDate: record.revisitDate,
        teamId: record.teamId,
        creatorId: record.creatorId || null,
        creatorEmail: record.creatorEmail || null
      };

      await addDoc(collection(db, 'matrices'), matrixData);

      // Mark as synced or delete from IDB
      const delTx = dbIdb.transaction(STORE_NAME, 'readwrite');
      await delTx.objectStore(STORE_NAME).delete(record.localId);
      await delTx.done;
    } catch (err) {
      console.error('Failed to sync record', record.localId, err);
    }
  }
};

// Listen for connection restoration to trigger sync
window.addEventListener('online', syncOfflineData);
