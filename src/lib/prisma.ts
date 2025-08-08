import { PrismaClient } from "@/generated/prisma";

export const prisma = new PrismaClient();

export const globalForPrisma = global as unknown as { prisma: PrismaClient };

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;