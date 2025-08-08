import { PrismaClient } from "@/generated/prisma";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  socialProviders: {
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID || "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
      redirectURI: "https://local.akikoe.jp:3000/api/auth/callback/spotify",
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID || "",
      clientSecret: process.env.APPLE_CLIENT_SECRET || "",
      redirectURI: "https://local.akikoe.jp:3000/api/auth/callback/apple",
    },
  },
  baseURL: "https://local.akikoe.jp:3000",
  trustedOrigins: [
    "https://localhost",
    "https://localhost:3000",
    "https://local.akikoe.jp",
    "https://local.akikoe.jp:3000",
    "https://appleid.apple.com",
  ],
});
