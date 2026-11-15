import { NextRequest, NextResponse } from "next/server";
import { progressImportSchema, progressLookupSchema, progressSchema } from "@/features/progress/validation";
import { findProgress, listProgress, saveProgress, saveProgressMany } from "@/features/progress/storage/store.server";

export const dynamic = "force-dynamic";
const maxRequestBytes = 64_000;
const maxImportRequestBytes = 1_000_000;

type JsonBodyResult = { ok: true; value: unknown } | { ok: false; status: 400 | 413; message: string };

async function readJsonBody(request: NextRequest, byteLimit = maxRequestBytes): Promise<JsonBodyResult> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400, message: "Request body must be valid JSON." };

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > byteLimit) {
        await reader.cancel();
        return { ok: false, status: 413, message: "Request is too large." };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown };
  } catch {
    return { ok: false, status: 400, message: "Request body must be valid JSON." };
  } finally {
    reader.releaseLock();
  }
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const requestHost = (forwardedHost ?? request.headers.get("host"))?.split(",", 1)[0]?.trim();
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const requestProtocol = (forwardedProtocol ?? new URL(request.url).protocol)
    .split(",", 1)[0]
    ?.trim()
    .replace(/:$/, "");
  try {
    const originUrl = origin ? new URL(origin) : undefined;
    return Boolean(
      originUrl && requestHost && requestProtocol
      && originUrl.host.toLowerCase() === requestHost.toLowerCase()
      && originUrl.protocol === `${requestProtocol}:`,
    );
  } catch {
    return false;
  }
}

function jsonContentTypeError(request: NextRequest): NextResponse | undefined {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
  }
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader && !/^\d+$/.test(contentLengthHeader)) {
    return NextResponse.json({ error: "Invalid Content-Length header." }, { status: 400 });
  }
  return undefined;
}

export function GET(request: NextRequest) {
  const itemType = request.nextUrl.searchParams.get("itemType");
  const itemId = request.nextUrl.searchParams.get("itemId");
  if (itemType || itemId) {
    const lookup = progressLookupSchema.safeParse({ itemType, itemId });
    if (!lookup.success) return NextResponse.json({ error: "Provide a valid item type and ID." }, { status: 400 });
    try {
      const row = findProgress(lookup.data.itemType, lookup.data.itemId);
      return NextResponse.json(row ? [row] : [], { headers: { "Cache-Control": "no-store" } });
    } catch {
      return NextResponse.json({ error: "Progress storage is unavailable." }, { status: 500 });
    }
  }
  try {
    return NextResponse.json(listProgress(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Progress storage is unavailable." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const contentTypeError = jsonContentTypeError(request);
  if (contentTypeError) return contentTypeError;
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader && Number(contentLengthHeader) > maxRequestBytes) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Same-origin requests only." }, { status: 403 });
  }

  const body = await readJsonBody(request);
  if (!body.ok) return NextResponse.json({ error: body.message }, { status: body.status });

  const parsed = progressSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the fields and try again.", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(saveProgress(parsed.data), { status: 200 });
  } catch {
    return NextResponse.json({ error: "Progress could not be saved." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const contentTypeError = jsonContentTypeError(request);
  if (contentTypeError) return contentTypeError;
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader && Number(contentLengthHeader) > maxImportRequestBytes) {
    return NextResponse.json({ error: "Backup file is too large." }, { status: 413 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Same-origin requests only." }, { status: 403 });
  }

  const body = await readJsonBody(request, maxImportRequestBytes);
  if (!body.ok) return NextResponse.json({ error: body.message }, { status: body.status });
  const parsed = progressImportSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: "This file is not a supported Fieldnotes progress backup.", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const inputs = parsed.data.records.map((record) => progressSchema.parse(record));
    const saved = saveProgressMany(inputs);
    return NextResponse.json({ importedCount: saved.length, merge: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Progress backup could not be imported." }, { status: 500 });
  }
}

