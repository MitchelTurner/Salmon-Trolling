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

export {
  FEEDBACK_QUESTION,
  CreateRecommendationsBodySchema,
  RecommendationFeedbackBodySchema,
  RuleContextBodySchema,
  type CreateRecommendationsBody,
  type RecommendationFeedbackBody,
  type RuleContextBody,
} from './recommendation.js';

export {
  ROLES,
  RoleSchema,
  canManageBilling,
  permissionsFor,
  roleAllows,
  type Permission,
  type Role,
} from './roles.js';

export {
  GenerateGuestReportBodySchema,
  GuestCatchReportSchema,
  GuestReportCatchSchema,
  type GenerateGuestReportBody,
  type GuestCatchReport,
  type GuestReportCatch,
} from './guest-report.js';

export {
  FishTagCodeSchema,
  FishTagSchema,
  FishTagStatusSchema,
  IssueFishTagBodySchema,
  mintFishTagCode,
  type FishTag,
  type FishTagStatus,
  type FishTagStatusStage,
  type IssueFishTagBody,
} from './fish-tag.js';

export {
  CreateManifestBodySchema,
  ManifestLineSchema,
  ProcessingManifestSchema,
  formatManifestDocument,
  type CreateManifestBody,
  type ManifestLine,
  type ProcessingManifest,
} from './processing.js';

export {
  CreateShippingBodySchema,
  ShippingRecordSchema,
  type CreateShippingBody,
  type ShippingRecord,
} from './shipping.js';
