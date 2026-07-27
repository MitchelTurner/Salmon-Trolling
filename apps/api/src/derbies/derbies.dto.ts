import {
  CompleteDerbyRegistrationBodySchema,
  CreateWeighInBodySchema,
  OpenDisputeBodySchema,
  RegisterDerbyBodySchema,
  ResolveDisputeBodySchema,
  VoidWeighInBodySchema,
} from '@troll/shared';
import { createZodDto } from 'nestjs-zod';

export class RegisterDerbyDto extends createZodDto(RegisterDerbyBodySchema) {}

export class CompleteDerbyRegistrationDto extends createZodDto(
  CompleteDerbyRegistrationBodySchema,
) {}

export class CreateWeighInDto extends createZodDto(CreateWeighInBodySchema) {}

export class VoidWeighInDto extends createZodDto(VoidWeighInBodySchema) {}

export class OpenDisputeDto extends createZodDto(OpenDisputeBodySchema) {}

export class ResolveDisputeDto extends createZodDto(ResolveDisputeBodySchema) {}
