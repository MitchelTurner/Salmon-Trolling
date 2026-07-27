/**
 * Dev bearer token for dock refresh (matches apps/api org-context).
 * Production replaces this with the real session JWT.
 */
export function mintDevBundleAuth(orgId: string, userId: string): string {
  const payload = btoa(JSON.stringify({ orgId, userId }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `Bearer troll.${payload}`;
}
