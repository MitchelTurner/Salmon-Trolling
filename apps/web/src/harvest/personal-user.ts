import { getLocalDb } from '../db/database.js';
import { ulid } from '../db/ulid.js';
import { writeLocal } from '../db/write.js';
import { ensurePersonalOrg } from '../trips/session.js';

const PERSONAL_USER_KEY = 'troll:personalUserId';

/** Solo offline identity for harvest records (no account required). */
export async function ensurePersonalUser(): Promise<string> {
  const existing =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(PERSONAL_USER_KEY)
      : null;
  if (existing) {
    const row = await getLocalDb().users.get(existing);
    if (row) return existing;
  }

  const orgId = await ensurePersonalOrg();
  const id = ulid();
  const createdAt = new Date().toISOString();
  await writeLocal(
    'users',
    {
      id,
      email: `local-${id.slice(0, 8)}@troll.local`,
      displayName: 'Angler',
      createdAt,
    },
    { orgId, opType: 'create' },
  );
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PERSONAL_USER_KEY, id);
  }
  return id;
}
