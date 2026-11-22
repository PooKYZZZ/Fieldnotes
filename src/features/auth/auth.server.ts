import "server-only";

import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getAuthDatabase, prepareOwnerProgress } from "@/features/progress/storage/store.server";
import { authAccount, authRateLimit, authSession, authUser, authVerification } from "@/features/auth/storage/schema";
import { isConfiguredOwner as matchesConfiguredOwner } from "@/features/auth/owner-role";
import { authRuntimeConfigurationError } from "@/features/auth/runtime-config";

export type SocialProvider = "google" | "github";

function cleanEmail(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

const ownerEmail = cleanEmail(process.env.FIELDNOTES_OWNER_EMAIL);
const authSecret = process.env.BETTER_AUTH_SECRET ?? "";
const authBaseURL = process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000";
const effectiveAuthSecret = authSecret.length >= 32
  ? authSecret
  : "build-only-placeholder-secret-never-valid-for-runtime";
const testAuthEnabled = process.env.NODE_ENV !== "production"
  && process.env.FIELDNOTES_ENABLE_TEST_AUTH === "true";

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
const githubClientId = process.env.GITHUB_CLIENT_ID?.trim() ?? "";
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET?.trim() ?? "";

const canOfferSocialSignIn = Boolean(ownerEmail && authSecret.length >= 32);
const enabledProviders: SocialProvider[] = canOfferSocialSignIn
  ? [
    ...(googleClientId && googleClientSecret ? ["google" as const] : []),
    ...(githubClientId && githubClientSecret ? ["github" as const] : []),
  ]
  : [];

const socialProviders = {
  ...(enabledProviders.includes("google") ? {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      scope: ["openid", "email", "profile"],
    },
  } : {}),
  ...(enabledProviders.includes("github") ? {
    github: {
      clientId: githubClientId,
      clientSecret: githubClientSecret,
      scope: ["read:user", "user:email"],
    },
  } : {}),
};

const trustedOrigins = [authBaseURL];
if (process.env.NODE_ENV !== "production") {
  trustedOrigins.push("http://localhost:3000", "http://127.0.0.1:3000");
}

export const configuredSocialProviders = enabledProviders;
export const authSetupMessage = !ownerEmail
  ? "Sign-in is being prepared. Set the owner email before opening registration."
  : enabledProviders.length === 0
    ? "Google or GitHub sign-in has not been configured yet. You can keep exploring lessons without an account."
    : undefined;

async function provisionVerifiedOwner(user: { id: string; email: string; emailVerified: boolean }) {
  if (matchesConfiguredOwner(user.email, user.emailVerified, ownerEmail)) {
    prepareOwnerProgress(user.id);
  }
}

const createAuth = () => betterAuth({
  appName: "Fieldnotes",
  baseURL: authBaseURL,
  secret: effectiveAuthSecret,
  trustedOrigins,
  database: drizzleAdapter(getAuthDatabase(), {
    provider: "sqlite",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
      rateLimit: authRateLimit,
    },
  }),
  socialProviders,
  onAPIError: {
    errorURL: `${authBaseURL}/sign-in?error=oauth`,
  },
  emailAndPassword: {
    // E2E only; production accounts use Google/GitHub OAuth.
    enabled: testAuthEnabled,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "user", input: false },
    },
    deleteUser: { enabled: true },
  },
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      allowDifferentEmails: false,
      allowUnlinkingAll: false,
      requireLocalEmailVerified: true,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 10,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 120,
    customRules: {
      "/sign-in/social": { window: 60, max: 8 },
      "/callback/*": { window: 60, max: 12 },
    },
  },
  advanced: {
    cookiePrefix: "fieldnotes-auth",
    useSecureCookies: process.env.NODE_ENV === "production" || authBaseURL.startsWith("https://"),
    crossSubDomainCookies: { enabled: false },
    ipAddress: {
      // The tunnel's edge sets this header; ignore client-controlled X-Forwarded-For.
      ipAddressHeaders: process.env.NODE_ENV === "production" ? ["cf-connecting-ip"] : [],
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            role: matchesConfiguredOwner(user.email, user.emailVerified, ownerEmail) ? "admin" : "user",
          },
        }),
        after: provisionVerifiedOwner,
      },
      update: { after: provisionVerifiedOwner },
    },
  },
});

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  auth ??= createAuth();
  return auth;
}

export type FieldnotesSession = ReturnType<typeof createAuth>["$Infer"]["Session"];

export async function getCurrentSession(): Promise<FieldnotesSession | null> {
  assertAuthRuntimeConfiguration();
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders, query: { disableRefresh: true } });
}

export function assertAuthReadiness(): void {
  assertAuthRuntimeConfiguration();
  if (!ownerEmail) throw new Error("Fieldnotes owner account is not configured.");
  if (enabledProviders.length === 0 && !testAuthEnabled) throw new Error("No sign-in provider is configured.");
}

export function assertAuthRuntimeConfiguration(): void {
  const error = authRuntimeConfigurationError({
    nodeEnv: process.env.NODE_ENV,
    authUrl: process.env.BETTER_AUTH_URL,
    publicUrl: process.env.FIELDNOTES_PUBLIC_URL,
    secret: authSecret,
  });
  if (error) throw new Error(error);
}

export function isConfiguredOwner(email: string, verified: boolean): boolean {
  return matchesConfiguredOwner(email, verified, ownerEmail);
}

export function isLocalE2EAuthEnabled(): boolean {
  return testAuthEnabled;
}
