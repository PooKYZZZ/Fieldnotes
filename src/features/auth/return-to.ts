export function safeReturnPath(value: string | undefined, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\r\n\u0000-\u001f]/.test(value)) {
    return fallback;
  }
  try {
    const destination = new URL(value, "https://fieldnotes.invalid");
    if (destination.origin !== "https://fieldnotes.invalid") return fallback;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}
