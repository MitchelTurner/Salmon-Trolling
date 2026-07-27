import { createZodDto } from 'nestjs-zod';
import { CreateManifestBodySchema } from '@troll/shared';

export class CreateManifestDto extends createZodDto(CreateManifestBodySchema) {}
