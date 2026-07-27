import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLocalDb, setLocalDb, TrollDatabase } from '../../db/database.js';
import { ulid } from '../../db/ulid.js';
import { saveLocalBundle } from '../../bundles/store.js';
import { DockPage } from './DockPage.js';

describe('DockPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    const db = new TrollDatabase(`dock-${ulid()}`);
    setLocalDb(db);
    await db.open();
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    const db = getLocalDb();
    db.close();
    await db.delete();
    localStorage.clear();
  });

  it('shows prominent age and refresh prompt for a stale local bundle', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-07-27T12:00:00.000Z'));

    await saveLocalBundle({
      regionId: 'ketchikan',
      startIso: '2026-07-24T00:00:00.000Z',
      expiresAt: '2026-07-29T00:00:00.000Z',
      generatedAt: '2026-07-24T12:00:00.000Z',
      schemaVersion: 1,
      signature: 'sig',
      payload: { tides: [] },
    });

    render(
      <MemoryRouter>
        <DockPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('bundle-age').textContent).toBe('3 days ago');
    });
    expect(screen.getByTestId('bundle-prompt').textContent).toMatch(
      /tap to refresh before you leave/i,
    );
    expect(screen.getByTestId('bundle-refresh')).toBeTruthy();
  });

  it('refreshes into IndexedDB and updates the age readout', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-07-27T12:00:00.000Z'));

    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          tides: [{ stationId: '9450460' }],
          currents: [],
          forecast: { issuingOffice: 'PAJK', issueTime: '2026-07-27T00:00:00.000Z' },
          regs: { items: [] },
          sunMoon: {},
          bathyTileRefs: [],
          meta: {
            regionId: 'ketchikan',
            startIso: '2026-07-27T00:00:00.000Z',
            expiresAt: '2026-07-29T00:00:00.000Z',
            generatedAt: '2026-07-27T11:30:00.000Z',
            schemaVersion: 1,
            windowHours: 48,
            signature: 'abc',
          },
          generatedAt: '2026-07-27T11:30:00.000Z',
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchImpl);

    render(
      <MemoryRouter>
        <DockPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('bundle-age').textContent).toBe('none');
    });

    fireEvent.click(screen.getByTestId('bundle-refresh'));

    await waitFor(() => {
      expect(screen.getByTestId('bundle-age').textContent).toBe(
        '30 minutes ago',
      );
    });
    expect(fetchImpl).toHaveBeenCalled();
    const stored = await getLocalDb().bundles.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.signature).toBe('abc');
  });
});
