import {
  Catch,
  type ExceptionFilter,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';

/**
 * RFC 7807 problem+json for validation and calc failures.
 * Does not echo request bodies.
 */
@Catch(ZodValidationException, HttpException)
export class ProblemFilter implements ExceptionFilter {
  catch(exception: ZodValidationException | HttpException, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const generatedAt = new Date().toISOString();

    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      res.status(HttpStatus.BAD_REQUEST).type('application/problem+json').json({
        type: 'https://troll.app/problems/validation-error',
        title: 'Request validation failed',
        status: HttpStatus.BAD_REQUEST,
        detail: zodError.errors.map((e) => e.message).join('; '),
        generatedAt,
      });
      return;
    }

    const status = exception.getStatus();
    const body = exception.getResponse();
    const detail =
      typeof body === 'string'
        ? body
        : typeof body === 'object' &&
            body !== null &&
            'message' in body &&
            typeof (body as { message: unknown }).message === 'string'
          ? (body as { message: string }).message
          : exception.message;

    res.status(status).type('application/problem+json').json({
      type: 'https://troll.app/problems/http-error',
      title: exception.name,
      status,
      detail,
      generatedAt,
    });
  }
}
