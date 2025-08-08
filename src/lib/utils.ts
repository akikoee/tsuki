import { clsx, type ClassValue } from "clsx";
import { SignJWT, importPKCS8 } from "jose";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TEAM_ID = process.env.APPLE_MUSIC_TEAM_ID!;
const KEY_ID = process.env.APPLE_MUSIC_KEY_ID!;

const PRIVATE_KEY = (process.env.APPLE_MUSIC_PRIVATE_KEY || "").replace(
  /\\n/g,
  "\n"
);

export async function getAppleDeveloperToken(): Promise<string> {
  const key = await importPKCS8(PRIVATE_KEY, "ES256");
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: KEY_ID })
    .setIssuer(TEAM_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60 * 24) // 1 day
    .sign(key);
}
