import type { GuestCatchReport } from '@troll/shared';
import type {
  EmailGateway,
  GuestReportStore,
  OutboundEmail,
  TripCatchSource,
  TripCatchSourceRow,
} from './types.js';

export class MemoryGuestReportStore implements GuestReportStore {
  private readonly byId = new Map<string, GuestCatchReport>();
  private readonly byPath = new Map<string, GuestCatchReport>();

  async put(report: GuestCatchReport): Promise<void> {
    this.byId.set(report.id, report);
    this.byPath.set(report.sharePath, report);
  }

  async getById(id: string): Promise<GuestCatchReport | null> {
    return this.byId.get(id) ?? null;
  }

  async getBySharePath(sharePath: string): Promise<GuestCatchReport | null> {
    return this.byPath.get(sharePath) ?? null;
  }
}

export class MemoryTripCatchSource implements TripCatchSource {
  private readonly trips = new Map<string, TripCatchSourceRow>();

  seed(trip: TripCatchSourceRow): void {
    this.trips.set(`${trip.orgId}:${trip.id}`, trip);
  }

  async getTrip(
    orgId: string,
    tripId: string,
  ): Promise<TripCatchSourceRow | null> {
    return this.trips.get(`${orgId}:${tripId}`) ?? null;
  }
}

export class FakeEmailGateway implements EmailGateway {
  readonly sent: OutboundEmail[] = [];

  async send(email: OutboundEmail): Promise<{ id: string }> {
    this.sent.push(email);
    return { id: `msg_${this.sent.length}` };
  }
}
