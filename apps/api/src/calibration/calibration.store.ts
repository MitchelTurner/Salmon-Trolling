import type { CalibrationFitResult } from '@troll/engine';
import { randomUUID } from 'node:crypto';

export type StoredFit = CalibrationFitResult & {
  readonly id: string;
  readonly fittedAt: string;
  readonly supersededAt?: string;
};

export interface CalibrationFitStore {
  save(fit: CalibrationFitResult, fittedAt?: string): Promise<StoredFit>;
  listActive(filter?: {
    boatId?: string;
    rigId?: string;
  }): Promise<StoredFit[]>;
}

export class MemoryCalibrationFitStore implements CalibrationFitStore {
  private readonly fits: StoredFit[] = [];

  async save(
    fit: CalibrationFitResult,
    fittedAt = new Date().toISOString(),
  ): Promise<StoredFit> {
    // Supersede prior active fit of the same scope/keys.
    for (let i = 0; i < this.fits.length; i++) {
      const existing = this.fits[i]!;
      if (existing.supersededAt) continue;
      const sameScope = existing.scope === fit.scope;
      const sameBoat = (existing.boatId ?? null) === (fit.boatId ?? null);
      const sameRig = (existing.rigId ?? null) === (fit.rigId ?? null);
      if (sameScope && sameBoat && sameRig) {
        this.fits[i] = { ...existing, supersededAt: fittedAt };
      }
    }
    const row: StoredFit = {
      ...fit,
      id: `fit_${randomUUID().replace(/-/g, '').slice(0, 22)}`,
      fittedAt,
    };
    this.fits.push(row);
    return row;
  }

  async listActive(filter?: {
    boatId?: string;
    rigId?: string;
  }): Promise<StoredFit[]> {
    return this.fits.filter((f) => {
      if (f.supersededAt) return false;
      if (f.scope === 'GLOBAL') return true;
      if (f.scope === 'BOAT') {
        return filter?.boatId != null && f.boatId === filter.boatId;
      }
      if (f.scope === 'RIG') {
        return filter?.rigId != null && f.rigId === filter.rigId;
      }
      return false;
    });
  }
}
