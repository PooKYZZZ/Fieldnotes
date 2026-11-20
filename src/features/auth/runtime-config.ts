export type AuthRuntimeEnvironment = {
  nodeEnv?: string;
  authUrl?: string;
  publicUrl?: string;
  secret?: string;
};

function parseOrigin(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url;
  } catch {
    return null;
  }
}

function isLoopback(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host.endsWith(".localhost") || host === "::1" || /^127\./.test(host);
}

export function authRuntimeConfigurationError(environment: AuthRuntimeEnvironment): string | undefined {
  if ((environment.secret ?? "").length < 32) {
    return "BETTER_AUTH_SECRET is missing or too short.";
  }

  if (environment.nodeEnv !== "production") return undefined;

  const authUrl = parseOrigin(environment.authUrl);
  const publicUrl = parseOrigin(environment.publicUrl);
  if (!authUrl || !publicUrl) {
    return "Production authentication requires valid origin-only BETTER_AUTH_URL and FIELDNOTES_PUBLIC_URL values.";
  }
  if (authUrl.protocol !== "https:" || publicUrl.protocol !== "https:" || isLoopback(authUrl.hostname)) {
    return "Production authentication must use a public HTTPS origin.";
  }
  if (authUrl.origin !== publicUrl.origin) {
    return "BETTER_AUTH_URL must match FIELDNOTES_PUBLIC_URL in production.";
  }
  return undefined;
}
