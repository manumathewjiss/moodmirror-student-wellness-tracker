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
  /** Curated Spotify playlist for this mood */
  spotifyPlaylistUrl: string;
  /** Motivational / speech-style video on YouTube */
  youtubeVideoUrl: string;
  quotes: readonly MoodQuote[];
  theme: MoodReflectionTheme;
};

/** Navy + yellow only — matches global app palette */
const navyYellow = {
  hubCard:
    "border border-sunburst/35 bg-midnight-light hover:border-sunburst/70 hover:shadow-lg hover:shadow-sunburst/15 transition",
  pageGradient: "bg-gradient-to-b from-midnight via-midnight-light to-midnight",
  quotePanel:
    "border border-sunburst/30 bg-midnight-light/90 backdrop-blur-sm shadow-lg shadow-black/25",
  accent: "text-sunburst",
} as const;

export const MOOD_REFLECTIONS: readonly MoodReflection[] = [
  {
    slug: "happy",
    label: "Happy",
    emoji: "☀️",
    intro: "Let warmth and gratitude settle in for a moment.",
    spotifyPlaylistUrl:
      "https://open.spotify.com/playlist/0jrlHA5UmxRxJjoykf7qRY?si=vyH5vMFVSB-d2uo3ir2H8w",
    youtubeVideoUrl: "https://youtu.be/r4ZdyS6v3qA?si=1uvWN8ZgghzIshcC",
    quotes: [
      { text: "Happiness depends upon ourselves.", author: "Aristotle" },
      { text: "The purpose of our lives is to be happy.", author: "Dalai Lama" },
      { text: "Enjoy the little things in life.", author: "Robert Brault" },
    ],
    theme: { ...navyYellow, backdrop: "sun" },
  },
  {
    slug: "sad",
    label: "Sad",
    emoji: "🌧️",
    intro: "It is okay to feel this. These words meet you where you are.",
    spotifyPlaylistUrl:
      "https://open.spotify.com/playlist/25ZzkJkOuYir9kHr2CqwPQ?si=jup_qzM-SBON1sXMq7XL5Q",
    youtubeVideoUrl: "https://youtu.be/0cwtNOq_k4w?si=LRqD3AA3zkVi7Fyq",
    quotes: [
      { text: "This too shall pass.", author: "Rumi" },
      { text: "Tears come from the heart, not from the brain.", author: "Leonardo da Vinci" },
      { text: "Every human walks around with a certain kind of sadness.", author: "Brad Pitt" },
    ],
    theme: { ...navyYellow, backdrop: "dew" },
  },
  {
    slug: "angry",
    label: "Angry",
    emoji: "🍃",
    intro: "Space to breathe and soften, without judging the feeling.",
    spotifyPlaylistUrl:
      "https://open.spotify.com/playlist/2joAU7ngDpwRwH2YPJc4z9?si=LJsvEcrERB6J_EBaZkMcRw",
    youtubeVideoUrl: "https://youtu.be/BvdTLcpclxs?si=UxtOy6NrvFjB46gt",
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
    theme: { ...navyYellow, backdrop: "ember" },
  },
  {
    slug: "fearful",
    label: "Fearful",
    emoji: "🌫️",
    intro: "Fear can shrink when we name it and take one small step anyway.",
    spotifyPlaylistUrl:
      "https://open.spotify.com/playlist/4kOdiP5gbzocwxQ8s2UTOF?si=A-VIUZxDQVyi0DamkSwslQ",
    youtubeVideoUrl: "https://youtu.be/yFw7L7p7u5c?si=kEgv-7MQjvDCdK3u",
    quotes: [
      { text: "Do the thing you fear and the death of fear is certain.", author: "Ralph Waldo Emerson" },
      { text: "Fear is only as deep as the mind allows.", author: "Japanese Proverb" },
      { text: "Courage is resistance to fear, not absence of it.", author: "Mark Twain" },
    ],
    theme: { ...navyYellow, backdrop: "mist" },
  },
  {
    slug: "disgusted",
    label: "Disgusted",
    emoji: "🌿",
    intro: "Grounding perspectives when things feel heavy or off.",
    spotifyPlaylistUrl:
      "https://open.spotify.com/playlist/6F0JjEHDSKY2e75SoOhBgj?si=twxjRE1YSQuRY_gad2FhuQ",
    youtubeVideoUrl: "https://youtu.be/BFSiYojJnL8?si=GILofC67mQ_Up_lr",
    quotes: [
      { text: "You must not lose faith in humanity.", author: "Mahatma Gandhi" },
      { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey" },
      { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
    ],
    theme: { ...navyYellow, backdrop: "garden" },
  },
  {
    slug: "surprised",
    label: "Surprised",
    emoji: "✨",
    intro: "Life shifts quickly. These lines honor curiosity and wonder.",
    spotifyPlaylistUrl:
      "https://open.spotify.com/playlist/3uHoErCiHyFWZACXZe0zfS?si=1W7LDKDSRPGcyhYx1Hwtpw",
    youtubeVideoUrl: "https://youtu.be/2OJ4dczhqNY?si=XJ4kYXuta8tuLDfE",
    quotes: [
      { text: "Life is full of surprises and serendipity.", author: "Maya Angelou" },
      { text: "Expect the unexpected.", author: "Oscar Wilde" },
      { text: "The more you know, the more you realize you don't know.", author: "Socrates" },
    ],
    theme: { ...navyYellow, backdrop: "dawn" },
  },
  {
    slug: "calm",
    label: "Calm",
    emoji: "🌲",
    intro: "Stillness, trees, and breath. A quiet corner just for you.",
    spotifyPlaylistUrl:
      "https://open.spotify.com/playlist/1NIlouPwHi81SPIfHf213T?si=ZNAAsLQ0T3a0soOpvjKMSA",
    youtubeVideoUrl: "https://youtu.be/L_vw4Nmiu5o?si=XbzVzNPYc_jnXTed",
    quotes: [
      { text: "Peace comes from within.", author: "Buddha" },
      { text: "Nothing can bring you peace but yourself.", author: "Ralph Waldo Emerson" },
      { text: "Within you, there is a stillness and a sanctuary.", author: "Hermann Hesse" },
    ],
    theme: { ...navyYellow, backdrop: "forest" },
  },
] as const;

export const MOOD_SLUGS: MoodReflectionSlug[] = MOOD_REFLECTIONS.map((m) => m.slug);

export function getMoodReflection(slug: string): MoodReflection | undefined {
  return MOOD_REFLECTIONS.find((m) => m.slug === slug);
}
