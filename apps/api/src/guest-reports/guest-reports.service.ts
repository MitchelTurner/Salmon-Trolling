import { Inject, Injectable } from '@nestjs/common';
import type {
  GenerateGuestReportBody,
  GuestCatchReport,
  GuestReportCatch,
} from '@troll/shared';
import { randomUUID } from 'node:crypto';
import {
  EMAIL_GATEWAY,
  GUEST_REPORT_STORE,
  TRIP_CATCH_SOURCE,
  type EmailGateway,
  type GuestReportStore,
  type TripCatchSource,
} from './types.js';

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 22)}`;
}

function shareSlug(): string {
  return randomUUID().replace(/-/g, '').slice(0, 16);
}

@Injectable()
export class GuestReportsService {
  constructor(
    @Inject(TRIP_CATCH_SOURCE) private readonly trips: TripCatchSource,
    @Inject(GUEST_REPORT_STORE) private readonly reports: GuestReportStore,
    @Inject(EMAIL_GATEWAY) private readonly email: EmailGateway,
  ) {}

  async generate(
    orgId: string,
    tripId: string,
    body: GenerateGuestReportBody,
  ): Promise<GuestCatchReport> {
    const trip = await this.trips.getTrip(orgId, tripId);
    if (!trip) throw new Error('trip not found');
    if (!trip.closedAt) throw new Error('trip must be closed before report');

    const catches: GuestReportCatch[] = trip.catches.map((c) => ({
      id: c.id,
      species: c.species,
      lengthM: c.lengthM,
      massKg: c.massKg,
      kept: c.kept,
      t: c.t,
      photoKeys: [...c.photoKeys],
    }));

    const createdAt = new Date().toISOString();
    const sharePath = `/r/${shareSlug()}`;
    const report: GuestCatchReport = {
      id: newId('gcr'),
      orgId,
      tripId,
      guestName: body.guestName.trim(),
      guestEmail: body.guestEmail.toLowerCase(),
      boatName: body.boatName.trim(),
      captainName: body.captainName.trim(),
      startedAt: trip.startedAt,
      closedAt: trip.closedAt,
      conditionsSummary: body.conditionsSummary?.trim() || undefined,
      catches,
      sharePath,
      createdAt,
    };

    await this.reports.put(report);
    const emailed = await this.emailReport(report);
    return emailed;
  }

  async getPublic(sharePath: string): Promise<GuestCatchReport | null> {
    const path = sharePath.startsWith('/r/')
      ? sharePath
      : `/r/${sharePath.replace(/^\//, '')}`;
    return this.reports.getBySharePath(path);
  }

  private async emailReport(
    report: GuestCatchReport,
  ): Promise<GuestCatchReport> {
    const catchLines =
      report.catches.length === 0
        ? 'No fish logged this trip — still a day on the water.'
        : report.catches
            .map((c) => {
              const bits = [c.species];
              if (c.lengthM != null) bits.push(`${c.lengthM.toFixed(2)} m`);
              if (c.massKg != null) bits.push(`${c.massKg.toFixed(1)} kg`);
              bits.push(c.kept ? 'kept' : 'released');
              return `• ${bits.join(' · ')}`;
            })
            .join('\n');

    const subject = `Your catch report — ${report.boatName}`;
    const text = [
      `Hi ${report.guestName},`,
      '',
      `Here's your trip aboard ${report.boatName} with Captain ${report.captainName}.`,
      report.conditionsSummary ? `Conditions: ${report.conditionsSummary}` : '',
      '',
      'Catches:',
      catchLines,
      '',
      `View your report: ${report.sharePath}`,
      '',
      '— Misty Fjords / Troll',
    ]
      .filter((line) => line !== '')
      .join('\n');

    await this.email.send({
      to: report.guestEmail,
      subject,
      text,
    });

    const withEmail: GuestCatchReport = {
      ...report,
      emailedAt: new Date().toISOString(),
    };
    await this.reports.put(withEmail);
    return withEmail;
  }
}
