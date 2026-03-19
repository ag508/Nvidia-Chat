import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NVIDIA AI Hub",
  description: "A liquid glass AI experience powered by NVIDIA.",
  icons: {
    icon: "https://www.nvidia.com/favicon.ico", 
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark selection:bg-[#76B900]/30 selection:text-white">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="antialiased min-h-screen selection:backdrop-blur-md">
        {children}
      </body>
    </html>
  );
}
