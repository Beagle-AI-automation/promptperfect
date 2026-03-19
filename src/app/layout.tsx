import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";
import { StructuredData } from "@/components/StructuredData";
import { OGMetaTags } from "@/components/OGMetaTags";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PromptPerfect",
  description: "Open-source prompt optimizer that teaches you why",
};

function ThemeInitScript() {
  // Sets html.dark before paint to avoid flash.
  const code = `
(() => {
  try {
    const key = 'promptperfect:theme';
    const saved = localStorage.getItem(key);
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = (saved === 'light' || saved === 'dark') ? saved : (systemDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch {}
})();`.trim();

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('promptperfect-theme');var s=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var r=t==='dark'||t==='light'?t:s;document.documentElement.classList.add(r);})();`,
          }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
