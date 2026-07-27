import { hashListItems } from './hash.js';
import { ADFG_TTL } from './ttl.js';
import type { AdfgDetail, AdfgListItem, AdfgListSnapshot } from './types.js';

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/**
 * Parse the Southeast EONR list table.
 * Fail-closed: throws if the table structure is unrecognizable.
 */
export function parseEonrListHtml(
  html: string,
  meta: { sourceUrl: string; fetchedAt: string },
): AdfgListSnapshot {
  const table = html.match(/<table[^>]*class="basic"[^>]*>[\s\S]*?<\/table>/i);
  if (!table) {
    throw new Error('ADF&G EONR: list table not found');
  }

  const rows = [...table[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => m[0]);
  const items: AdfgListItem[] = [];

  for (const row of rows) {
    if (/<th[\s>]/i.test(row)) continue;
    const link = row.match(
      /href="([^"]*ADFG=region\.NR[^"]*NRID=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!link) continue;

    const detailPath = decodeEntities(link[1]!);
    const nrId = link[2]!;
    const cells = [...row.matchAll(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi)].map(
      (m) => m[1]!,
    );
    if (cells.length < 4) continue;

    const dateCellText = stripTags(cells[0]!);
    const releaseDate =
      dateCellText.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)?.[0] ?? dateCellText;
    const expiresDate = dateCellText.match(/Expires\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i)?.[1];
    const area = stripTags(cells[1]!);
    const summary = stripTags(cells[2]!);
    const action = stripTags(cells[3]!);

    if (!summary) continue;

    items.push({
      nrId,
      releaseDate,
      expiresDate,
      area,
      summary,
      action,
      detailPath,
    });
  }

  if (items.length === 0) {
    throw new Error('ADF&G EONR: no list rows parsed');
  }

  return {
    sourceUrl: meta.sourceUrl,
    fetchedAt: meta.fetchedAt,
    items,
    contentHash: hashListItems(items),
    cacheTtlMs: ADFG_TTL.regulationsMs,
  };
}

/**
 * Parse a detail advisory page.
 * On structural failure returns parseOk=false with errors — never invents fields.
 */
export function parseEonrDetailHtml(
  html: string,
  meta: { nrId: string; sourceUrl: string },
): AdfgDetail {
  const parseErrors: string[] = [];
  const bodyText = stripTags(html);
  if (bodyText.length < 40) {
    parseErrors.push('detail body too short');
  }

  const eoNumber =
    html.match(/EO#\s*:?\s*([0-9A-Z-]+)/i)?.[1] ??
    bodyText.match(/EO#\s*:?\s*([0-9A-Z-]+)/i)?.[1];
  if (!eoNumber) parseErrors.push('eoNumber not found');

  const releasedRaw =
    html.match(/Released:\s*<strong>([^<]+)<\/strong>/i)?.[1] ??
    bodyText.match(/Released:\s*([A-Za-z]+ \d{1,2}, \d{4})/i)?.[1];
  const expiresRaw =
    html.match(/Expires:\s*<b>([^<]+)<\/b>/i)?.[1] ??
    bodyText.match(/Expires:\s*([A-Za-z]+ \d{1,2}, \d{4})/i)?.[1];

  const title =
    stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '') ||
    bodyText.match(/Advisory Announcement[^\n]*/i)?.[0];

  const releasedAt = releasedRaw ? tryParseUsDate(releasedRaw) : undefined;
  const expiresAt = expiresRaw ? tryParseUsDate(expiresRaw) : undefined;
  if (releasedRaw && !releasedAt) parseErrors.push('releasedAt unparseable');
  if (expiresRaw && !expiresAt) parseErrors.push('expiresAt unparseable');

  // Fail-closed: missing EO number or empty body means parseOk=false.
  const parseOk = parseErrors.length === 0 && Boolean(eoNumber) && bodyText.length >= 40;

  return {
    nrId: meta.nrId,
    sourceUrl: meta.sourceUrl,
    title: title || undefined,
    eoNumber,
    releasedAt,
    expiresAt,
    bodyText,
    parseOk,
    parseErrors,
  };
}

function tryParseUsDate(raw: string): string | undefined {
  const ms = Date.parse(raw.trim());
  if (Number.isNaN(ms)) return undefined;
  return new Date(ms).toISOString();
}
