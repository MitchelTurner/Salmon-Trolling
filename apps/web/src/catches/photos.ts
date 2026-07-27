import { getLocalDb, type TrollDatabase } from '../db/database.js';
import type { PhotoRecord } from '../db/types.js';
import { ulid } from '../db/ulid.js';

export type PhotoBytes = Blob | ArrayBuffer | Uint8Array;

export type StorePhotoInput = {
  tripId: string;
  data: PhotoBytes;
  mimeType?: string;
  catchId?: string;
  createdAt?: string;
  db?: TrollDatabase;
};

async function toBytes(data: PhotoBytes): Promise<{
  bytes: Uint8Array;
  mimeType?: string;
}> {
  if (data instanceof Uint8Array) {
    return { bytes: data };
  }
  if (data instanceof ArrayBuffer) {
    return { bytes: new Uint8Array(data) };
  }
  // Blob / File — prefer arrayBuffer; fall back for incomplete polyfills (jsdom).
  const blob = data as Blob;
  if (typeof blob.arrayBuffer === 'function') {
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      mimeType: blob.type || undefined,
    };
  }
  if (typeof Response !== 'undefined') {
    const buf = await new Response(blob).arrayBuffer();
    return {
      bytes: new Uint8Array(buf),
      mimeType: blob.type || undefined,
    };
  }
  throw new Error('cannot read photo bytes from blob');
}

/** Rebuild a Blob from a stored photo for previews / upload. */
export function photoToBlob(photo: PhotoRecord): Blob {
  const copy = new Uint8Array(photo.bytes.byteLength);
  copy.set(photo.bytes);
  return new Blob([copy], { type: photo.mimeType });
}

/**
 * Persist a photo locally. Not enqueued to syncQueue (bytes are too large);
 * the Catch record carries `photoKeys` and upload happens in the sync phase.
 */
export async function storePhoto(input: StorePhotoInput): Promise<PhotoRecord> {
  const db = input.db ?? getLocalDb();
  const { bytes, mimeType } = await toBytes(input.data);
  const record: PhotoRecord = {
    id: ulid(),
    tripId: input.tripId,
    catchId: input.catchId,
    mimeType: input.mimeType ?? mimeType ?? 'image/jpeg',
    byteLength: bytes.byteLength,
    createdAt: input.createdAt ?? new Date().toISOString(),
    bytes,
  };
  await db.photos.put(record);
  return record;
}

export async function attachPhotosToCatch(
  photoIds: readonly string[],
  catchId: string,
  db: TrollDatabase = getLocalDb(),
): Promise<void> {
  await db.transaction('rw', db.photos, async () => {
    for (const id of photoIds) {
      const row = await db.photos.get(id);
      if (row) await db.photos.put({ ...row, catchId });
    }
  });
}

export async function listPhotosForCatch(
  catchId: string,
  db: TrollDatabase = getLocalDb(),
): Promise<PhotoRecord[]> {
  return db.photos.where('catchId').equals(catchId).sortBy('createdAt');
}

/** Read a File/Blob from an `<input capture>` or camera picker. */
export async function blobFromFileList(
  files: FileList | null,
): Promise<Blob | null> {
  const file = files?.[0];
  return file ?? null;
}
