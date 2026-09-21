import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** True when Prisma fails due to missing env / DB file (setup not run). */
export function isDatabaseNotReadyError(err: unknown): boolean {
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  const msg = err instanceof Error ? err.message : String(err);
  return (
    code === "P1001" ||
    code === "P1003" ||
    code === "P1012" ||
    /DATABASE_URL|Environment variable not found|Unable to open the database|does not exist|no such table/i.test(
      msg
    )
  );
}
