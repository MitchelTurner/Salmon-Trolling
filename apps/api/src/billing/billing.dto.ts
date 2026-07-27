import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CheckoutBodySchema = z.object({
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  customerEmail: z.string().email().optional(),
});

export class CheckoutBodyDto extends createZodDto(CheckoutBodySchema) {}

export const PortalBodySchema = z.object({
  returnUrl: z.string().url(),
});

export class PortalBodyDto extends createZodDto(PortalBodySchema) {}
