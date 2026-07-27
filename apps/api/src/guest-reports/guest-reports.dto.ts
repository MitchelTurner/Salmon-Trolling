import { createZodDto } from 'nestjs-zod';
import { GenerateGuestReportBodySchema } from '@troll/shared';

export class GenerateGuestReportDto extends createZodDto(
  GenerateGuestReportBodySchema,
) {}
