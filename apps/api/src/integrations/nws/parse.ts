import { NWS_TTL } from './ttl.js';
import type { MarineForecastPeriod, MarineZoneForecast } from './types.js';

export type NwsProductListItem = {
  id: string;
  issuingOffice: string;
  issuanceTime: string;
  productCode?: string;
  productName?: string;
};

export type NwsProductBody = {
  id: string;
  issuingOffice: string;
  issuanceTime: string;
  productCode?: string;
  productName?: string;
  productText: string;
};

export function parseProductList(body: unknown): NwsProductListItem[] {
  const raw = body as { '@graph'?: NwsProductListItem[] };
  const graph = raw['@graph'];
  if (!graph?.length) {
    throw new Error('NWS products: empty list');
  }
  return graph;
}

/**
 * Extract one coastal zone block (`PKZ036-... $$`) from a CWF product.
 */
export function extractZoneSection(productText: string, zoneId: string): string {
  const re = new RegExp(`${zoneId}[\\s\\S]*?\\$\\$`, 'i');
  const match = productText.match(re);
  if (!match) {
    throw new Error(`NWS CWF: zone ${zoneId} not found in product`);
  }
  return match[0].trim();
}

export function parseZonePeriods(section: string): {
  zoneName: string;
  periods: MarineForecastPeriod[];
} {
  const lines = section.split(/\r?\n/);
  let zoneName = '';
  for (const line of lines) {
    const nameMatch = line.match(/^(.+)-\s*$/);
    if (
      nameMatch &&
      !/^PKZ\d+/i.test(nameMatch[1]!) &&
      !/\d{3,4}\s+[AP]M/i.test(nameMatch[1]!)
    ) {
      zoneName = nameMatch[1]!.trim();
      break;
    }
  }

  const periods: MarineForecastPeriod[] = [];
  const periodRe = /\.([A-Z][A-Z0-9 ]+?)\.\.\.([\s\S]*?)(?=\.[A-Z][A-Z0-9 ]+\.\.\.|\$\$|$)/g;
  let m: RegExpExecArray | null;
  while ((m = periodRe.exec(section)) !== null) {
    periods.push({
      name: m[1]!.trim(),
      text: m[2]!.replace(/\s+/g, ' ').trim(),
    });
  }

  return { zoneName: zoneName || zoneIdFallback(section), periods };
}

function zoneIdFallback(section: string): string {
  const id = section.match(/^(PKZ\d+)/i)?.[1];
  return id ?? 'unknown';
}

export function parseMarineZoneForecast(
  product: NwsProductBody,
  zoneId: string,
  fetchedAt: string,
): MarineZoneForecast {
  const rawText = extractZoneSection(product.productText, zoneId);
  const { zoneName, periods } = parseZonePeriods(rawText);
  return {
    zoneId,
    zoneName,
    issuingOffice: product.issuingOffice,
    issueTime: new Date(product.issuanceTime).toISOString(),
    fetchedAt,
    productId: product.id,
    periods,
    rawText,
    cacheTtlMs: NWS_TTL.marineForecastMs,
  };
}
