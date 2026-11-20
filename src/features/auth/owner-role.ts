function normalizeEmail(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function isConfiguredOwner(email: string | undefined, verified: boolean, ownerEmail: string | undefined): boolean {
  const configuredOwner = normalizeEmail(ownerEmail);
  return Boolean(configuredOwner && verified && normalizeEmail(email) === configuredOwner);
}

export function accountRole(email: string | undefined, verified: boolean, ownerEmail: string | undefined): "admin" | "user" {
  return isConfiguredOwner(email, verified, ownerEmail) ? "admin" : "user";
}
