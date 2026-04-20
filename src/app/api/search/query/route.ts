import { NextRequest, NextResponse } from "next/server";
import { quickComplete, cleanLabel } from "@/lib/llm";

/**
 * POST /api/search/query
 * body: { modelId, userText, attachmentContext?, history? }
 *
 * Takes the full user context — the latest prompt, a truncated attachment
 * summary, and optional recent messages — and returns a single focused
 * web-search query string that surfaces what's actually needed.
 *
 * Returns { query } on success, or { query: null } on failure so the
 * caller can fall back to the raw user text.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { modelId, userText, attachmentContext, history } = body as {
      modelId: string;
      userText: string;
      attachmentContext?: string;
      history?: Array<{ role: string; content: string }>;
    };

    if (!modelId || !userText) {
      return NextResponse.json(
        { error: "Missing modelId or userText" },
        { status: 400 }
      );
    }

    const historyBlock =
      history?.length
        ? history
            .slice(-4)
            .map(m => `${m.role.toUpperCase()}: ${m.content.slice(0, 300)}`)
            .join("\n")
        : "";

    const attBlock = attachmentContext
      ? `\n\nAttachment excerpt:\n${attachmentContext.slice(0, 1200)}`
      : "";

    const convoBlock = historyBlock ? `\n\nRecent turns:\n${historyBlock}` : "";

    const user = `User's latest message:\n${userText.slice(0, 1500)}${attBlock}${convoBlock}`;

    const system =
      "You rewrite a user prompt into ONE precise web-search query. " +
      "Rules: output ONLY the query string (no quotes, no explanation, no prefixes). " +
      "Incorporate specific entities, dates, numbers, and acronyms the user cares about. " +
      "If attachments or conversation history clarify the intent, use that context. " +
      "Prefer 4-12 words. Avoid stop words like 'how do I' unless essential. " +
      "Do NOT invent facts not present in the input.";

    const raw = await quickComplete(modelId, system, user, 64);
    if (!raw) return NextResponse.json({ query: null });

    let query = cleanLabel(raw);
    // strip surrounding brackets / trailing punctuation
    query = query.replace(/^\[|\]$/g, "").replace(/[?!.]+$/g, "").trim();
    if (!query) return NextResponse.json({ query: null });
    // hard cap
    if (query.length > 240) query = query.slice(0, 240).trim();

    return NextResponse.json({ query });
  } catch (err: any) {
    console.error("search/query route error:", err);
    return NextResponse.json(
      { error: err.message || "Query generation failed", query: null },
      { status: 500 }
    );
  }
}
