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
});
