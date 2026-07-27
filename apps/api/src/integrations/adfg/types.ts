export type AdfgListItem = {
  readonly nrId: string;
  readonly releaseDate: string;
  readonly expiresDate?: string;
  readonly area: string;
  readonly summary: string;
  readonly action: string;
  readonly detailPath: string;
};

export type AdfgDetail = {
  readonly nrId: string;
  readonly sourceUrl: string;
  readonly title?: string;
  readonly eoNumber?: string;
  readonly releasedAt?: string;
  readonly expiresAt?: string;
  readonly bodyText: string;
  readonly parseOk: boolean;
  readonly parseErrors: readonly string[];
};

export type AdfgListSnapshot = {
  readonly sourceUrl: string;
  readonly fetchedAt: string;
  readonly items: readonly AdfgListItem[];
  readonly contentHash: string;
  readonly cacheTtlMs: number;
};

/**
 * ADF&G scrape boundary. No public JSON API — HTML only.
 */
export interface AdfgClient {
  fetchEmergencyOrderList(input: {
    regionCode: string;
    year: number;
  }): Promise<AdfgListSnapshot>;
  fetchEmergencyOrderDetail(detailPath: string): Promise<AdfgDetail>;
}

export const ADFG_CLIENT = Symbol('ADFG_CLIENT');
