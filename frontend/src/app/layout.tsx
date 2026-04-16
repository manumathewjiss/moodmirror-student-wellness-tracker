import type { Metadata } from "next";
import { Cairo, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin", "arabic"],
  weight: ["300", "400", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MoodMirror",
  description: "Reflect on your mood with emotion-aware diary and quick check",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${cairo.variable} ${geistMono.variable} min-h-screen bg-midnight text-foreground antialiased`}
      >
        <Nav />
        {children}
      </body>
    </html>
  );
}
