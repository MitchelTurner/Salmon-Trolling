import { createZodDto } from 'nestjs-zod';
import { CalcDepthBodySchema, CalcSpreadBodySchema } from './schemas.js';

export class CalcDepthDto extends createZodDto(CalcDepthBodySchema) {}
export class CalcSpreadDto extends createZodDto(CalcSpreadBodySchema) {}
