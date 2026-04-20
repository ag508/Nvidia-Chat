import { NextRequest, NextResponse } from "next/server";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  /** Domain only, for UI display. */
  domain?: string;
  /** Relative freshness if the provider reports it. */
  age?: string;
  /** Full extracted page content when available (Tavily). */
  raw?: string;
}

interface SearchResponse {
  provider: "tavily" | "brave" | "duckduckgo";
  query: string;
  results: SearchResult[];
}

/**
 * Web search API.
 *
 * Tiered provider strategy (picks the first one with credentials set):
 *   1. Tavily  — purpose-built for LLM grounding, returns raw page
 *                content and a freshness-aware index.
 *                                              env: TAVILY_API_KEY
 *   2. Brave   — fast, fresh, generous free tier.
 *                                              env: BRAVE_SEARCH_API_KEY
 *   3. DuckDuckGo HTML scrape — no key required, best-effort fallback.
 */
export async function POST(req: NextRequest) {
  try {
    const { query, maxResults = 8, freshness } = (await req.json()) as {
      query: string;
      maxResults?: number;
      /** "day" | "week" | "month" | "year" — hints recency to providers that support it. */
      freshness?: "day" | "week" | "month" | "year";
    };

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const q = query.trim();

    // Each provider is attempted in order. On failure (timeout, 4xx, 5xx,
    // network), we log and fall through to the next. Only if everything
    // fails does the endpoint 500.
    const errors: string[] = [];

    if (process.env.TAVILY_API_KEY) {
      try {
        const results = await searchTavily(q, maxResults, freshness);
        if (results.length) {
          return NextResponse.json<SearchResponse>({
            provider: "tavily",
            query: q,
            results,
          });
        }
        errors.push("tavily: empty");
      } catch (e: any) {
        const msg = e?.message || String(e);
        console.warn("Tavily failed, falling through:", msg);
        errors.push(`tavily: ${msg}`);
      }
    }

    if (process.env.BRAVE_SEARCH_API_KEY) {
      try {
        const results = await searchBrave(q, maxResults, freshness);
        if (results.length) {
          const enriched = await enrichWithContent(results.slice(0, 4));
          return NextResponse.json<SearchResponse>({
            provider: "brave",
            query: q,
            results: [...enriched, ...results.slice(4)],
          });
        }
        errors.push("brave: empty");
      } catch (e: any) {
        const msg = e?.message || String(e);
        console.warn("Brave failed, falling through:", msg);
        errors.push(`brave: ${msg}`);
      }
    }

    try {
      const results = await searchDuckDuckGo(q, maxResults);
      if (results.length) {
        const enriched = await enrichWithContent(results.slice(0, 4));
        return NextResponse.json<SearchResponse>({
          provider: "duckduckgo",
          query: q,
          results: [...enriched, ...results.slice(4)],
        });
      }
      errors.push("duckduckgo: empty");
    } catch (e: any) {
      errors.push(`duckduckgo: ${e?.message || String(e)}`);
    }

    return NextResponse.json<SearchResponse>({
      provider: "duckduckgo",
      query: q,
      results: [],
    });
  } catch (err: any) {
    console.error("Search error:", err);
    return NextResponse.json(
      { error: err.message || "Search failed", results: [] },
      { status: 500 }
    );
  }
}

/* ══════════════════════════════════════════════════════════════
   Tavily — LLM-native, returns raw page excerpts.
   ══════════════════════════════════════════════════════════════ */

async function searchTavily(
  query: string,
  maxResults: number,
  freshness?: "day" | "week" | "month" | "year"
): Promise<SearchResult[]> {
  const days =
    freshness === "day"
      ? 1
      : freshness === "week"
        ? 7
        : freshness === "month"
          ? 30
          : undefined;

  // "basic" responds in ~1–3s; "advanced" can take 10–30s and frequently
  // times out on dev keys. Basic + include_raw_content still gives us
  // decent per-page context for grounding.
  const body: Record<string, unknown> = {
    api_key: process.env.TAVILY_API_KEY,
    query,
    search_depth: "basic",
    max_results: Math.min(Math.max(maxResults, 3), 10),
    include_answer: false,
    include_raw_content: true,
    include_images: false,
  };
  if (days) body.days = days;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000);
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error(`Tavily ${r.status}: ${text.slice(0, 200)}`);
    }
    const data = await r.json();
    return (data.results || []).map((x: any) => ({
      title: x.title || "",
      url: x.url || "",
      snippet: (x.content || "").slice(0, 800),
      raw: (x.raw_content || "").slice(0, 2500),
      domain: safeDomain(x.url),
    }));
  } finally {
    clearTimeout(t);
  }
}

/* ══════════════════════════════════════════════════════════════
   Brave Search API · fast, ranked, freshness-aware.
   ══════════════════════════════════════════════════════════════ */

async function searchBrave(
  query: string,
  maxResults: number,
  freshness?: "day" | "week" | "month" | "year"
): Promise<SearchResult[]> {
  const freshMap: Record<string, string> = {
    day: "pd",
    week: "pw",
    month: "pm",
    year: "py",
  };
  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(Math.max(maxResults, 3), 20)),
    safesearch: "moderate",
  });
  if (freshness) params.set("freshness", freshMap[freshness]);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY || "",
        },
        signal: controller.signal,
      }
    );
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error(`Brave ${r.status}: ${text.slice(0, 200)}`);
    }
    const data = await r.json();
    const web = data.web?.results || [];
    return web.map((x: any) => ({
      title: x.title || "",
      url: x.url || "",
      snippet: (x.description || "").replace(/<[^>]+>/g, ""),
      age: x.age,
      domain: safeDomain(x.url),
    }));
  } finally {
    clearTimeout(t);
  }
}

/* ══════════════════════════════════════════════════════════════
   DuckDuckGo HTML fallback · no key required.
   ══════════════════════════════════════════════════════════════ */

async function searchDuckDuckGo(
  query: string,
  maxResults: number
): Promise<SearchResult[]> {
  const res = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    body: `q=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error(`DuckDuckGo returned ${res.status}`);

  const html = await res.text();
  const results: SearchResult[] = [];
  const blocks = html.split(/class="result\s/);

  for (let i = 1; i < blocks.length && results.length < maxResults; i++) {
    const block = blocks[i];
    const urlMatch = block.match(/href="([^"]+)"/);
    let url = urlMatch ? urlMatch[1] : "";
    if (url.includes("uddg=")) {
      const uddgMatch = url.match(/uddg=([^&]+)/);
      url = uddgMatch ? decodeURIComponent(uddgMatch[1]) : url;
    }
    if (
      !url ||
      url.startsWith("/") ||
      url.includes("duckduckgo.com") ||
      url.includes("duck.co")
    ) {
      continue;
    }
    const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      : "";
    const snippetMatch = block.match(
      /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/
    );
    const snippet = snippetMatch
      ? snippetMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      : "";
    if (title && url) {
      results.push({ title, url, snippet, domain: safeDomain(url) });
    }
  }
  return results;
}

/* ══════════════════════════════════════════════════════════════
   Enrichment · fetches a result page and strips to readable text.
   Used when the provider snippet is thin (Brave, DDG).
   ══════════════════════════════════════════════════════════════ */

async function enrichWithContent(
  results: SearchResult[]
): Promise<SearchResult[]> {
  return Promise.all(
    results.map(async result => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(result.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/html",
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (
          !res.ok ||
          !res.headers.get("content-type")?.includes("text/html")
        ) {
          return result;
        }
        const html = await res.text();
        let text = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<nav[\s\S]*?<\/nav>/gi, "")
          .replace(/<header[\s\S]*?<\/header>/gi, "")
          .replace(/<footer[\s\S]*?<\/footer>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, " ")
          .trim();
        if (text.length > 2000) text = text.substring(0, 2000) + "…";
        return { ...result, snippet: text || result.snippet };
      } catch {
        return result;
      }
    })
  );
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
