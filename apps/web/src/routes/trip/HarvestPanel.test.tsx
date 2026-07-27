import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { logCatch } from '../../catches/log-catch.js';
import { getLocalDb, setLocalDb, TrollDatabase } from '../../db/database.js';
import type { CatchRecord } from '../../db/types.js';
import { ulid } from '../../db/ulid.js';
import { HarvestPanel } from './HarvestPanel.js';

const geom = {
  type: 'Point' as const,
  coordinates: [-131.6, 55.3] as [number, number],
};

describe('HarvestPanel', () => {
  let kept: CatchRecord;

  beforeEach(async () => {
    localStorage.clear();
    const db = new TrollDatabase(`harvest-panel-${ulid()}`);
    setLocalDb(db);
    await db.open();
    await db.trips.put({
      id: 'trip1',
      orgId: 'org1',
      startedAt: new Date().toISOString(),
    });
    kept = await logCatch({
      orgId: 'org1',
      tripId: 'trip1',
      species: 'coho',
      kept: true,
      geom,
      rigSnapshot: { delivery: 'DOWNRIGGER' },
      depthSnapshot: { depthM: 12, assumptions: [] },
    });
  });

  afterEach(async () => {
    cleanup();
    const db = getLocalDb();
    db.close();
    await db.delete();
    localStorage.clear();
  });

  it('requires one-tap draft then confirm; never auto-submits', async () => {
    render(<HarvestPanel keptCatches={[kept]} />);

    expect(screen.getByTestId('regulatory-disclaimer')).toBeTruthy();
    expect(screen.queryByTestId('harvest-confirm-panel')).toBeNull();
    expect(await getLocalDb().harvestRecords.count()).toBe(0);

    fireEvent.click(screen.getByTestId(`harvest-draft-${kept.id}`));

    expect(screen.getByTestId('harvest-confirm-panel')).toBeTruthy();
    expect(await getLocalDb().harvestRecords.count()).toBe(0);

    fireEvent.click(screen.getByTestId('harvest-confirm'));

    await waitFor(async () => {
      expect(await getLocalDb().harvestRecords.count()).toBe(1);
    });

    expect(screen.queryByTestId('harvest-confirm-panel')).toBeNull();
    expect(screen.getByText(/confirmed/i)).toBeTruthy();
  });
});
