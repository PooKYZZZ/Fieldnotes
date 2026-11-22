"use client";

import { createContext, useContext, type ReactNode } from "react";
import { authClient } from "@/features/auth/auth-client";

type AuthSessionState =
  | { status: "loading"; userId?: undefined; email?: undefined; pending: true; retry: () => Promise<void> }
  | { status: "signed-out"; userId?: undefined; email?: undefined; pending: false; retry: () => Promise<void> }
  | { status: "signed-in"; userId: string; email?: string; pending: false; retry: () => Promise<void> }
  | { status: "unavailable"; userId?: undefined; email?: undefined; pending: false; retry: () => Promise<void> };

const initialState: AuthSessionState = { status: "loading", pending: true, retry: async () => {} };
const AuthSessionContext = createContext<AuthSessionState>(initialState);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const { data, isPending, error, refetch } = authClient.useSession();
  const retry = () => refetch();
  const value: AuthSessionState = error
    ? { status: "unavailable", pending: false, retry }
    : isPending
      ? { status: "loading", pending: true, retry }
      : data?.user
        ? { status: "signed-in", userId: data.user.id, email: data.user.email, pending: false, retry }
        : { status: "signed-out", pending: false, retry };
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionState {
  return useContext(AuthSessionContext);
}
