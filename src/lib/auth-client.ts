import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  baseURL: "https://local.akikoe.jp:3000",
});
