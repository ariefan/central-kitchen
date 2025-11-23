import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://erp.personalapp.id/api"
      : "http://localhost:8000"),
  plugins: [usernameClient()],
});
export const { signIn, signUp, signOut, useSession, $Infer } = authClient;
