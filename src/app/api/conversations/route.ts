import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const db = getDb();
  const conversations = db
    .prepare(
      "SELECT id, title, model_id as modelId, created_at as createdAt, updated_at as updatedAt FROM conversations ORDER BY updated_at DESC"
    )
    .all();

  return NextResponse.json(conversations);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO conversations (id, title, model_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
  ).run(id, body.title || "New Chat", body.modelId, now, now);

  return NextResponse.json({
    id,
    title: body.title || "New Chat",
    modelId: body.modelId,
    createdAt: now,
    updatedAt: now,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`UPDATE conversations SET title=?, updated_at=? WHERE id=?`).run(
    body.title,
    now,
    body.id
  );

  return NextResponse.json(body);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = getDb();
  db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);
  db.prepare("DELETE FROM conversations WHERE id = ?").run(id);

  return NextResponse.json({ success: true });
}
