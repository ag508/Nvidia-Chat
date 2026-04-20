import OpenAI from "openai";
import { getDb } from "./db";

export interface ResolvedModel {
  client: OpenAI;
  modelName: string;
  displayName: string;
}

/**
 * Look up a model row by id and return an authenticated OpenAI client
 * plus the remote model id. Throws with a readable message if the row
 * is missing or missing its API key.
 */
export function resolveModel(modelId: string): ResolvedModel {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT name, base_url, model_id, api_key FROM models WHERE id = ?"
    )
    .get(modelId) as
    | { name: string; base_url: string; model_id: string; api_key: string }
    | undefined;

  if (!row) {
    throw new Error("Model not found");
  }
  if (!row.api_key) {
    throw new Error("API key missing for this model. Configure in Settings.");
  }

  return {
    client: new OpenAI({ baseURL: row.base_url, apiKey: row.api_key }),
    modelName: row.model_id,
    displayName: row.name,
  };
}

/**
 * Run a non-streaming completion with a small, focused prompt.
 * Used for auxiliary tasks like title generation and search-query
 * rewriting. Falls back to null on any error so callers can degrade
 * gracefully.
 */
export async function quickComplete(
  modelId: string,
  system: string,
  user: string,
  maxTokens = 48
): Promise<string | null> {
  try {
    const { client, modelName } = resolveModel(modelId);
    const r = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
      stream: false,
    });
    const text = r.choices?.[0]?.message?.content?.trim() || "";
    return text || null;
  } catch (e) {
    console.error("quickComplete failed:", e);
    return null;
  }
}

/**
 * Strip reasoning tags and leading/trailing quotes/whitespace from a
 * model response that's meant to be a short label (title, query).
 */
export function cleanLabel(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/^["'`\s]+|["'`\s.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
