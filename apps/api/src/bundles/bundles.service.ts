import { Inject, Injectable } from '@nestjs/common';
import {
  alignBundleWindowStart,
  BUNDLE_DEFAULT_WINDOW_HOURS,
  type ConditionsBundle,
  type RegionId,
} from '@troll/shared';
import { BUNDLE_CACHE, type BundleCache } from './cache.js';
import {
  BundleGenerator,
  resolveBundleSigningSecret,
} from './generate.js';
import {
  FixtureBundleDataSource,
  type BundleDataSource,
} from './sources.js';

export const BUNDLE_DATA_SOURCE = Symbol('BUNDLE_DATA_SOURCE');
export const BUNDLE_GENERATOR = Symbol('BUNDLE_GENERATOR');

@Injectable()
export class BundlesService {
  private readonly generator: BundleGenerator;

  constructor(
    @Inject(BUNDLE_CACHE) cache: BundleCache,
    @Inject(BUNDLE_DATA_SOURCE) source: BundleDataSource,
  ) {
    this.generator = new BundleGenerator(
      source,
      cache,
      resolveBundleSigningSecret(),
    );
  }

  async getBundle(input: {
    regionId: RegionId;
    windowHours?: number;
    startIso?: string;
  }): Promise<ConditionsBundle> {
    const windowHours = input.windowHours ?? BUNDLE_DEFAULT_WINDOW_HOURS;
    const startIso =
      input.startIso ?? alignBundleWindowStart(new Date());
    const { bundle } = await this.generator.generate({
      regionId: input.regionId,
      startIso,
      windowHours,
    });
    return bundle;
  }
}

export function createDefaultBundleDataSource(): BundleDataSource {
  return new FixtureBundleDataSource();
}
