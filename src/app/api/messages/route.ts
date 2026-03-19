import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId)
    return NextResponse.json(
      { error: "Missing conversationId" },
      { status: 400 }
    );

  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, conversation_id as conversationId, role, content, reasoning, attachments, created_at as createdAt FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
    )
    .all(conversationId) as any[];

  // Parse attachments JSON for each message
  const messages = rows.map((row) => ({
    ...row,
    attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
  }));

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();

  const attachmentsJson = body.attachments ? JSON.stringify(body.attachments) : null;

  db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, reasoning, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, body.conversationId, body.role, body.content, body.reasoning || null, attachmentsJson, now);

  // Update conversation timestamp and title if first user message
  const msgCount = db
    .prepare("SELECT COUNT(*) as c FROM messages WHERE conversation_id = ?")
    .get(body.conversationId) as { c: number };

  if (msgCount.c <= 2 && body.role === "user") {
    // Use just the text content for the title, not attachment data
    const titleSource = body.content || "";
    const title =
      titleSource.length > 50
        ? titleSource.substring(0, 50) + "..."
        : titleSource;
    db.prepare(
      `UPDATE conversations SET title=?, updated_at=? WHERE id=?`
    ).run(title, now, body.conversationId);
  } else {
    db.prepare(`UPDATE conversations SET updated_at=? WHERE id=?`).run(
      now,
      body.conversationId
    );
  }

  return NextResponse.json({
    id,
    conversationId: body.conversationId,
    role: body.role,
    content: body.content,
    reasoning: body.reasoning,
    attachments: body.attachments,
    createdAt: now,
  });
}
