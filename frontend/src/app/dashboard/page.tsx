"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUsername } from "@/lib/session";

export default function DashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredUsername();
    setUsername(stored);
    if (typeof window !== "undefined" && !stored) {
      router.replace("/");
    }
  }, [router]);

  if (username === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-foreground-muted">Loading...</p>
      </main>
    );
  }

  if (!username) {
    return null;
  }

  const options = [
    {
      href: "/quick-check",
      title: "Quick Check",
      description: "Analyze the emotional tone of any text and save it to your history.",
    },
    {
      href: "/diary",
      title: "Diary",
      description: "Add keywords or moods and we'll generate a short diary entry, analyze emotion, and save it.",
    },
    {
      href: "/history",
      title: "History",
      description: "View your recent mood entries from Quick Check and Diary.",
    },
    {
      href: "/insights",
      title: "Insights",
      description: "Mood trend line, calendar, and other visualizations from your entries.",
    },
    {
      href: "/reflect",
      title: "Reflect",
      description: "Calming spaces by mood with quotes to help you pause and feel supported.",
    },
    {
      href: "/unwind",
      title: "Unwind",
      description: "Mini breaks — tic tac toe, reaction tap, odd one out, and coin flip with saved scores.",
    },
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back, @{username}</h1>
        <p className="text-foreground-muted text-sm">Choose what you’d like to do.</p>
      </header>

      <div className="space-y-4">
        {options.map((opt) => (
          <Link
            key={opt.href}
            href={opt.href}
            className="block rounded-xl border border-midnight-lighter bg-midnight-light p-5 transition-colors hover:border-sunburst/50 hover:bg-midnight-lighter/50"
          >
            <h2 className="text-lg font-semibold text-sunburst mb-1">{opt.title} →</h2>
            <p className="text-foreground-muted text-sm">{opt.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
