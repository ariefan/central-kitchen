import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "" // Use same origin (cookies work on same domain)
      : "http://localhost:8000"),
  // Must match server basePath configuration
  basePath: "/api/auth",
  plugins: [usernameClient()],
});
export const { signIn, signUp, signOut, useSession, $Infer } = authClient;
