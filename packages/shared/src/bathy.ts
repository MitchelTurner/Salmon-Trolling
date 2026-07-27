/**
 * Bathymetry is for structure only — never navigation
 * (docs/04-data-sources.md, docs/30-domain-safety.mdc).
 */
export const NOT_FOR_NAVIGATION_LABEL = 'not for navigation' as const;

export type BathyTileRef = {
  readonly key: string;
  readonly regionId: string;
  readonly z: number;
  readonly x: number;
  readonly y: number;
};
