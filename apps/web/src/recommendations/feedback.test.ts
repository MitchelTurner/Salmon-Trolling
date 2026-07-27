import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FEEDBACK_QUESTION } from '@troll/shared';
import {
  TrollDatabase,
  getLocalDb,
  setLocalDb,
} from '../db/database.js';
import { ulid } from '../db/ulid.js';
import {
  getFeedbackFor,
  issueRecommendation,
  submitThumbsDown,
} from './store.js';

describe('recommendation feedback loop', () => {
  beforeEach(async () => {
    const db = new TrollDatabase(`troll-fb-${ulid()}`);
    setLocalDb(db);
    await db.open();
  });

  afterEach(async () => {
    const db = getLocalDb();
    db.close();
    await db.delete();
  });

  it('exposes the single feedback question', () => {
    expect(FEEDBACK_QUESTION).toBe('What did you run instead?');
  });

  it('issues a local recommendation and records thumbs-down with ranInstead', async () => {
    const rec = await issueRecommendation({
      lightLevel: 0.1,
      turbidity: 0.2,
      weekOfYear: 24,
      species: 'king',
    });

    expect(rec.payload.reasons.length).toBeGreaterThan(0);
    expect(rec.payload.basis).toBe('rules');

    const fb = await submitThumbsDown({
      recommendationId: rec.id,
      ranInstead: 'white hoochie, 11" UV flasher, 25 fm',
    });

    expect(fb.thumbs).toBe('down');
    expect(fb.ranInstead).toContain('hoochie');
    expect(await getFeedbackFor(rec.id)).toEqual(fb);

    const again = await submitThumbsDown({
      recommendationId: rec.id,
      ranInstead: 'should not replace',
    });
    expect(again.ranInstead).toBe(fb.ranInstead);
  });

  it('requires a non-empty ranInstead answer', async () => {
    const rec = await issueRecommendation({
      lightLevel: 0.5,
      turbidity: 0.2,
      weekOfYear: 24,
    });

    await expect(
      submitThumbsDown({ recommendationId: rec.id, ranInstead: '   ' }),
    ).rejects.toThrow(/run instead/i);
  });
});
