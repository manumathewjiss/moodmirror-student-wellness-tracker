export type MoodReflectionSlug =
  | "happy"
  | "sad"
  | "angry"
  | "fearful"
  | "disgusted"
  | "surprised"
  | "calm";

export type MoodQuote = { text: string; author: string };

export type MoodReflectionTheme = {
  /** Hub card: border + soft bg */
  hubCard: string;
  /** Detail page: full-area gradient */
  pageGradient: string;
  /** Individual quote panels */
  quotePanel: string;
  /** Accent for headings / links on detail */
  accent: string;
  /** Backdrop illustration variant */
  backdrop: "sun" | "dew" | "ember" | "mist" | "garden" | "dawn" | "forest";
};

export type MoodReflection = {
  slug: MoodReflectionSlug;
  label: string;
  emoji: string;
  intro: string;
  quotes: readonly MoodQuote[];
  theme: MoodReflectionTheme;
};

export const MOOD_REFLECTIONS: readonly MoodReflection[] = [
  {
    slug: "happy",
    label: "Happy",
    emoji: "☀️",
    intro: "Let warmth and gratitude settle in for a moment.",
    quotes: [
      { text: "Happiness depends upon ourselves.", author: "Aristotle" },
      { text: "The purpose of our lives is to be happy.", author: "Dalai Lama" },
      { text: "Enjoy the little things in life.", author: "Robert Brault" },
    ],
    theme: {
      hubCard:
        "border-amber-400/40 bg-gradient-to-br from-amber-950/50 via-midnight-light to-midnight-light hover:border-amber-300/60",
      pageGradient: "bg-gradient-to-b from-amber-950/80 via-[#1c1917] to-midnight",
      quotePanel:
        "border-amber-500/25 bg-amber-950/35 backdrop-blur-sm shadow-[0_0_40px_-10px_rgba(251,191,36,0.25)]",
      accent: "text-amber-200",
      backdrop: "sun",
    },
  },
  {
    slug: "sad",
    label: "Sad",
    emoji: "🌧️",
    intro: "It is okay to feel this. These words meet you where you are.",
    quotes: [
      { text: "This too shall pass.", author: "Rumi" },
      { text: "Tears come from the heart, not from the brain.", author: "Leonardo da Vinci" },
      { text: "Every human walks around with a certain kind of sadness.", author: "Brad Pitt" },
    ],
    theme: {
      hubCard:
        "border-sky-700/40 bg-gradient-to-br from-slate-900/90 via-indigo-950/40 to-midnight-light hover:border-sky-500/45",
      pageGradient: "bg-gradient-to-b from-slate-950 via-indigo-950/70 to-midnight",
      quotePanel:
        "border-sky-600/20 bg-slate-900/50 backdrop-blur-sm shadow-[0_0_40px_-12px_rgba(56,189,248,0.15)]",
      accent: "text-sky-200",
      backdrop: "dew",
    },
  },
  {
    slug: "angry",
    label: "Angry",
    emoji: "🍃",
    intro: "Space to breathe and soften—without judging the feeling.",
    quotes: [
      {
        text: "For every minute you are angry you lose sixty seconds of happiness.",
        author: "Ralph Waldo Emerson",
      },
      {
        text: "Speak when you are angry and you will make the best speech you will ever regret.",
        author: "Ambrose Bierce",
      },
      { text: "Holding onto anger is like drinking poison.", author: "Buddha" },
    ],
    theme: {
      hubCard:
        "border-rose-900/50 bg-gradient-to-br from-rose-950/45 via-midnight-light to-midnight-light hover:border-rose-700/50",
      pageGradient: "bg-gradient-to-b from-rose-950/60 via-[#2a1518] to-midnight",
      quotePanel:
        "border-rose-800/25 bg-rose-950/30 backdrop-blur-sm shadow-[0_0_36px_-10px_rgba(244,63,94,0.12)]",
      accent: "text-rose-200",
      backdrop: "ember",
    },
  },
  {
    slug: "fearful",
    label: "Fearful",
    emoji: "🌫️",
    intro: "Fear can shrink when we name it and take one small step anyway.",
    quotes: [
      { text: "Do the thing you fear and the death of fear is certain.", author: "Ralph Waldo Emerson" },
      { text: "Fear is only as deep as the mind allows.", author: "Japanese Proverb" },
      { text: "Courage is resistance to fear, not absence of it.", author: "Mark Twain" },
    ],
    theme: {
      hubCard:
        "border-violet-800/45 bg-gradient-to-br from-violet-950/55 via-midnight-light to-midnight-light hover:border-violet-500/45",
      pageGradient: "bg-gradient-to-b from-violet-950/75 via-[#1e1b2e] to-midnight",
      quotePanel:
        "border-violet-500/20 bg-violet-950/35 backdrop-blur-sm shadow-[0_0_40px_-10px_rgba(167,139,250,0.2)]",
      accent: "text-violet-200",
      backdrop: "mist",
    },
  },
  {
    slug: "disgusted",
    label: "Disgusted",
    emoji: "🌿",
    intro: "Grounding perspectives when things feel heavy or off.",
    quotes: [
      { text: "You must not lose faith in humanity.", author: "Mahatma Gandhi" },
      { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey" },
      { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
    ],
    theme: {
      hubCard:
        "border-emerald-800/40 bg-gradient-to-br from-emerald-950/50 via-midnight-light to-midnight-light hover:border-emerald-500/45",
      pageGradient: "bg-gradient-to-b from-emerald-950/65 via-[#14221c] to-midnight",
      quotePanel:
        "border-emerald-600/20 bg-emerald-950/35 backdrop-blur-sm shadow-[0_0_40px_-10px_rgba(52,211,153,0.15)]",
      accent: "text-emerald-200",
      backdrop: "garden",
    },
  },
  {
    slug: "surprised",
    label: "Surprised",
    emoji: "✨",
    intro: "Life shifts quickly—these lines honor curiosity and wonder.",
    quotes: [
      { text: "Life is full of surprises and serendipity.", author: "Maya Angelou" },
      { text: "Expect the unexpected.", author: "Oscar Wilde" },
      { text: "The more you know, the more you realize you don't know.", author: "Socrates" },
    ],
    theme: {
      hubCard:
        "border-teal-600/35 bg-gradient-to-br from-teal-950/55 via-cyan-950/25 to-midnight-light hover:border-teal-400/45",
      pageGradient: "bg-gradient-to-b from-teal-950/70 via-cyan-950/30 to-midnight",
      quotePanel:
        "border-teal-500/25 bg-teal-950/35 backdrop-blur-sm shadow-[0_0_42px_-8px_rgba(45,212,191,0.2)]",
      accent: "text-teal-200",
      backdrop: "dawn",
    },
  },
  {
    slug: "calm",
    label: "Calm",
    emoji: "🌲",
    intro: "Stillness, trees, and breath—a quiet corner just for you.",
    quotes: [
      { text: "Peace comes from within.", author: "Buddha" },
      { text: "Nothing can bring you peace but yourself.", author: "Ralph Waldo Emerson" },
      { text: "Within you, there is a stillness and a sanctuary.", author: "Hermann Hesse" },
    ],
    theme: {
      hubCard:
        "border-green-800/40 bg-gradient-to-br from-green-950/55 via-midnight-light to-midnight-light hover:border-green-500/45",
      pageGradient: "bg-gradient-to-b from-green-950/80 via-[#152018] to-midnight",
      quotePanel:
        "border-green-600/20 bg-green-950/40 backdrop-blur-sm shadow-[0_0_48px_-12px_rgba(74,222,128,0.18)]",
      accent: "text-green-200",
      backdrop: "forest",
    },
  },
] as const;

export const MOOD_SLUGS: MoodReflectionSlug[] = MOOD_REFLECTIONS.map((m) => m.slug);

export function getMoodReflection(slug: string): MoodReflection | undefined {
  return MOOD_REFLECTIONS.find((m) => m.slug === slug);
}
