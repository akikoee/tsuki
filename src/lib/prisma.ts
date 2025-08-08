import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const globalForPrisma = global as unknown as { prisma: PrismaClient };

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;