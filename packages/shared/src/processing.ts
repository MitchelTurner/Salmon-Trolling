/**
 * Processing manifests — boat → processor handoff (08-charter-derby.md).
 */

import { z } from 'zod';
import { FishTagCodeSchema } from './fish-tag.js';

export const ManifestLineSchema = z.object({
  tagCode: FishTagCodeSchema,
  guestName: z.string().optional(),
  species: z.string().min(1),
  massKg: z.number().positive().optional(),
  count: z.number().int().positive().default(1),
});

export type ManifestLine = z.infer<typeof ManifestLineSchema>;

export const CreateManifestBodySchema = z.object({
  processor: z.string().trim().min(1).max(200),
  boatName: z.string().trim().min(1).max(120),
  deliveredAt: z.string().datetime().optional(),
  tagCodes: z.array(FishTagCodeSchema).min(1),
});

export type CreateManifestBody = z.infer<typeof CreateManifestBodySchema>;

export const ProcessingManifestSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  processor: z.string().min(1),
  boatName: z.string().min(1),
  deliveredAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  lines: z.array(ManifestLineSchema).min(1),
  /** Plain-text form a processor can print / accept. */
  documentText: z.string().min(1),
});

export type ProcessingManifest = z.infer<typeof ProcessingManifestSchema>;

export function formatManifestDocument(input: {
  processor: string;
  boatName: string;
  deliveredAt?: string;
  createdAt: string;
  lines: readonly ManifestLine[];
}): string {
  const date = input.deliveredAt ?? input.createdAt;
  const header = [
    'FISH PROCESSING MANIFEST',
    `Processor: ${input.processor}`,
    `Boat: ${input.boatName}`,
    `Date: ${date}`,
    '',
    'Tag          Species     Guest              Count  Weight(kg)',
    '------------ ----------- ------------------ ------ ----------',
  ];
  const rows = input.lines.map((line) => {
    const tag = line.tagCode.padEnd(12);
    const species = line.species.padEnd(11).slice(0, 11);
    const guest = (line.guestName ?? '—').padEnd(18).slice(0, 18);
    const count = String(line.count).padStart(5);
    const mass =
      line.massKg != null ? line.massKg.toFixed(1).padStart(10) : '         —';
    return `${tag} ${species} ${guest} ${count} ${mass}`;
  });
  const totalCount = input.lines.reduce((s, l) => s + l.count, 0);
  const totalMass = input.lines.reduce(
    (s, l) => s + (l.massKg ?? 0) * l.count,
    0,
  );
  return [
    ...header,
    ...rows,
    '',
    `Totals: ${totalCount} fish` +
      (totalMass > 0 ? `, ${totalMass.toFixed(1)} kg` : ''),
    '',
    'Received by (processor): _______________________  Date: ________',
    'Delivered by (boat):     _______________________  Date: ________',
  ].join('\n');
}
