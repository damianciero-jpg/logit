// ─── PHOTO STORE ──────────────────────────────────────────────────────────────
// IndexedDB helper for job photos. Photos are compressed client-side and kept
// entirely on-device, consistent with the app's "stored locally only" promise.

const DB_NAME = "logit-photos";
const STORE = "photos";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("logId", "logId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Resize to a max longest-edge dimension and re-encode as JPEG so IndexedDB
// stays lean even after many job photos.
export async function compressImage(file, maxDim = 1280, quality = 0.7) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality)
    );
  } catch {
    // createImageBitmap unsupported or decode failed — store original.
    return file;
  }
}

// ── Compress and persist every file in a FileList under a log id ────────────
export async function addPhotos(logId, fileList) {
  const files = Array.from(fileList ?? []);
  const db = await openDb();
  for (const file of files) {
    const blob = await compressImage(file);
    const id = `${logId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ id, logId, blob, createdAt: Date.now() });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
  db.close();
}

// ── All photos for one log, oldest first, as browser-usable object URLs ─────
export async function getPhotos(logId) {
  const db = await openDb();
  const idx = db.transaction(STORE, "readonly").objectStore(STORE).index("logId");
  const rows = await reqToPromise(idx.getAll(logId));
  db.close();
  return rows
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((r) => ({ id: r.id, url: URL.createObjectURL(r.blob) }));
}

// ── Map of logId -> photo count (for badges on the logs list) ───────────────
export async function getPhotoCounts() {
  const db = await openDb();
  const rows = await reqToPromise(
    db.transaction(STORE, "readonly").objectStore(STORE).getAll()
  );
  db.close();
  return rows.reduce((acc, r) => {
    acc[r.logId] = (acc[r.logId] ?? 0) + 1;
    return acc;
  }, {});
}

// ── Remove all photos belonging to a deleted log ─────────────────────────────
export async function deletePhotosForLog(logId) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const idx = tx.objectStore(STORE).index("logId");
  const keys = await reqToPromise(idx.getAllKeys(logId));
  keys.forEach((k) => tx.objectStore(STORE).delete(k));
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
