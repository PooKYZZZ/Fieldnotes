import { NextRequest, NextResponse } from "next/server";
import { assertAuthRuntimeConfiguration, getAuth } from "@/features/auth/auth.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleAuth(request: NextRequest): Promise<Response> {
  try {
    assertAuthRuntimeConfiguration();
    return await getAuth().handler(request);
  } catch {
    return NextResponse.json(
      { code: "AUTH_UNAVAILABLE", message: "Sign-in is temporarily unavailable. Public learning content remains open." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export { handleAuth as GET, handleAuth as POST };
