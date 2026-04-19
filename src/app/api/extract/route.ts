import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_CHARS = 120_000; // hard cap on extracted text per file

function clamp(s: string): { text: string; truncated: boolean } {
  if (s.length <= MAX_CHARS) return { text: s, truncated: false };
  return { text: s.slice(0, MAX_CHARS), truncated: true };
}

async function extractPdfText(buf: Buffer): Promise<string> {
  // Import the internal lib path to bypass pdf-parse's index.js debug auto-run,
  // which tries to read a sample PDF off disk and crashes under Next.js bundling.
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
  const data = await pdfParse(buf);
  return (data.text || "").trim();
}

async function extractPdfFormFields(buf: Buffer): Promise<string> {
  try {
    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.load(buf, { ignoreEncryption: true, updateMetadata: false });
    const form = pdf.getForm();
    const fields = form.getFields();
    if (!fields.length) return "";
    const lines: string[] = [];
    for (const f of fields) {
      const name = f.getName();
      const t = f.constructor.name.replace(/^PDF/, ""); // TextField, CheckBox, Dropdown, RadioGroup...
      let value = "";
      try {
        const anyF = f as any;
        if (typeof anyF.getText === "function") value = anyF.getText() || "";
        else if (typeof anyF.isChecked === "function") value = anyF.isChecked() ? "checked" : "unchecked";
        else if (typeof anyF.getSelected === "function") value = (anyF.getSelected() || []).join(", ");
      } catch {}
      lines.push(`- [${t}] ${name}${value ? ` = ${value}` : ""}`);
    }
    return `## Fillable Form Fields (${fields.length})\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

async function extractPdf(buf: Buffer): Promise<string> {
  const [text, fields] = await Promise.all([
    extractPdfText(buf).catch(() => ""),
    extractPdfFormFields(buf),
  ]);
  const parts: string[] = [];
  if (text) parts.push(text);
  if (fields) parts.push(fields);
  if (!parts.length) {
    return "[No extractable text or form fields found. Page images are attached below so the model can read the document visually.]";
  }
  return parts.join("\n\n");
}

const MAX_PDF_PAGES_AS_IMAGES = 10;

let pdfjsWorkerConfigured = false;
async function configurePdfjsWorker(pdfjs: any) {
  if (pdfjsWorkerConfigured) return;
  try {
    const { createRequire } = await import("module");
    const req = createRequire(import.meta.url);
    const workerPath = req.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    const { pathToFileURL } = await import("url");
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
    pdfjsWorkerConfigured = true;
  } catch (e) {
    console.warn("[/api/extract] failed to resolve pdfjs worker:", e);
  }
}

async function rasterizePdf(buf: Buffer): Promise<string[]> {
  try {
    const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    await configurePdfjsWorker(pdfjs);
    const { createCanvas } = await import("@napi-rs/canvas");

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buf),
      disableFontFace: true,
      useSystemFonts: false,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES_AS_IMAGES);
    const out: string[] = [];

    // Target ~1600px on the long side — same ballpark Claude/ChatGPT use.
    // JPEG @ ~0.85 is dramatically smaller than PNG and stays well under
    // typical provider per-request size limits.
    const TARGET_LONG_EDGE = 1600;
    const JPEG_QUALITY = 0.85;

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1.0 });
      const longest = Math.max(base.width, base.height);
      const scale = Math.min(2.0, TARGET_LONG_EDGE / longest);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext("2d") as any;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const jpg = canvas.toBuffer("image/jpeg", JPEG_QUALITY);
      const b64 = jpg.toString("base64");
      out.push(`data:image/jpeg;base64,${b64}`);
      console.log(`[/api/extract] page ${i}: ${canvas.width}x${canvas.height}, ${Math.round(jpg.length / 1024)}KB`);
      page.cleanup();
    }
    await pdf.cleanup();
    return out;
  } catch (e) {
    console.error("[/api/extract] rasterize failed:", e);
    return [];
  }
}

async function extractDocx(buf: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return (value || "").trim();
}

async function extractSpreadsheet(buf: Buffer, name: string): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "buffer" });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) parts.push(`### Sheet: ${sheetName}\n${csv}`);
  }
  return parts.join("\n\n").trim();
}

async function extractPptx(buf: Buffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml/i)?.[1] || 0);
      const nb = Number(b.match(/slide(\d+)\.xml/i)?.[1] || 0);
      return na - nb;
    });
  const parts: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("string");
    const texts = Array.from(xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)).map(m => m[1]);
    const body = texts.join(" ").replace(/\s+/g, " ").trim();
    if (body) parts.push(`### Slide ${i + 1}\n${body}`);
  }
  return parts.join("\n\n").trim();
}

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: `File exceeds ${MAX_BYTES / 1024 / 1024}MB limit` }), { status: 413 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const name = file.name || "file";
    const type = file.type || "";
    const ext = extensionOf(name);
    console.log(`[/api/extract] name=${name} type=${type || "(none)"} ext=${ext} bytes=${buf.length}`);

    if (buf.length === 0) {
      return Response.json({
        name, type, ext,
        text: `[The file ${name} is empty (0 bytes). Nothing to extract.]`,
        truncated: false,
        chars: 0,
        images: [],
      });
    }

    let raw = "";
    let images: string[] = [];

    if (type === "application/pdf" || ext === "pdf") {
      raw = await extractPdf(buf);
      images = await rasterizePdf(buf);
    } else if (
      ext === "docx" ||
      type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      raw = await extractDocx(buf);
    } else if (
      ext === "xlsx" || ext === "xls" || ext === "csv" || ext === "tsv" ||
      type.includes("spreadsheet") || type === "text/csv" || type === "text/tab-separated-values"
    ) {
      raw = await extractSpreadsheet(buf, name);
    } else if (
      ext === "pptx" ||
      type === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      raw = await extractPptx(buf);
    } else if (
      type.startsWith("text/") ||
      type === "application/json" ||
      type === "application/xml" ||
      ["txt", "md", "markdown", "json", "xml", "yaml", "yml", "log", "py", "js", "ts",
       "tsx", "jsx", "html", "css", "sh", "sql", "java", "go", "rs", "rb", "php", "c",
       "cpp", "h", "hpp", "cs", "swift", "kt", "toml", "ini", "conf", "env"].includes(ext)
    ) {
      raw = buf.toString("utf-8");
    } else {
      // Best-effort: treat as utf-8 if it decodes cleanly
      const maybe = buf.toString("utf-8");
      if (/^[\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]*$/.test(maybe.slice(0, 2000))) {
        raw = maybe;
      } else {
        return new Response(
          JSON.stringify({ error: `Unsupported file type: ${type || ext || "unknown"}` }),
          { status: 415 }
        );
      }
    }

    const { text, truncated } = clamp(raw);
    return Response.json({ name, type, ext, text, truncated, chars: text.length, images });
  } catch (err: any) {
    console.error("[/api/extract] failed:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Extraction failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
