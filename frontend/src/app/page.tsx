"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

/** Accepts standard email pattern: local@domain.tld (e.g. user@example.com, name@mail.co.in) */
function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return pattern.test(trimmed);
}

type User = {
  id: string;
  email: string;
  username: string;
  created_at: string;
};

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem("moodmirror_username")) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!isValidEmail(email)) {
      setError("Please provide a correct email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail ?? "Signup failed");
      }
      setCurrentUser(data);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("moodmirror_username", data.username);
        window.dispatchEvent(new CustomEvent("moodmirror-user-changed"));
      }
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err.message ?? "Something went wrong";
      setError(
        typeof msg === "string" && /email|valid.*mail/i.test(msg)
          ? "Please provide a correct email address."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail ?? "Login failed");
      }
      setCurrentUser(data);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("moodmirror_username", data.username);
        window.dispatchEvent(new CustomEvent("moodmirror-user-changed"));
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-midnight px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-midnight-lighter bg-midnight-light p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-2 text-foreground">
          MoodMirror
        </h1>
        <p className="text-foreground-muted text-sm text-center mb-6">Sign in</p>

        <div className="flex mb-6 rounded-xl bg-midnight p-1">
          <button
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              mode === "signup"
                ? "bg-sunburst text-ink"
                : "text-foreground-muted hover:text-foreground"
            }`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Sign up
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              mode === "login"
                ? "bg-sunburst text-ink"
                : "text-foreground-muted hover:text-foreground"
            }`}
            onClick={() => setMode("login")}
            type="button"
          >
            Log in
          </button>
        </div>

        {mode === "signup" ? (
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input
                type="email"
                required
                className="w-full rounded-lg border border-midnight-lighter bg-midnight px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted outline-none focus:border-sunburst focus:ring-1 focus:ring-sunburst"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Username</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={50}
                className="w-full rounded-lg border border-midnight-lighter bg-midnight px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted outline-none focus:border-sunburst focus:ring-1 focus:ring-sunburst"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. manu"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-sunburst py-2.5 text-sm font-semibold text-ink hover:bg-sunburst-dark disabled:opacity-60 transition-colors"
            >
              {loading ? "Signing up..." : "Sign up"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Username</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={50}
                className="w-full rounded-lg border border-midnight-lighter bg-midnight px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted outline-none focus:border-sunburst focus:ring-1 focus:ring-sunburst"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. manu"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-sunburst py-2.5 text-sm font-semibold text-ink hover:bg-sunburst-dark disabled:opacity-60 transition-colors"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-5 text-sm text-red-400 text-center">{error}</p>
        )}
      </div>
    </main>
  );
}
