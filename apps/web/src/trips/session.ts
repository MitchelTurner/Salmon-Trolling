import { getLocalDb } from '../db/database.js';
import { ulid } from '../db/ulid.js';
import { writeLocal } from '../db/write.js';
import { useLiveBoatStore } from '../boat/live-boat-store.js';
import {
  createBrowserClock,
  createBrowserGeoSource,
  createBrowserVisibility,
} from './geo.js';
import { TripRecorder } from './trip-recorder.js';

const PERSONAL_ORG_KEY = 'troll:personalOrgId';

let activeRecorder: TripRecorder | null = null;

/** Ensure a personal org exists for solo offline logging (no account required). */
export async function ensurePersonalOrg(): Promise<string> {
  const existing =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(PERSONAL_ORG_KEY)
      : null;
  if (existing) {
    const row = await getLocalDb().orgs.get(existing);
    if (row) return existing;
  }

  const id = ulid();
  const createdAt = new Date().toISOString();
  await writeLocal(
    'orgs',
    { id, name: 'Personal', kind: 'PERSONAL', createdAt },
    { orgId: id, opType: 'create' },
  );
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PERSONAL_ORG_KEY, id);
  }
  return id;
}

export function getActiveRecorder(): TripRecorder | null {
  return activeRecorder;
}

export async function startTripRecording(boatId?: string): Promise<TripRecorder> {
  if (activeRecorder?.getTrip() && !activeRecorder.getTrip()?.closedAt) {
    return activeRecorder;
  }

  const orgId = await ensurePersonalOrg();
  const store = useLiveBoatStore.getState();

  const recorder = new TripRecorder({
    orgId,
    boatId,
    geo: createBrowserGeoSource(),
    clock: createBrowserClock(),
    visibility: createBrowserVisibility(),
    onLiveSample: (sample) => store.setLiveSample(sample),
    onStatus: (status, detail) => store.setRecorderStatus(status, detail),
  });

  const trip = await recorder.start();
  store.setTrip(trip);
  activeRecorder = recorder;
  return recorder;
}

export async function closeTripRecording() {
  if (!activeRecorder) {
    throw new Error('no active trip');
  }
  const result = await activeRecorder.close();
  useLiveBoatStore.getState().setTrip(result.trip);
  useLiveBoatStore.getState().setLiveSample(null);
  activeRecorder.dispose();
  activeRecorder = null;
  return result;
}
