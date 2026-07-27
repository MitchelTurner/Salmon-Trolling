import { createZodDto } from 'nestjs-zod';
import { IssueFishTagBodySchema } from '@troll/shared';

export class IssueFishTagDto extends createZodDto(IssueFishTagBodySchema) {}
