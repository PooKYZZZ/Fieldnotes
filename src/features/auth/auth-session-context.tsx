"use client";

import { createContext, useContext, type ReactNode } from "react";
import { authClient } from "@/features/auth/auth-client";

type AuthSessionState = { userId?: string; email?: string; pending: boolean };
const AuthSessionContext = createContext<AuthSessionState>({ pending: true });

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = authClient.useSession();
  return <AuthSessionContext.Provider value={{ userId: data?.user.id, email: data?.user.email, pending: isPending }}>
    {children}
  </AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionState {
  return useContext(AuthSessionContext);
}
