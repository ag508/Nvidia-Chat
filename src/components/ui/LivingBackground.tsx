"use client";

import { useEffect, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";

/**
 * Living backdrop for the chat main area — WebGL mesh gradient (via
 * @paper-design/shaders-react, the same shader stack used by Linear /
 * Paper / Raycast). Two layered gradients drift over each other for
 * depth; a soft vignette mask fades the edges into the ambient.
 *
 * The motion-core.dev library is Svelte-only, so this is the React-native
 * equivalent — same underlying approach (WebGL fragment shader), same
 * tunable knobs (distortion, swirl, speed, grain, color stops).
 *
 * Respects the current light/dark theme and prefers-reduced-motion.
 */

type Theme = "light" | "dark";

const PALETTES: Record<Theme, { primary: string[]; accent: string[] }> = {
  light: {
    // warm sage · dusk plum · honey · horizon blue — muted, not saturated
    primary: ["#f7f5f0", "#d5e0c8", "#e6d2d6", "#f0e0c2", "#c9d6e3"],
    accent: ["#00000000", "#b9d6a8", "#d8c1c8", "#f0d8a8", "#00000000"],
  },
  dark: {
    // obsidian base with living jade / plum / amber blooms — more saturated
    // so they actually read through the dark canvas
    primary: ["#060608", "#1a2b1e", "#2b1f33", "#2f261a", "#0e1a2a"],
    accent: ["#00000000", "#5f9a4a", "#8663a8", "#c08844", "#00000000"],
  },
};

function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const read = () =>
      setTheme(
        document.documentElement.classList.contains("dark") ? "dark" : "light"
      );
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);
  return theme;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

export function LivingBackground() {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const palette = PALETTES[theme];
  const speed = reduced ? 0 : 0.25;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: -1 }}
    >
      {/* Primary drifting mesh — the workhorse */}
      <MeshGradient
        key={`primary-${theme}`}
        colors={palette.primary}
        distortion={0.85}
        swirl={0.4}
        speed={speed}
        grainMixer={0.08}
        grainOverlay={0}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: theme === "dark" ? 0.85 : 0.7,
        }}
      />

      {/* Secondary accent layer — a slower, swirlier bloom */}
      <MeshGradient
        key={`accent-${theme}`}
        colors={palette.accent}
        distortion={0.6}
        swirl={0.75}
        speed={speed * 0.55}
        grainMixer={0}
        grainOverlay={0}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: theme === "dark" ? 0.55 : 0.45,
          mixBlendMode: theme === "dark" ? "screen" : "multiply",
        }}
      />

      {/* Edge fade to blend with the topbar/composer glass */}
      <div
        className="absolute inset-0"
        style={{
          background:
            theme === "dark"
              ? "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(6,6,10,0.55) 100%)"
              : "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(244,241,234,0.55) 100%)",
        }}
      />

      {/* Subtle grain for texture */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.4'/></svg>\")",
          opacity: theme === "dark" ? 0.18 : 0.22,
          mixBlendMode: theme === "dark" ? "soft-light" : "overlay",
        }}
      />
    </div>
  );
}
