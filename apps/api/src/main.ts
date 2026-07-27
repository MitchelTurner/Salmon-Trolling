import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Public calc is unauthenticated; CORS open for browser calculator clients.
  app.enableCors();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
