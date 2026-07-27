/** Shared Zod schemas and DTO types. */

export const PACKAGE_NAME = '@troll/shared' as const;

export {
  SYNC_BATCH_MAX,
  SyncOpTypeSchema,
  SyncOpSchema,
  SyncRequestSchema,
  SyncOpResultStatusSchema,
  SyncOpResultSchema,
  ServerSyncOpSchema,
  SyncResponseSchema,
  dequeueableOpIds,
  type SyncOpType,
  type SyncOp,
  type SyncRequest,
  type SyncOpResult,
  type ServerSyncOp,
  type SyncResponse,
} from './sync.js';

export {
  REGION_IDS,
  REGIONS,
  DEFAULT_REGION_ID,
  getRegion,
  type RegionId,
  type Region,
  type RegionStations,
  type RegionPoint,
} from './regions.js';

export {
  NOT_FOR_NAVIGATION_LABEL,
  type BathyTileRef,
} from './bathy.js';

export {
  BUNDLE_SCHEMA_VERSION,
  BUNDLE_DEFAULT_WINDOW_HOURS,
  BundleMetaSchema,
  alignBundleWindowStart,
  bundleExpiresAt,
  bundleCacheKey,
  bundleObjectName,
  type BundleMeta,
  type BundlePayloadBody,
  type ConditionsBundle,
} from './bundle.js';
