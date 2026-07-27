import type { ProcessingManifest } from '@troll/shared';

export const MANIFEST_STORE = Symbol('MANIFEST_STORE');

export interface ManifestStore {
  put(manifest: ProcessingManifest): Promise<void>;
  list(orgId: string): Promise<ProcessingManifest[]>;
  get(orgId: string, id: string): Promise<ProcessingManifest | null>;
}
