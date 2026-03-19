import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, modelId } = body;

    const db = getDb();
    const row = db
      .prepare("SELECT base_url, model_id, api_key FROM models WHERE id = ?")
      .get(modelId) as
      | { base_url: string; model_id: string; api_key: string }
      | undefined;

    if (!row) {
      return new Response(JSON.stringify({ error: "Model not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { base_url: baseUrl, model_id: modelName, api_key: apiKey } = row;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "API key not configured for this model. Please set it in Settings.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = new OpenAI({
      baseURL: baseUrl,
      apiKey: apiKey,
    });

    // Pass messages through as-is — content can be a string OR a multimodal array
    // (e.g. [{ type: "text", text: "..." }, { type: "image_url", image_url: { url: "data:..." } }])
    const completion = await client.chat.completions.create({
      model: modelName,
      messages: messages.map((m: { role: string; content: any }) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 1,
      top_p: 1,
      max_tokens: 16384,
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            if (!chunk.choices?.length) continue;
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            const reasoning = (delta as any).reasoning_content;
            if (reasoning) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "reasoning", content: reasoning })}\n\n`
                )
              );
            }

            if (delta.content) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "content", content: delta.content })}\n\n`
                )
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", content: err.message || "Stream error" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
