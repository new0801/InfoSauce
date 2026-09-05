import { NextResponse } from "next/server";

const supportedOperations = new Set(["category", "daily", "verify"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ operation: string }> },
) {
  const { operation } = await params;

  if (!supportedOperations.has(operation)) {
    return NextResponse.json({ error: "Integration endpoint not found" }, { status: 404 });
  }

  const isMultipart = request.headers.get("content-type")?.startsWith("multipart/form-data");
  let body: unknown;
  try {
    body = isMultipart ? await request.formData() : await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:3001";
  const retryPayload = operation === "daily" && body && typeof body === "object"
    ? body as { retryArticleId?: unknown; article?: unknown }
    : null;
  const dailyRetryArticleId = typeof retryPayload?.retryArticleId === "string"
    ? retryPayload.retryArticleId
    : null;
  const upstreamPath = dailyRetryArticleId
    ? `/api/daily/${encodeURIComponent(dailyRetryArticleId)}/verify`
    : `/api/${operation}`;
  const upstreamBody = dailyRetryArticleId
    ? { article: retryPayload?.article }
    : body;

  try {
    const upstream = await fetch(`${aiServiceUrl}${upstreamPath}`, {
      method: "POST",
      headers: isMultipart ? undefined : { "Content-Type": "application/json" },
      body: isMultipart ? body as FormData : JSON.stringify(upstreamBody),
    });

    const responseBody = await upstream.text();
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch {
    return NextResponse.json({ error: "AI service is unavailable" }, { status: 503 });
  }
}
