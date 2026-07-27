import { createHash } from 'node:crypto';

/** Stable content hash for change detection. */
export function contentHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hashListItems(
  items: ReadonlyArray<{
    nrId: string;
    releaseDate: string;
    summary: string;
    action: string;
    area: string;
  }>,
): string {
  const canonical = items
    .map(
      (i) =>
        `${i.nrId}|${i.releaseDate}|${i.area}|${i.summary}|${i.action}`,
    )
    .sort()
    .join('\n');
  return contentHash(canonical);
}
