import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NvTerminal — AI Chat on NVIDIA NIM",
  description: "Chat with NVIDIA NIM endpoints.",
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
    <html lang="en" className="selection:bg-[#76B900]/30">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
