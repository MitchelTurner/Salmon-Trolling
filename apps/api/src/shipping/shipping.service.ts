import { Inject, Injectable } from '@nestjs/common';
import type { CreateShippingBody, ShippingRecord } from '@troll/shared';
import { randomUUID } from 'node:crypto';
import {
  EMAIL_GATEWAY,
  type EmailGateway,
} from '../guest-reports/types.js';
import { FishTagsService } from '../fish-tags/fish-tags.service.js';
import { SHIPPING_STORE, type ShippingStore } from './types.js';

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 22)}`;
}

@Injectable()
export class ShippingService {
  constructor(
    @Inject(SHIPPING_STORE) private readonly shipping: ShippingStore,
    @Inject(EMAIL_GATEWAY) private readonly email: EmailGateway,
    private readonly tags: FishTagsService,
  ) {}

  list(orgId: string): Promise<ShippingRecord[]> {
    return this.shipping.list(orgId);
  }

  async create(
    orgId: string,
    body: CreateShippingBody,
  ): Promise<ShippingRecord> {
    const existing = await this.shipping.getByTagCode(body.tagCode);
    if (existing) return existing;

    const tag = await this.tags.getByCode(body.tagCode);
    if (!tag || tag.orgId !== orgId) {
      throw new Error('tag not found');
    }

    const notifyEmail =
      body.notifyEmail?.toLowerCase() ?? tag.guestEmail?.toLowerCase();
    const shippedAt = new Date().toISOString();

    await this.tags.markShipped(tag.code, {
      carrier: body.carrier.trim(),
      tracking: body.tracking.trim(),
    });

    let notifiedAt: string | undefined;
    if (notifyEmail) {
      await this.email.send({
        to: notifyEmail,
        subject: `Your fish has shipped — ${tag.code}`,
        text: [
          tag.guestName ? `Hi ${tag.guestName},` : 'Hello,',
          '',
          `Your ${tag.species} (${tag.code}) has shipped.`,
          `Carrier: ${body.carrier.trim()}`,
          `Tracking: ${body.tracking.trim()}`,
          '',
          `Track status: ${tag.statusPath}`,
          '',
          '— Troll',
        ].join('\n'),
      });
      notifiedAt = new Date().toISOString();
    }

    const row: ShippingRecord = {
      id: newId('ship'),
      orgId,
      tagCode: tag.code,
      carrier: body.carrier.trim(),
      tracking: body.tracking.trim(),
      destination: body.destination,
      shippedAt,
      notifiedAt,
      notifyEmail,
    };
    await this.shipping.put(row);
    return row;
  }
}
