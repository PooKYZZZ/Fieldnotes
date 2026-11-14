import { NextResponse } from "next/server";
import { checkDatabase } from "@/features/progress/storage/store.server";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const result = checkDatabase();
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}

