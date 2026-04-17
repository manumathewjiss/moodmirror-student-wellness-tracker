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
  /** Accent for headings / links on detail (dark, readable on light) */
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
        "border-amber-200/90 bg-gradient-to-br from-amber-50 via-orange-50/70 to-white shadow-sm hover:border-amber-300 hover:shadow-md hover:shadow-amber-100/60",
      pageGradient:
        "bg-gradient-to-b from-amber-50 via-orange-50/80 to-stone-50",
      quotePanel:
        "border-amber-200/70 bg-white/90 backdrop-blur-sm shadow-md shadow-amber-100/50",
      accent: "text-amber-900",
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
        "border-sky-200/90 bg-gradient-to-br from-sky-50 via-indigo-50/50 to-white shadow-sm hover:border-sky-300 hover:shadow-md hover:shadow-sky-100/70",
      pageGradient:
        "bg-gradient-to-b from-sky-100 via-indigo-50/90 to-stone-100",
      quotePanel:
        "border-sky-200/70 bg-white/90 backdrop-blur-sm shadow-md shadow-sky-100/60",
      accent: "text-sky-900",
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
        "border-rose-200/90 bg-gradient-to-br from-rose-50 via-orange-50/40 to-white shadow-sm hover:border-rose-300 hover:shadow-md hover:shadow-rose-100/60",
      pageGradient:
        "bg-gradient-to-b from-rose-50 via-orange-50/60 to-stone-50",
      quotePanel:
        "border-rose-200/70 bg-white/90 backdrop-blur-sm shadow-md shadow-rose-100/50",
      accent: "text-rose-900",
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
        "border-violet-200/90 bg-gradient-to-br from-violet-50 via-purple-50/50 to-white shadow-sm hover:border-violet-300 hover:shadow-md hover:shadow-violet-100/70",
      pageGradient:
        "bg-gradient-to-b from-violet-100 via-purple-50/80 to-stone-100",
      quotePanel:
        "border-violet-200/70 bg-white/90 backdrop-blur-sm shadow-md shadow-violet-100/60",
      accent: "text-violet-900",
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
        "border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white shadow-sm hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-100/60",
      pageGradient:
        "bg-gradient-to-b from-emerald-50 via-teal-50/70 to-stone-50",
      quotePanel:
        "border-emerald-200/70 bg-white/90 backdrop-blur-sm shadow-md shadow-emerald-100/50",
      accent: "text-emerald-900",
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
        "border-cyan-200/90 bg-gradient-to-br from-cyan-50 via-sky-50/60 to-white shadow-sm hover:border-cyan-300 hover:shadow-md hover:shadow-cyan-100/60",
      pageGradient:
        "bg-gradient-to-b from-cyan-100 via-sky-50/85 to-stone-100",
      quotePanel:
        "border-cyan-200/70 bg-white/90 backdrop-blur-sm shadow-md shadow-cyan-100/50",
      accent: "text-teal-900",
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
        "border-green-200/90 bg-gradient-to-br from-green-50 via-lime-50/40 to-white shadow-sm hover:border-green-300 hover:shadow-md hover:shadow-green-100/60",
      pageGradient:
        "bg-gradient-to-b from-green-50 via-emerald-50/70 to-stone-50",
      quotePanel:
        "border-green-200/70 bg-white/90 backdrop-blur-sm shadow-md shadow-green-100/50",
      accent: "text-green-900",
      backdrop: "forest",
    },
  },
] as const;

export const MOOD_SLUGS: MoodReflectionSlug[] = MOOD_REFLECTIONS.map((m) => m.slug);

export function getMoodReflection(slug: string): MoodReflection | undefined {
  return MOOD_REFLECTIONS.find((m) => m.slug === slug);
}
