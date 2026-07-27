/** NestJS API. Public calc + authenticated sync. */

export { AppModule } from './app.module.js';
export {
  CalcModule,
  CalcService,
  computeDepth,
  computeSpread,
  CalcDepthBodySchema,
  CalcSpreadBodySchema,
} from './calc/index.js';
export {
  SyncModule,
  SyncService,
  SYNC_STORE,
  MemorySyncStore,
} from './sync/index.js';
export { mintDevBearerToken, type OrgContext } from './auth/org-context.js';

export const PACKAGE_NAME = '@troll/api' as const;
