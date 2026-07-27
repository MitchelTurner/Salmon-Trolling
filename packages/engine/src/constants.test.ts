import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ATTRACTOR_DRAG_TABLE,
  CD_CYL_NORMAL,
  CD_CYL_TANGENT,
  CD_PANCAKE,
  CD_SPHERE,
  CD_TORPEDO,
  CONSTANT_NAMES,
  CONSTANT_PROVENANCE,
  G,
  NU_SEAWATER,
  RHO_LEAD,
  RHO_SEAWATER,
  RHO_STEEL,
  attractorDragN,
  type ConstantName,
  type ProvenanceTag,
} from './constants.js';

const TAGS: readonly ProvenanceTag[] = [
  'MEASURED',
  'MANUFACTURER',
  'ESTIMATED',
];

/** Scalar exports required by docs/02-depth-engine.md. */
const REQUIRED_SCALARS: Record<ConstantName, number> = {
  RHO_SEAWATER,
  NU_SEAWATER,
  RHO_LEAD,
  RHO_STEEL,
  G,
  CD_SPHERE,
  CD_PANCAKE,
  CD_TORPEDO,
  CD_CYL_NORMAL,
  CD_CYL_TANGENT,
};

const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'constants.ts');
const source = readFileSync(sourcePath, 'utf8');

describe('engine constants provenance', () => {
  it('exports every constant required by the depth-engine spec', () => {
    expect(CONSTANT_NAMES.sort()).toEqual(
      [
        'CD_CYL_NORMAL',
        'CD_CYL_TANGENT',
        'CD_PANCAKE',
        'CD_SPHERE',
        'CD_TORPEDO',
        'G',
        'NU_SEAWATER',
        'RHO_LEAD',
        'RHO_SEAWATER',
        'RHO_STEEL',
      ].sort(),
    );

    for (const [name, value] of Object.entries(REQUIRED_SCALARS)) {
      expect(Number.isFinite(value), `${name} must be finite`).toBe(true);
    }
  });

  it('tags every exported scalar constant as MEASURED, MANUFACTURER, or ESTIMATED', () => {
    for (const name of CONSTANT_NAMES) {
      const provenance = CONSTANT_PROVENANCE[name];
      expect(TAGS, `${name} missing provenance tag`).toContain(provenance.tag);
      expect(provenance.source.length).toBeGreaterThan(0);
    }
  });

  it('requires uncertainty and todoCalibrate on every ESTIMATED scalar', () => {
    for (const name of CONSTANT_NAMES) {
      const provenance = CONSTANT_PROVENANCE[name];
      if (provenance.tag !== 'ESTIMATED') continue;

      expect(provenance.uncertainty.length).toBeGreaterThan(0);
      expect(provenance.todoCalibrate).toBe(true);

      const uncertainty = provenance.uncertainty.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );
      // JSDoc sits above the export: ESTIMATED ±N%, TODO(calibrate), then export.
      expect(source).toMatch(
        new RegExp(
          `ESTIMATED[^\\n]*${uncertainty}[\\s\\S]{0,200}?TODO\\(calibrate\\)[\\s\\S]{0,120}?export const ${name}\\b`,
        ),
      );
    }
  });

  it('embeds a provenance tag in the source comment for every scalar constant', () => {
    for (const name of CONSTANT_NAMES) {
      const tag = CONSTANT_PROVENANCE[name].tag;
      // JSDoc immediately above the export must name the tag.
      const exportPattern = new RegExp(
        `\\*\\s+${tag}[\\s\\S]{0,200}?export const ${name}\\b`,
      );
      expect(source, `${name} source comment missing ${tag}`).toMatch(
        exportPattern,
      );
    }
  });

  it('tags every attractor drag table row and requires calibrate TODOs on estimates', () => {
    expect(ATTRACTOR_DRAG_TABLE.length).toBeGreaterThan(0);

    for (const entry of ATTRACTOR_DRAG_TABLE) {
      expect(TAGS).toContain(entry.provenance.tag);
      expect(entry.provenance.source.length).toBeGreaterThan(0);
      expect(entry.dragN).toBeGreaterThan(0);

      if (entry.provenance.tag === 'ESTIMATED') {
        expect(entry.provenance.uncertainty.length).toBeGreaterThan(0);
        expect(entry.provenance.todoCalibrate).toBe(true);
      }
    }
  });

  it('looks up attractor drag by model and size', () => {
    expect(attractorDragN('Hot Spot Flasher', '11 in')).toBe(10);
    expect(attractorDragN('missing', '11 in')).toBeUndefined();
  });
});
