import Dexie, { type EntityTable, type Table } from 'dexie';
import type {
  BoatRecord,
  BundleRecord,
  CalibrationFitRecord,
  CatchRecord,
  GearItemRecord,
  HarvestRecordRow,
  MembershipRecord,
  OrgRecord,
  ProbeRecord,
  ProbeSampleRecord,
  RegulationRecord,
  RigRecord,
  SpotRecord,
  SyncQueueRecord,
  TrackPointRecord,
  TripRecord,
  UserRecord,
} from './types.js';

export const DB_NAME = 'troll';
export const DB_VERSION = 1;

/**
 * Local-first store. UI reads only from here; network never feeds screens
 * directly (docs/05-offline-sync.md, 20-web.mdc).
 */
export class TrollDatabase extends Dexie {
  orgs!: EntityTable<OrgRecord, 'id'>;
  users!: EntityTable<UserRecord, 'id'>;
  memberships!: EntityTable<MembershipRecord, 'id'>;
  boats!: EntityTable<BoatRecord, 'id'>;
  rigs!: EntityTable<RigRecord, 'id'>;
  gearItems!: EntityTable<GearItemRecord, 'id'>;
  trips!: EntityTable<TripRecord, 'id'>;
  trackPoints!: EntityTable<TrackPointRecord, 'id'>;
  catches!: EntityTable<CatchRecord, 'id'>;
  spots!: EntityTable<SpotRecord, 'id'>;
  probes!: EntityTable<ProbeRecord, 'id'>;
  probeSamples!: EntityTable<ProbeSampleRecord, 'id'>;
  calibrationFits!: EntityTable<CalibrationFitRecord, 'id'>;
  regulations!: EntityTable<RegulationRecord, 'id'>;
  harvestRecords!: EntityTable<HarvestRecordRow, 'id'>;
  bundles!: EntityTable<BundleRecord, 'id'>;
  syncQueue!: EntityTable<SyncQueueRecord, 'id'>;

  constructor(name = DB_NAME) {
    super(name);

    this.version(DB_VERSION).stores({
      orgs: 'id, kind, createdAt',
      users: 'id, email, createdAt',
      memberships: 'id, orgId, userId, [orgId+userId]',
      boats: 'id, orgId, updatedAt',
      rigs: 'id, orgId, delivery, updatedAt, archivedAt',
      gearItems: 'id, orgId, kind, updatedAt',
      trips: 'id, orgId, boatId, startedAt, closedAt',
      trackPoints: 'id, tripId, t, [tripId+t]',
      catches: 'id, tripId, t, species, supersedesId, createdAt, [tripId+t]',
      spots: 'id, orgId, updatedAt, isPrivate',
      probes: 'id, boatId, serial',
      probeSamples: 'id, probeId, tripId, t, [probeId+t], [tripId+t]',
      calibrationFits: 'id, scope, boatId, rigId, fittedAt, supersededAt',
      regulations: 'id, regionId, kind, fetchedAt, supersededAt, [regionId+kind]',
      harvestRecords: 'id, userId, catchId, t, confirmedAt, [userId+t]',
      bundles: 'id, regionId, startIso, expiresAt, generatedAt',
      syncQueue: 'id, orgId, entity, clientTime, attempts',
    });
  }
}

let singleton: TrollDatabase | undefined;

/** App-wide DB instance. Tests should call {@link resetLocalDb} between cases. */
export function getLocalDb(): TrollDatabase {
  if (!singleton) {
    singleton = new TrollDatabase();
  }
  return singleton;
}

/** Replace the singleton (tests / factory injection). */
export function setLocalDb(db: TrollDatabase): void {
  singleton = db;
}

export async function resetLocalDb(): Promise<void> {
  const name = singleton?.name ?? DB_NAME;
  if (singleton) {
    singleton.close();
    await Dexie.delete(name);
  }
  singleton = new TrollDatabase(name);
  await singleton.open();
}

export type DomainTable = Table<
  | OrgRecord
  | UserRecord
  | MembershipRecord
  | BoatRecord
  | RigRecord
  | GearItemRecord
  | TripRecord
  | TrackPointRecord
  | CatchRecord
  | SpotRecord
  | ProbeRecord
  | ProbeSampleRecord
  | CalibrationFitRecord
  | RegulationRecord
  | HarvestRecordRow
  | BundleRecord
  | SyncQueueRecord,
  string
>;
