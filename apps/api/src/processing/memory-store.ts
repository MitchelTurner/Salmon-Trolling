import type { ProcessingManifest } from '@troll/shared';
import type { ManifestStore } from './types.js';

export class MemoryManifestStore implements ManifestStore {
  private readonly byId = new Map<string, ProcessingManifest>();

  async put(manifest: ProcessingManifest): Promise<void> {
    this.byId.set(manifest.id, manifest);
  }

  async list(orgId: string): Promise<ProcessingManifest[]> {
    return [...this.byId.values()]
      .filter((m) => m.orgId === orgId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(orgId: string, id: string): Promise<ProcessingManifest | null> {
    const m = this.byId.get(id);
    if (!m || m.orgId !== orgId) return null;
    return m;
  }
}
