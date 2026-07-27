import { Inject, Injectable } from '@nestjs/common';
import {
  formatManifestDocument,
  type CreateManifestBody,
  type ManifestLine,
  type ProcessingManifest,
} from '@troll/shared';
import { randomUUID } from 'node:crypto';
import { FishTagsService } from '../fish-tags/fish-tags.service.js';
import { MANIFEST_STORE, type ManifestStore } from './types.js';

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 22)}`;
}

@Injectable()
export class ProcessingService {
  constructor(
    @Inject(MANIFEST_STORE) private readonly manifests: ManifestStore,
    private readonly tags: FishTagsService,
  ) {}

  list(orgId: string): Promise<ProcessingManifest[]> {
    return this.manifests.list(orgId);
  }

  async create(
    orgId: string,
    body: CreateManifestBody,
  ): Promise<ProcessingManifest> {
    const lines: ManifestLine[] = [];
    for (const code of body.tagCodes) {
      const tag = await this.tags.getByCode(code);
      if (!tag || tag.orgId !== orgId) {
        throw new Error(`tag not found: ${code}`);
      }
      lines.push({
        tagCode: tag.code,
        guestName: tag.guestName,
        species: tag.species,
        massKg: tag.massKg,
        count: 1,
      });
    }

    const createdAt = new Date().toISOString();
    const documentText = formatManifestDocument({
      processor: body.processor.trim(),
      boatName: body.boatName.trim(),
      deliveredAt: body.deliveredAt,
      createdAt,
      lines,
    });

    const manifest: ProcessingManifest = {
      id: newId('pm'),
      orgId,
      processor: body.processor.trim(),
      boatName: body.boatName.trim(),
      deliveredAt: body.deliveredAt,
      createdAt,
      lines,
      documentText,
    };

    await this.manifests.put(manifest);

    for (const line of lines) {
      await this.tags.markAtProcessor(line.tagCode, manifest.processor);
    }

    return manifest;
  }
}
