import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Same schema, two connection modes, picked purely from env vars:
//  - Local dev: DATABASE_URL="file:./dev.db", no auth token.
//  - Production (Vercel): DATABASE_URL="libsql://<db>.turso.io", DATABASE_AUTH_TOKEN set.
// This is what makes the Prisma/SQLite -> Turso -> (later) MongoDB swap possible
// without touching call sites: everything goes through the repositories in
// src/lib/repositories/*, never a raw PrismaClient import outside this module.
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
