import Link from "next/link";
import { notFound } from "next/navigation";
import { MOOD_SLUGS, getMoodReflection } from "@/data/moodReflections";
import ReflectBackdrop from "@/components/ReflectBackdrop";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return MOOD_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const mood = getMoodReflection(slug);
  if (!mood) return { title: "Reflect | MoodMirror" };
  return {
    title: `${mood.label} | Reflect | MoodMirror`,
    description: mood.intro,
  };
}

export default async function ReflectMoodPage({ params }: PageProps) {
  const { slug } = await params;
  const mood = getMoodReflection(slug);

  if (!mood) {
    notFound();
  }

  const { theme, label, emoji, intro, quotes } = mood;

  return (
    <div className={`relative min-h-[calc(100dvh-5rem)] overflow-hidden ${theme.pageGradient}`}>
      <ReflectBackdrop variant={theme.backdrop} />
      <main className="relative z-10 mx-auto max-w-2xl px-4 py-10 pb-16">
        <Link
          href="/reflect"
          className={`inline-flex items-center gap-1 text-sm font-medium transition hover:underline ${theme.accent}`}
        >
          ← All moods
        </Link>

        <header className="mt-8 mb-10">
          <p className="text-4xl mb-3" aria-hidden>
            {emoji}
          </p>
          <h1 className={`text-3xl font-bold tracking-tight ${theme.accent}`}>{label}</h1>
          <p className="text-foreground-muted text-sm mt-2 leading-relaxed max-w-lg">{intro}</p>
        </header>

        <ol className="space-y-5 list-none p-0 m-0">
          {quotes.map((q, index) => (
            <li key={index}>
              <article
                className={`rounded-2xl border px-6 py-6 md:px-8 md:py-7 ${theme.quotePanel}`}
              >
                <p className="text-foreground text-lg md:text-xl leading-relaxed">
                  &ldquo;{q.text}&rdquo;
                </p>
                <p className={`mt-4 text-sm font-medium ${theme.accent}`}>— {q.author}</p>
              </article>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
