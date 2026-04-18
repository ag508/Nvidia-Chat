"use client";

export function Empty({ modelName }: { modelName?: string }) {
  return (
    <div
      className="mx-auto flex flex-col items-center justify-center h-full"
      style={{ maxWidth: 720, padding: "32px 32px 220px", minHeight: "60vh" }}
    >
      <div
        className="flex items-center gap-3 font-extrabold tracking-[-0.02em] leading-none"
        style={{ fontSize: 56 }}
      >
        <span style={{ color: "var(--text)" }}>NvTerminal</span>
        <span
          className="font-semibold"
          style={{
            fontSize: 13,
            padding: "5px 11px",
            borderRadius: 999,
            background: "var(--tag-bg)",
            color: "var(--tag-ink)",
            letterSpacing: "0.02em",
          }}
        >
          NIM
        </span>
      </div>
      <p
        className="mt-5 text-[14px]"
        style={{ color: "var(--text-mute)" }}
      >
        {modelName ? `Ready on ${modelName}.` : "Ready when you are."} Type below to start.
      </p>
    </div>
  );
}
