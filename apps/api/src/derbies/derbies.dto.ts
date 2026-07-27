import {
  CompleteDerbyRegistrationBodySchema,
  RegisterDerbyBodySchema,
} from '@troll/shared';
import { createZodDto } from 'nestjs-zod';

export class RegisterDerbyDto extends createZodDto(RegisterDerbyBodySchema) {}

export class CompleteDerbyRegistrationDto extends createZodDto(
  CompleteDerbyRegistrationBodySchema,
) {}
