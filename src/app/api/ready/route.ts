import { NextResponse } from "next/server";
import { assertAuthReadiness } from "@/features/auth/auth.server";
import { checkDatabase } from "@/features/progress/storage/store.server";

export const dynamic = "force-dynamic";

export function GET() {
  let databaseReady = false;
  let authenticationReady = false;

  try {
    databaseReady = checkDatabase().status === "ok";
  } catch {
    // Report readiness without exposing connection details.
  }
  try {
    assertAuthReadiness();
    authenticationReady = true;
  } catch {
    // Report readiness without exposing secrets or provider configuration.
  }

  const ready = databaseReady && authenticationReady;
  return NextResponse.json({
    status: ready ? "ready" : "not_ready",
    checks: {
      database: databaseReady ? "ok" : "error",
      authentication: authenticationReady ? "ready" : "not_ready",
    },
  }, {
    status: ready ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
