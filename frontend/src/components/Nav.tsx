"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("moodmirror_username");
      window.dispatchEvent(new CustomEvent("moodmirror-user-changed"));
    }
    router.replace("/");
  }

  function readStoredUsername() {
    setUsername(typeof window !== "undefined" ? window.localStorage.getItem("moodmirror_username") : null);
  }

  useEffect(() => {
    readStoredUsername();
    const onUserChange = () => readStoredUsername();
    window.addEventListener("moodmirror-user-changed", onUserChange);
    return () => window.removeEventListener("moodmirror-user-changed", onUserChange);
  }, []);

  // Re-read username when route changes (e.g. after login then navigate)
  useEffect(() => {
    readStoredUsername();
  }, [pathname]);

  return (
    <nav className="border-b border-midnight-lighter bg-midnight px-6 py-4">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-sunburst tracking-tight">
          <img
            src="/moodmirror-logo.png"
            alt="MoodMirror"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-lg object-contain"
          />
          MoodMirror
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href={username ? "/dashboard" : "/"}
            className={`font-medium transition-colors ${pathname === "/" || pathname === "/dashboard" ? "text-sunburst" : "text-foreground-muted hover:text-foreground"}`}
          >
            Home
          </Link>
          <Link
            href="/quick-check"
            className={`font-medium transition-colors ${pathname === "/quick-check" ? "text-sunburst" : "text-foreground-muted hover:text-foreground"}`}
          >
            Quick Check
          </Link>
          <Link
            href="/diary"
            className={`font-medium transition-colors ${pathname === "/diary" ? "text-sunburst" : "text-foreground-muted hover:text-foreground"}`}
          >
            Diary
          </Link>
          <Link
            href="/history"
            className={`font-medium transition-colors ${pathname === "/history" ? "text-sunburst" : "text-foreground-muted hover:text-foreground"}`}
          >
            History
          </Link>
          <Link
            href="/insights"
            className={`font-medium transition-colors ${pathname === "/insights" ? "text-sunburst" : "text-foreground-muted hover:text-foreground"}`}
          >
            Insights
          </Link>
          {username && (
            <>
              <span className="rounded-full bg-midnight-light px-3 py-1 text-xs font-medium text-sunburst">
                @{username}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="font-medium text-foreground-muted hover:text-foreground transition-colors"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
