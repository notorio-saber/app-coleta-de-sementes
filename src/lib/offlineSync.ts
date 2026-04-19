import { openDB } from 'idb';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, storage } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

const DB_NAME = 'seed-collection-db';
const STORE_MATRICES = 'offline-matrices';
const STORE_HARVESTS = 'offline-harvests';
const STORE_PROCESSINGS = 'offline-processings';
const DB_VERSION = 2; // Incremented for new stores

let dbInstance: any = null;

export const initDB = async () => {
  if (!dbInstance) {
    dbInstance = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_MATRICES)) {
          db.createObjectStore(STORE_MATRICES, { keyPath: 'localId', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORE_HARVESTS)) {
          db.createObjectStore(STORE_HARVESTS, { keyPath: 'localId', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORE_PROCESSINGS)) {
          db.createObjectStore(STORE_PROCESSINGS, { keyPath: 'localId', autoIncrement: true });
        }
      },
      blocking() {
        if (dbInstance) {
          dbInstance.close();
          dbInstance = null;
        }
      }
    });
  }
  return dbInstance;
};

export const saveMatrixOffline = async (data: any) => {
  const db = await initDB();
  const tx = db.transaction(STORE_MATRICES, 'readwrite');
  const store = tx.objectStore(STORE_MATRICES);
  await store.add({ ...data, synced: false, createdAt: new Date().toISOString() });
  await tx.done;
};

export const saveHarvestOffline = async (data: any) => {
  const db = await initDB();
  const tx = db.transaction(STORE_HARVESTS, 'readwrite');
  const store = tx.objectStore(STORE_HARVESTS);
  const id = await store.add({ ...data, synced: false, createdAt: new Date().toISOString() });
  await tx.done;
  return id;
};

export const updateHarvestOffline = async (id: number, data: any) => {
  const db = await initDB();
  const tx = db.transaction(STORE_HARVESTS, 'readwrite');
  const store = tx.objectStore(STORE_HARVESTS);
  const existing = await store.get(id);
  if (existing) {
    await store.put({ ...existing, ...data });
  }
  await tx.done;
};

export const saveProcessingOffline = async (data: any) => {
  const db = await initDB();
  const tx = db.transaction(STORE_PROCESSINGS, 'readwrite');
  const store = tx.objectStore(STORE_PROCESSINGS);
  await store.add({ ...data, synced: false, createdAt: new Date().toISOString() });
  await tx.done;
};

// Fetchers for the Offline Panel
export const getOfflineData = async () => {
  try {
    const db = await initDB();
    const txMat = db.transaction(STORE_MATRICES, 'readonly');
    const matrices = (await txMat.objectStore(STORE_MATRICES).getAll()).filter((r:any) => !r.synced);
    
    const txHarv = db.transaction(STORE_HARVESTS, 'readonly');
    const harvests = (await txHarv.objectStore(STORE_HARVESTS).getAll()).filter((r:any) => !r.synced);
    
    const txProc = db.transaction(STORE_PROCESSINGS, 'readonly');
    const processings = (await txProc.objectStore(STORE_PROCESSINGS).getAll()).filter((r:any) => !r.synced);
    
    return { matrices, harvests, processings };
  } catch (err) {
    console.error('Error getting offline data:', err);
    return { matrices: [], harvests: [], processings: [] };
  }
};

export const deleteOfflineRecord = async (storeName: string, id: number) => {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readwrite');
  await tx.objectStore(storeName).delete(id);
  await tx.done;
};

export const syncOfflineData = async () => {
  if (!navigator.onLine) return; // Only sync if online

  const dbIdb = await initDB();
  
  // 1. Sync Matrices
  const txM = dbIdb.transaction(STORE_MATRICES, 'readonly');
  const unsyncedMatrices = (await txM.objectStore(STORE_MATRICES).getAll()).filter((r:any) => !r.synced);
  for (const record of unsyncedMatrices) {
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

      const delTx = dbIdb.transaction(STORE_MATRICES, 'readwrite');
      await delTx.objectStore(STORE_MATRICES).delete(record.localId);
      await delTx.done;
    } catch (err) {
      console.error('Failed to sync matrix', record.localId, err);
    }
  }

  // 2. Sync Harvests
  const txH = dbIdb.transaction(STORE_HARVESTS, 'readonly');
  const unsyncedHarvests = (await txH.objectStore(STORE_HARVESTS).getAll()).filter((r:any) => !r.synced);
  for (const record of unsyncedHarvests) {
    try {
      const harvestData = { ...record };
      delete harvestData.localId;
      delete harvestData.synced;
      delete harvestData.createdAt;
      delete harvestData._isOffline;
      
      harvestData.timestamp = serverTimestamp();
      
      await addDoc(collection(db, 'harvests'), harvestData);

      const delTx = dbIdb.transaction(STORE_HARVESTS, 'readwrite');
      await delTx.objectStore(STORE_HARVESTS).delete(record.localId);
      await delTx.done;
    } catch (err) {
      console.error('Failed to sync harvest', record.localId, err);
    }
  }

  // 3. Sync Processings
  const txP = dbIdb.transaction(STORE_PROCESSINGS, 'readonly');
  const unsyncedProcessings = (await txP.objectStore(STORE_PROCESSINGS).getAll()).filter((r:any) => !r.synced);
  for (const record of unsyncedProcessings) {
    try {
      const harvestRef = doc(db, 'harvests', record.harvestId);
      
      await updateDoc(harvestRef, {
        benefitedTotalKg: record.benefitedTotalKg,
        benefitedItems: record.benefitedItems,
        processedBy: record.processedBy,
        processedAt: record.processedAt || new Date().toISOString()
      });

      const delTx = dbIdb.transaction(STORE_PROCESSINGS, 'readwrite');
      await delTx.objectStore(STORE_PROCESSINGS).delete(record.localId);
      await delTx.done;
    } catch (err) {
      console.error('Failed to sync processing for harvest', record.harvestId, err);
    }
  }
};

// Listen for connection restoration to trigger sync
window.addEventListener('online', syncOfflineData);
