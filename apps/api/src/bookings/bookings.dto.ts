import { createZodDto } from 'nestjs-zod';
import {
  CancelBookingBodySchema,
  CreateBookingBodySchema,
  CreateCrewShiftBodySchema,
  RebookBodySchema,
  SignWaiverBodySchema,
} from '@troll/shared';

export class CreateBookingDto extends createZodDto(CreateBookingBodySchema) {}
export class SignWaiverDto extends createZodDto(SignWaiverBodySchema) {}
export class CreateCrewShiftDto extends createZodDto(
  CreateCrewShiftBodySchema,
) {}
export class CancelBookingDto extends createZodDto(CancelBookingBodySchema) {}
export class RebookDto extends createZodDto(RebookBodySchema) {}
