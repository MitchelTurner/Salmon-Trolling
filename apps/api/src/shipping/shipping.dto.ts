import { createZodDto } from 'nestjs-zod';
import { CreateShippingBodySchema } from '@troll/shared';

export class CreateShippingDto extends createZodDto(CreateShippingBodySchema) {}
