import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, name, provider, base_url as baseUrl, model_id as modelId, api_key as apiKey, is_default as isDefault, created_at as createdAt FROM models ORDER BY created_at ASC"
    )
    .all() as any[];

  const models = rows.map((row) => ({
    ...row,
    isDefault: row.isDefault === 1,
  }));

  return NextResponse.json(models);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const id = uuid();

  db.prepare(
    `INSERT INTO models (id, name, provider, base_url, model_id, api_key, is_default) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    body.name,
    body.provider,
    body.baseUrl,
    body.modelId,
    body.apiKey || "",
    body.isDefault ? 1 : 0
  );

  return NextResponse.json({ id, ...body });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const db = getDb();

  db.prepare(
    `UPDATE models SET name=?, provider=?, base_url=?, model_id=?, api_key=?, is_default=? WHERE id=?`
  ).run(
    body.name,
    body.provider,
    body.baseUrl,
    body.modelId,
    body.apiKey || "",
    body.isDefault ? 1 : 0,
    body.id
  );

  return NextResponse.json(body);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = getDb();
  db.prepare("DELETE FROM models WHERE id = ?").run(id);

  return NextResponse.json({ success: true });
}
