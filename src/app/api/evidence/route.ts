import { NextResponse } from "next/server";
import { searchExa } from "@/data/research/exa";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query")?.trim();
  if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });
  const result = await searchExa(query);
  const evidence = result.items.map((item) => ({ title: item.title, url: item.url, source: item.source || "Exa web search", content: item.content || item.title, publishedAt: item.publishedAt || null, platform: "exa" }));
  return NextResponse.json({ provider: "exa", query, evidence, unavailable: result.unavailable || null });
}
