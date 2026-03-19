import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NVIDIA Chat Terminal",
  description: "A terminal-inspired AI workspace with smooth streaming chat, responsive layouts, and NVIDIA-styled polish.",
  icons: {
    icon: "https://www.nvidia.com/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark selection:bg-[#76B900]/35 selection:text-white">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
