import type {
  BookingRecord,
  BookingStore,
  CrewShiftRecord,
  CrewShiftStore,
  WaiverRecord,
  WaiverStore,
} from './types.js';

export class MemoryBookingStore implements BookingStore {
  private readonly byId = new Map<string, BookingRecord>();

  async put(row: BookingRecord): Promise<void> {
    this.byId.set(row.id, row);
  }

  async get(orgId: string, id: string): Promise<BookingRecord | null> {
    const row = this.byId.get(id);
    if (!row || row.orgId !== orgId) return null;
    return row;
  }

  async list(orgId: string): Promise<BookingRecord[]> {
    return [...this.byId.values()]
      .filter((b) => b.orgId === orgId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export class MemoryWaiverStore implements WaiverStore {
  private readonly byBooking = new Map<string, WaiverRecord>();

  async put(row: WaiverRecord): Promise<void> {
    this.byBooking.set(row.bookingId, row);
  }

  async getByBooking(bookingId: string): Promise<WaiverRecord | null> {
    return this.byBooking.get(bookingId) ?? null;
  }
}

export class MemoryCrewShiftStore implements CrewShiftStore {
  private readonly rows: CrewShiftRecord[] = [];

  async put(row: CrewShiftRecord): Promise<void> {
    this.rows.push(row);
  }

  async list(orgId: string, date?: string): Promise<CrewShiftRecord[]> {
    return this.rows.filter(
      (r) => r.orgId === orgId && (date == null || r.date === date),
    );
  }
}
