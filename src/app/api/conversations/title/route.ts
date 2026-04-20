import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { quickComplete, cleanLabel } from "@/lib/llm";

/**
 * POST /api/conversations/title
 * body: { conversationId, modelId, userText, attachmentNames? }
 *
 * Generates a concise 4-7 word title from the first message using the
 * selected model. Writes it back to the conversations table and returns
 * the new title. If LLM generation fails, leaves the existing (fallback)
 * title in place and returns null.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, modelId, userText, attachmentNames } = body as {
      conversationId: string;
      modelId: string;
      userText: string;
      attachmentNames?: string[];
    };

    if (!conversationId || !modelId || !userText) {
      return NextResponse.json(
        { error: "Missing conversationId, modelId, or userText" },
        { status: 400 }
      );
    }

    const ctx = [
      userText.slice(0, 1200),
      attachmentNames?.length
        ? `\n(Attached: ${attachmentNames.slice(0, 6).join(", ")})`
        : "",
    ]
      .join("")
      .trim();

    const system =
      "You write extremely concise chat titles. Output ONLY the title text: 3-6 words, Title Case, no quotes, no punctuation at the end, no emojis, no prefixes like 'Chat:' or 'Topic:'. Focus on the user's topic, not their action.";

    const raw = await quickComplete(modelId, system, ctx, 24);
    if (!raw) return NextResponse.json({ title: null });

    let title = cleanLabel(raw);
    // hard cap to prevent runaway output
    if (title.length > 60) title = title.slice(0, 60).trim();
    if (!title) return NextResponse.json({ title: null });

    const db = getDb();
    db.prepare(
      "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?"
    ).run(title, new Date().toISOString(), conversationId);

    return NextResponse.json({ title });
  } catch (err: any) {
    console.error("title route error:", err);
    return NextResponse.json(
      { error: err.message || "Title generation failed", title: null },
      { status: 500 }
    );
  }
}
