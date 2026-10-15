import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import "./globals.css";

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
  title: "PromptPerfect by Beagle — AI Prompt Optimizer",
  description:
    "Optimize your AI prompts for better results. Free API, Chrome extension, and web app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <RootErrorBoundary>{children}</RootErrorBoundary>
      </body>
    </html>
  );
}
