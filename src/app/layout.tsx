import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { LivingBackground } from "@/components/ui/LivingBackground";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  title: "NvTerminal — Atelier for NVIDIA NIM",
  description: "A quiet, luminous chat surface over NVIDIA NIM endpoints.",
  icons: { icon: "https://www.nvidia.com/favicon.ico" },
};

const themeInit = `
(function(){
  try {
    var t = localStorage.getItem('nv.theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="antialiased">
        <AmbientBackground />
        <LivingBackground />
        {children}
        <Toaster
          position="top-center"
          offset={16}
          toastOptions={{
            style: {
              background: "var(--glass-strong)",
              backdropFilter: "blur(20px) saturate(1.5)",
              WebkitBackdropFilter: "blur(20px) saturate(1.5)",
              border: "1px solid var(--hairline)",
              color: "var(--text)",
              borderRadius: "14px",
              boxShadow: "var(--shadow-panel)",
            },
          }}
        />
      </body>
    </html>
  );
}
