import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../db/prisma";

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
  trustedOrigins: ["https://tsuki.akikoe.jp", "https://appleid.apple.com"],
});
