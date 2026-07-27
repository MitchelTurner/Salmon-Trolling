import { describe, expect, it } from 'vitest';
import {
  FakeEmailGateway,
  MemoryGuestReportStore,
  MemoryTripCatchSource,
} from './memory-store.js';
import { GuestReportsService } from './guest-reports.service.js';

describe('GuestReportsService', () => {
  function setup() {
    const trips = new MemoryTripCatchSource();
    const reports = new MemoryGuestReportStore();
    const email = new FakeEmailGateway();
    const service = new GuestReportsService(trips, reports, email);
    return { trips, reports, email, service };
  }

  it('builds a shareable report and emails the guest', async () => {
    const { trips, email, service } = setup();
    trips.seed({
      id: 'trip_1',
      orgId: 'org_1',
      startedAt: '2026-07-27T14:00:00.000Z',
      closedAt: '2026-07-27T22:00:00.000Z',
      catches: [
        {
          id: 'c1',
          species: 'king',
          lengthM: 0.9,
          massKg: 12,
          kept: true,
          t: '2026-07-27T18:00:00.000Z',
          photoKeys: ['p1'],
        },
      ],
    });

    const report = await service.generate('org_1', 'trip_1', {
      guestName: 'Alex Guest',
      guestEmail: 'alex@example.com',
      boatName: 'Northern Light',
      captainName: 'Sam',
      conditionsSummary: 'Flood tide, overcast',
    });

    expect(report.sharePath).toMatch(/^\/r\//);
    expect(report.catches).toHaveLength(1);
    expect(report.emailedAt).toBeTruthy();
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.to).toBe('alex@example.com');
    expect(email.sent[0]?.subject).toContain('Northern Light');
    expect(email.sent[0]?.text).toContain('king');
    expect(email.sent[0]?.text).toContain(report.sharePath);

    const pub = await service.getPublic(report.sharePath.slice(3));
    expect(pub?.guestName).toBe('Alex Guest');
  });

  it('refuses open trips', async () => {
    const { trips, service } = setup();
    trips.seed({
      id: 'trip_open',
      orgId: 'org_1',
      startedAt: '2026-07-27T14:00:00.000Z',
      closedAt: null,
      catches: [],
    });

    await expect(
      service.generate('org_1', 'trip_open', {
        guestName: 'Alex',
        guestEmail: 'alex@example.com',
        boatName: 'Northern Light',
        captainName: 'Sam',
      }),
    ).rejects.toThrow(/closed/);
  });

  it('allows zero-catch reports (blank trip still gets a page)', async () => {
    const { trips, service } = setup();
    trips.seed({
      id: 'trip_blank',
      orgId: 'org_1',
      startedAt: '2026-07-27T14:00:00.000Z',
      closedAt: '2026-07-27T18:00:00.000Z',
      catches: [],
    });

    const report = await service.generate('org_1', 'trip_blank', {
      guestName: 'Alex',
      guestEmail: 'alex@example.com',
      boatName: 'Sea Bear',
      captainName: 'Sam',
    });
    expect(report.catches).toHaveLength(0);
  });
});
