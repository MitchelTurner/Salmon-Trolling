/**
 * Authenticated org scope. Never take orgId from the request body —
 * docs/06-api.md / 10-backend.mdc.
 */
export type OrgContext = {
  readonly orgId: string;
  readonly userId: string;
};

export const ORG_CONTEXT = Symbol('ORG_CONTEXT');

/**
 * Dev/test bearer token: `Bearer troll.<base64url(JSON)>`
 * Production JWT verification replaces this parser later.
 */
export function parseDevBearerToken(
  authorization: string | undefined,
): OrgContext | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  if (!token.startsWith('troll.')) return null;
  try {
    const raw = Buffer.from(token.slice('troll.'.length), 'base64url').toString(
      'utf8',
    );
    const parsed = JSON.parse(raw) as { orgId?: unknown; userId?: unknown };
    if (
      typeof parsed.orgId !== 'string' ||
      parsed.orgId.length === 0 ||
      typeof parsed.userId !== 'string' ||
      parsed.userId.length === 0
    ) {
      return null;
    }
    return { orgId: parsed.orgId, userId: parsed.userId };
  } catch {
    return null;
  }
}

export function mintDevBearerToken(ctx: OrgContext): string {
  const payload = Buffer.from(
    JSON.stringify({ orgId: ctx.orgId, userId: ctx.userId }),
    'utf8',
  ).toString('base64url');
  return `Bearer troll.${payload}`;
}
