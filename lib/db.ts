import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/deskshark'
});

// Instantiate PrismaClient
let client = globalForPrisma.prisma;

// Refresh cached global instance if new schema models (like 'user') are missing from HMR cache
if (!client || !('user' in client)) {
  client = new PrismaClient({ adapter } as any);
}

export const prisma = client;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
