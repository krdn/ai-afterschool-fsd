import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function getPool(): Pool {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return (
    globalForPrisma.pool ??
    new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  );
}

function getPrismaClient(): PrismaClient {
  if (!databaseUrl) {
    // 빌드 시 DATABASE_URL이 없으면 더미 클라이언트 반환
    if (process.env.NEXT_PHASE === "phase-production-build") {
      const dummyPool = new Pool(); // lazy initialization
      const dummyAdapter = new PrismaPg(dummyPool);
      return new PrismaClient({
        adapter: dummyAdapter,
        log: ["error"],
      });
    }
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = getPool();
  const adapter = new PrismaPg(pool);

  return (
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    })
  );
}

export const db = getPrismaClient();

export const pool = databaseUrl ? getPool() : undefined;

if (process.env.NODE_ENV !== "production" && databaseUrl) {
  globalForPrisma.prisma = db;
  globalForPrisma.pool = pool;
}
