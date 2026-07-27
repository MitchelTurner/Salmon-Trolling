/** Local IndexedDB record shapes. SI units; geometry as GeoJSON-like values. */

export type OrgKind = 'PERSONAL' | 'CHARTER' | 'LODGE' | 'DERBY';
export type Role = 'OWNER' | 'CAPTAIN' | 'CREW' | 'VIEWER';
export type Delivery =
  | 'DOWNRIGGER'
  | 'DIVER'
  | 'LEADCORE'
  | 'WIRE'
  | 'WEIGHTED'
  | 'FLATLINE';
export type GearKind =
  | 'FLASHER'
  | 'DODGER'
  | 'LURE'
  | 'BAIT'
  | 'WEIGHT'
  | 'DIVER'
  | 'BALL';
export type FitScope = 'GLOBAL' | 'BOAT' | 'RIG';
export type SyncOpType = 'create' | 'update' | 'supersede';

export type GeoPoint = {
  readonly type: 'Point';
  readonly coordinates: readonly [lon: number, lat: number];
};

export type GeoLineString = {
  readonly type: 'LineString';
  readonly coordinates: ReadonlyArray<readonly [lon: number, lat: number]>;
};

export type GeoGeometry = GeoPoint | GeoLineString;

export type OrgRecord = {
  id: string;
  name: string;
  kind: OrgKind;
  createdAt: string; // ISO
};

export type UserRecord = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
};

export type MembershipRecord = {
  id: string;
  orgId: string;
  userId: string;
  role: Role;
};

export type BoatRecord = {
  id: string;
  orgId: string;
  name: string;
  hasPaddleWheel: boolean;
  hasN2K: boolean;
  hasProbe: boolean;
  updatedAt: string;
};

export type RigRecord = {
  id: string;
  orgId: string;
  name: string;
  delivery: Delivery;
  deliveryConfig: Record<string, unknown>;
  mainlineType: string;
  mainlineDiaM: number;
  attractorId?: string;
  lureId?: string;
  leaderLengthM: number;
  stackPosition: number;
  updatedAt: string;
  archivedAt?: string;
};

export type GearItemRecord = {
  id: string;
  orgId?: string;
  kind: GearKind;
  brand?: string;
  model: string;
  sizeLabel?: string;
  color?: string;
  finish?: string;
  dragN?: number;
  dragSource?: 'MEASURED' | 'MANUFACTURER' | 'ESTIMATED';
  updatedAt: string;
};

export type TripRecord = {
  id: string;
  orgId: string;
  boatId?: string;
  startedAt: string;
  closedAt?: string;
  conditions?: Record<string, unknown>;
  notes?: string;
};

export type TrackPointRecord = {
  id: string;
  tripId: string;
  t: string;
  geom: GeoPoint;
  sogMs?: number;
  cogRad?: number;
  headingRad?: number;
  /** Measured only — never store an estimate here. */
  stwMs?: number;
  soundingM?: number;
  seaTempC?: number;
};

export type CatchRecord = {
  id: string;
  tripId: string;
  userId?: string;
  t: string;
  geom: GeoPoint;
  species: string;
  lengthM?: number;
  massKg?: number;
  kept: boolean;
  /** Full rig config at the catch moment — not a foreign key. */
  rigSnapshot: Record<string, unknown>;
  /** DepthResult (and assumptions) at the catch moment. */
  depthSnapshot: Record<string, unknown>;
  photoKeys: string[];
  /** Append-only correction: points at the catch this event replaces. */
  supersedesId?: string;
  createdAt: string;
};

/** Local photo bytes. Sync carries `photoKeys` on the Catch; upload comes later. */
export type PhotoRecord = {
  id: string;
  tripId: string;
  catchId?: string;
  mimeType: string;
  byteLength: number;
  createdAt: string;
  /** Raw image bytes — Uint8Array survives IndexedDB better than Blob. */
  bytes: Uint8Array;
};

export type SpotRecord = {
  id: string;
  orgId: string;
  name: string;
  geom: GeoGeometry;
  isPrivate: boolean;
  notes?: string;
  updatedAt: string;
};

export type ProbeRecord = {
  id: string;
  boatId?: string;
  serial: string;
  firmware?: string;
  consentAt?: string;
  lastSeenAt?: string;
};

export type ProbeSampleRecord = {
  id: string;
  probeId: string;
  tripId?: string;
  t: string;
  depthM: number;
  tempC?: number;
  speedMs?: number;
  rigSnapshot?: Record<string, unknown>;
  clockOffsetMs: number;
};

export type CalibrationFitRecord = {
  id: string;
  scope: FitScope;
  boatId?: string;
  rigId?: string;
  params: Record<string, unknown>;
  rmseM: number;
  sampleN: number;
  fittedAt: string;
  supersededAt?: string;
};

export type RegulationRecord = {
  id: string;
  regionId: string;
  kind: string;
  species?: string;
  body: Record<string, unknown>;
  sourceUrl: string;
  fetchedAt: string;
  effectiveAt?: string;
  supersededAt?: string;
  parseOk: boolean;
};

export type HarvestRecordRow = {
  id: string;
  userId: string;
  catchId?: string;
  species: string;
  t: string;
  areaCode?: string;
  /** Always set by angler confirmation — never auto-submitted. */
  confirmedAt: string;
};

/** Prefetched offline conditions package for a region + window. */
export type BundleRecord = {
  id: string;
  regionId: string;
  startIso: string;
  expiresAt: string;
  generatedAt: string;
  schemaVersion: number;
  signature: string;
  /** Decompressed bundle payload kept for offline reads. */
  payload: Record<string, unknown>;
};

/**
 * Outbound sync op. Enqueued on every local write; dequeued only after
 * the server accepts the op id (docs/05-offline-sync.md).
 */
export type SyncQueueRecord = {
  id: string;
  orgId: string;
  entity: string;
  opType: SyncOpType;
  payload: Record<string, unknown>;
  clientTime: string;
  /** Attempts so far; never drops the op — sync resumes mid-batch. */
  attempts: number;
};

/** Local recommendation issued for on-deck feedback. */
export type RecommendationRecord = {
  id: string;
  orgId: string;
  context: Record<string, unknown>;
  payload: Record<string, unknown>;
  rulesetVersion?: number;
  createdAt: string;
};

/** Thumbs-down only — answer to "what did you run instead?" */
export type RecommendationFeedbackRecord = {
  id: string;
  orgId: string;
  recommendationId: string;
  thumbs: 'down';
  ranInstead: string;
  createdAt: string;
};

export type DomainTableName =
  | 'orgs'
  | 'users'
  | 'memberships'
  | 'boats'
  | 'rigs'
  | 'gearItems'
  | 'trips'
  | 'trackPoints'
  | 'catches'
  | 'photos'
  | 'spots'
  | 'probes'
  | 'probeSamples'
  | 'calibrationFits'
  | 'regulations'
  | 'harvestRecords'
  | 'bundles'
  | 'recommendations'
  | 'recommendationFeedback'
  | 'syncQueue';
