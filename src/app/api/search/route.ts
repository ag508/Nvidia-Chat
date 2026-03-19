import { NextRequest, NextResponse } from "next/server";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Web search API route.
 * Uses DuckDuckGo HTML (free, no API key needed).
 * Can be extended to support Serper, Tavily, Brave, etc.
 */
export async function POST(req: NextRequest) {
  try {
    const { query, maxResults = 5 } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const results = await searchDuckDuckGo(query.trim(), maxResults);

    // Optionally fetch content from top results for richer context
    let enrichedResults = results;
    if (results.length > 0) {
      enrichedResults = await enrichWithContent(results.slice(0, 3));
    }

    return NextResponse.json({ results: enrichedResults });
  } catch (err: any) {
    console.error("Search error:", err);
    return NextResponse.json(
      { error: err.message || "Search failed" },
      { status: 500 }
    );
  }
}

async function searchDuckDuckGo(
  query: string,
  maxResults: number
): Promise<SearchResult[]> {
  const res = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: `q=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`DuckDuckGo returned ${res.status}`);
  }

  const html = await res.text();
  const results: SearchResult[] = [];

  // Split by result blocks — each result has class "result__body"
  const blocks = html.split(/class="result\s/);

  for (let i = 1; i < blocks.length && results.length < maxResults; i++) {
    const block = blocks[i];

    // Extract URL from the result link
    const urlMatch = block.match(/href="([^"]+)"/);
    let url = urlMatch ? urlMatch[1] : "";

    // DuckDuckGo wraps URLs as redirects — extract actual URL
    if (url.includes("uddg=")) {
      const uddgMatch = url.match(/uddg=([^&]+)/);
      url = uddgMatch ? decodeURIComponent(uddgMatch[1]) : url;
    }

    // Skip DuckDuckGo internal links
    if (
      !url ||
      url.startsWith("/") ||
      url.includes("duckduckgo.com") ||
      url.includes("duck.co")
    ) {
      continue;
    }

    // Extract title
    const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      : "";

    // Extract snippet
    const snippetMatch = block.match(
      /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/
    );
    const snippet = snippetMatch
      ? snippetMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      : "";

    if (title && url) {
      results.push({ title, url, snippet });
    }
  }

  return results;
}

/**
 * Fetch actual page content from top results for richer context.
 * Extracts readable text from HTML pages.
 */
async function enrichWithContent(
  results: SearchResult[]
): Promise<SearchResult[]> {
  const enriched = await Promise.all(
    results.map(async (result) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const res = await fetch(result.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "text/html",
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) {
          return result;
        }

        const html = await res.text();

        // Extract readable text content
        let text = html
          // Remove script and style tags with content
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<nav[\s\S]*?<\/nav>/gi, "")
          .replace(/<header[\s\S]*?<\/header>/gi, "")
          .replace(/<footer[\s\S]*?<\/footer>/gi, "")
          // Remove all HTML tags
          .replace(/<[^>]+>/g, " ")
          // Decode HTML entities
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          // Clean up whitespace
          .replace(/\s+/g, " ")
          .trim();

        // Limit to ~1500 chars per page to avoid overwhelming the context
        if (text.length > 1500) {
          text = text.substring(0, 1500) + "...";
        }

        return {
          ...result,
          snippet: text || result.snippet,
        };
      } catch {
        return result; // Return original if fetch fails
      }
    })
  );

  return enriched;
}
