import { PrismaClient } from '@prisma/client';

export type { Prisma } from '@prisma/client';
export { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  __trollPrisma?: PrismaClient;
};

/** Shared Prisma client for the API and scripts. */
export function createPrismaClient(
  url: string | undefined = process.env['DATABASE_URL'],
): PrismaClient {
  if (!url) {
    throw new Error('DATABASE_URL is required to create a Prisma client');
  }

  return new PrismaClient({
    datasources: { db: { url } },
  });
}

/** Process-wide client for long-lived Node services. */
export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.__trollPrisma) {
    globalForPrisma.__trollPrisma = createPrismaClient();
  }
  return globalForPrisma.__trollPrisma;
}
