import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";
import { assertAuthRuntimeConfiguration, auth } from "@/features/auth/auth.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = toNextJsHandler(auth);

function configurationError(): NextResponse | undefined {
  try {
    assertAuthRuntimeConfiguration();
    return undefined;
  } catch {
    return NextResponse.json(
      { code: "AUTH_UNAVAILABLE", message: "Sign-in is temporarily unavailable. Public learning content remains open." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: NextRequest) {
  const unavailable = configurationError();
  return unavailable ?? handlers.GET(request);
}

export async function POST(request: NextRequest) {
  const unavailable = configurationError();
  return unavailable ?? handlers.POST(request);
}
