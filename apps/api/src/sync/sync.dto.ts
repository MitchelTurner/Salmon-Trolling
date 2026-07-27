import { createZodDto } from 'nestjs-zod';
import { SyncRequestSchema } from '@troll/shared';

export class SyncRequestDto extends createZodDto(SyncRequestSchema) {}
