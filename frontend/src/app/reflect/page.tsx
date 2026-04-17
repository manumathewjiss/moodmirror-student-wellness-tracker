import Link from "next/link";
import { MOOD_REFLECTIONS } from "@/data/moodReflections";
import ReflectBackdrop from "@/components/ReflectBackdrop";

export const metadata = {
  title: "Reflect | MoodMirror",
  description: "Gentle quotes and reflections tailored to how you feel.",
};

export default function ReflectHubPage() {
  return (
    <div className="relative min-h-[calc(100dvh-5rem)] overflow-hidden">
      <ReflectBackdrop variant="forest" className="opacity-[0.18]" />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-10">
        <header className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-foreground mb-2">Reflect</h1>
          <p className="text-foreground-muted text-sm max-w-xl">
            Choose how you feel right now. Each space has calming visuals and short quotes to help you pause,
            breathe, and reflect—no logging required.
          </p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2">
          {MOOD_REFLECTIONS.map((m) => (
            <li key={m.slug}>
              <Link
                href={`/reflect/${m.slug}`}
                className={`block rounded-2xl border p-5 transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunburst ${m.theme.hubCard}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl leading-none" aria-hidden>
                    {m.emoji}
                  </span>
                  <div>
                    <h2 className={`text-lg font-semibold ${m.theme.accent}`}>{m.label}</h2>
                    <p className="text-foreground-muted text-sm mt-1 leading-relaxed">{m.intro}</p>
                    <span className="mt-3 inline-block text-xs font-medium text-sunburst/90">Open space →</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
