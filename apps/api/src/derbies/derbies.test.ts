import { describe, expect, it } from 'vitest';
import {
  DerbyTicketCodeSchema,
  PublicLeaderboardSchema,
} from '@troll/shared';
import { FakeStripeGateway } from '../billing/fake-stripe.js';
import { DerbiesService } from './derbies.service.js';
import { MemoryDerbyStore } from './memory-store.js';

describe('DerbiesService', () => {
  function setup() {
    const store = new MemoryDerbyStore();
    const stripe = new FakeStripeGateway();
    const service = new DerbiesService(store, stripe);
    store.seed({
      id: 'derby_1',
      orgId: 'org_1',
      slug: 'ketchikan-king-2026',
      name: 'Ketchikan King Derby 2026',
      startsAt: '2026-07-01T08:00:00.000Z',
      endsAt: '2026-07-05T02:00:00.000Z',
      rules: {
        eligibleSpecies: ['king'],
        minMassKg: 5,
        allowAppCatchEntries: false,
      },
    });
    return { store, stripe, service };
  }

  it('returns null for unknown slug', async () => {
    const { service } = setup();
    expect(await service.leaderboard('missing')).toBeNull();
  });

  it('ranks weigh-ins publicly without emails', async () => {
    const { store, service } = setup();
    await store.putEntry({
      id: 'entry_a',
      derbyId: 'derby_1',
      displayName: 'Alex River',
      email: 'alex@example.com',
      paidAt: '2026-06-01T12:00:00.000Z',
    });
    await store.putEntry({
      id: 'entry_b',
      derbyId: 'derby_1',
      displayName: 'Blake Harbor',
      email: 'blake@example.com',
      paidAt: '2026-06-02T12:00:00.000Z',
    });
    await store.putEntry({
      id: 'entry_unpaid',
      derbyId: 'derby_1',
      displayName: 'Casey',
      email: 'casey@example.com',
    });

    await store.putWeighIn({
      id: 'wi_small',
      clientId: 'cli_small',
      derbyId: 'derby_1',
      entryId: 'entry_a',
      species: 'king',
      massKg: 12.5,
      t: '2026-07-02T16:00:00.000Z',
      station: 'thomas-basin',
      operatorId: 'op_1',
      witness: 'Dock judge',
      photoKeys: ['photo/a'],
    });
    await store.putWeighIn({
      id: 'wi_big',
      clientId: 'cli_big',
      derbyId: 'derby_1',
      entryId: 'entry_b',
      species: 'king',
      massKg: 22.1,
      t: '2026-07-02T18:00:00.000Z',
      station: 'thomas-basin',
      operatorId: 'op_1',
      photoKeys: [],
    });
    await store.putWeighIn({
      id: 'wi_void',
      clientId: 'cli_void',
      derbyId: 'derby_1',
      entryId: 'entry_a',
      species: 'king',
      massKg: 30,
      t: '2026-07-03T10:00:00.000Z',
      station: 'thomas-basin',
      operatorId: 'op_1',
      photoKeys: [],
      voidedAt: '2026-07-03T11:00:00.000Z',
      voidReason: 'scale recalibration',
    });

    const board = await service.leaderboard('ketchikan-king-2026');
    expect(board).not.toBeNull();
    const parsed = PublicLeaderboardSchema.parse(board);
    expect(parsed.entries.map((e) => e.weighInId)).toEqual([
      'wi_big',
      'wi_small',
    ]);
    expect(parsed.entries[0]!.rank).toBe(1);
    expect(parsed.entries[0]!.displayName).toBe('Blake Harbor');
    expect(parsed.entries[1]!.hasPhoto).toBe(true);
    expect(parsed.registeredCount).toBe(2);
    expect(parsed.weighInCount).toBe(2);
    expect(parsed.rules.allowAppCatchEntries).toBe(false);
    expect(JSON.stringify(parsed)).not.toContain('@example.com');
  });

  it('registers with waiver, Stripe checkout, then issues a ticket', async () => {
    const { service, stripe } = setup();
    const pending = await service.register('ketchikan-king-2026', {
      displayName: 'Alex River',
      email: 'alex@example.com',
      successUrl: 'https://troll.app/derbies/ketchikan-king-2026?paid=1',
      cancelUrl: 'https://troll.app/derbies/ketchikan-king-2026/register',
      waiver: {
        signerName: 'Alex River',
        signatureData: 'data:image/png;base64,aaa',
      },
    });

    expect(pending.paid).toBe(false);
    expect(pending.ticketCode).toBeUndefined();
    expect(pending.waiverAt).toBeTruthy();
    expect(pending.checkoutUrl).toContain('checkout.stripe.test');
    expect(stripe.sessions[0]?.mode).toBe('payment');
    expect(
      (stripe.sessions[0]?.metadata as { kind?: string }).kind,
    ).toBe('derby_ticket');

    const paid = await service.completeRegistration('ketchikan-king-2026', {
      sessionId: pending.checkoutSessionId!,
    });
    expect(paid.paid).toBe(true);
    expect(DerbyTicketCodeSchema.safeParse(paid.ticketCode).success).toBe(true);
    expect(paid.checkoutUrl).toBeUndefined();

    const again = await service.completeRegistration('ketchikan-king-2026', {
      sessionId: pending.checkoutSessionId!,
    });
    expect(again.ticketCode).toBe(paid.ticketCode);

    const board = await service.leaderboard('ketchikan-king-2026');
    expect(board?.registeredCount).toBe(1);
  });

  it('records offline weigh-ins against paid tickets idempotently', async () => {
    const { service } = setup();
    const pending = await service.register('ketchikan-king-2026', {
      displayName: 'Alex River',
      email: 'alex@example.com',
      successUrl: 'https://troll.app/ok',
      cancelUrl: 'https://troll.app/cancel',
      waiver: { signerName: 'Alex River', signatureData: 'sig' },
    });
    const paid = await service.completeRegistration('ketchikan-king-2026', {
      sessionId: pending.checkoutSessionId!,
    });

    const roster = await service.listTickets('ketchikan-king-2026', 'org_1');
    expect(roster).toHaveLength(1);
    expect(roster![0]!.ticketCode).toBe(paid.ticketCode);

    const body = {
      clientId: '01HXWEIGHIN000000000000001',
      ticketCode: paid.ticketCode!,
      species: 'king',
      massKg: 18.2,
      station: 'thomas-basin',
      t: '2026-07-02T19:00:00.000Z',
      witness: 'Dock judge',
      photoKeys: ['photo/local-1'],
    };
    const first = await service.createWeighIn(
      'ketchikan-king-2026',
      'org_1',
      'op_crew',
      body,
    );
    const second = await service.createWeighIn(
      'ketchikan-king-2026',
      'org_1',
      'op_crew',
      body,
    );
    expect(second.id).toBe(first.id);
    expect(first.displayName).toBe('Alex River');
    expect(first.massKg).toBe(18.2);

    await expect(
      service.createWeighIn('ketchikan-king-2026', 'org_1', 'op_crew', {
        ...body,
        clientId: '01HXWEIGHIN000000000000002',
        species: 'halibut',
      }),
    ).rejects.toThrow(/not eligible/);

    await expect(
      service.createWeighIn('ketchikan-king-2026', 'org_1', 'op_crew', {
        ...body,
        clientId: '01HXWEIGHIN000000000000003',
        massKg: 1,
      }),
    ).rejects.toThrow(/minimum/);

    const board = await service.leaderboard('ketchikan-king-2026');
    expect(board?.weighInCount).toBe(1);
    expect(board?.entries[0]!.massKg).toBe(18.2);
  });

  it('audits weigh-ins, voids, and dispute overturns', async () => {
    const { service } = setup();
    const pending = await service.register('ketchikan-king-2026', {
      displayName: 'Alex River',
      email: 'alex@example.com',
      successUrl: 'https://troll.app/ok',
      cancelUrl: 'https://troll.app/cancel',
      waiver: { signerName: 'Alex River', signatureData: 'sig' },
    });
    const paid = await service.completeRegistration('ketchikan-king-2026', {
      sessionId: pending.checkoutSessionId!,
    });

    const weighIn = await service.createWeighIn(
      'ketchikan-king-2026',
      'org_1',
      'op_crew',
      {
        clientId: '01HXDISPUTE00000000000001',
        ticketCode: paid.ticketCode!,
        species: 'king',
        massKg: 25,
        station: 'thomas-basin',
        t: '2026-07-02T20:00:00.000Z',
        witness: 'Dock judge',
        photoKeys: ['photo/x'],
      },
    );

    const dispute = await service.openDispute(
      'ketchikan-king-2026',
      'org_1',
      'op_crew',
      { weighInId: weighIn.id, reason: 'Scale looked high' },
    );
    expect(dispute.status).toBe('open');

    await expect(
      service.resolveDispute(
        'ketchikan-king-2026',
        'org_1',
        'op_crew',
        'CREW',
        dispute.id,
        { resolution: 'overturn', notes: 'Recalibrated scale' },
      ),
    ).rejects.toThrow(/cannot resolve/);

    const resolved = await service.resolveDispute(
      'ketchikan-king-2026',
      'org_1',
      'captain_1',
      'CAPTAIN',
      dispute.id,
      { resolution: 'overturn', notes: 'Recalibrated scale' },
    );
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolution).toBe('overturn');

    const board = await service.leaderboard('ketchikan-king-2026');
    expect(board?.weighInCount).toBe(0);

    const audit = await service.listAudit('ketchikan-king-2026', 'org_1');
    const actions = audit!.map((e) => e.action);
    expect(actions).toContain('REGISTRATION_STARTED');
    expect(actions).toContain('TICKET_ISSUED');
    expect(actions).toContain('WEIGH_IN_RECORDED');
    expect(actions).toContain('DISPUTE_OPENED');
    expect(actions).toContain('WEIGH_IN_VOIDED');
    expect(actions).toContain('DISPUTE_RESOLVED');
    expect(JSON.stringify(audit)).not.toContain('@example.com');
  });

  it('voids a weigh-in without a dispute and drops it from the board', async () => {
    const { service } = setup();
    const pending = await service.register('ketchikan-king-2026', {
      displayName: 'Blake',
      email: 'blake@example.com',
      successUrl: 'https://troll.app/ok',
      cancelUrl: 'https://troll.app/cancel',
      waiver: { signerName: 'Blake', signatureData: 'sig' },
    });
    const paid = await service.completeRegistration('ketchikan-king-2026', {
      sessionId: pending.checkoutSessionId!,
    });
    const weighIn = await service.createWeighIn(
      'ketchikan-king-2026',
      'org_1',
      'op_1',
      {
        clientId: '01HXVOID00000000000000001',
        ticketCode: paid.ticketCode!,
        species: 'king',
        massKg: 14,
        station: 'dock',
        t: '2026-07-02T21:00:00.000Z',
        photoKeys: [],
      },
    );

    await service.voidWeighIn(
      'ketchikan-king-2026',
      'org_1',
      'op_1',
      weighIn.id,
      { reason: 'Wrong species recorded' },
    );

    const board = await service.leaderboard('ketchikan-king-2026');
    expect(board?.weighInCount).toBe(0);
    const audit = await service.listAudit('ketchikan-king-2026', 'org_1');
    expect(audit!.some((e) => e.action === 'WEIGH_IN_VOIDED')).toBe(true);
  });
});
