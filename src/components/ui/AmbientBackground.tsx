"use client";

/**
 * Soft atmospheric backdrop for the whole shell — slow-drifting
 * multi-point radial orbs + a fine grain overlay. Colors adapt
 * via CSS variables defined in globals.css.
 *
 * Rendered once at the root, sits behind every screen.
 */
export function AmbientBackground() {
  return <div className="nv-ambient" aria-hidden="true" />;
}
