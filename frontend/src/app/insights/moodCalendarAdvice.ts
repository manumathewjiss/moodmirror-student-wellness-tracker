/**
 * Short wellness tips keyed to the calendar cell's dominant mood (or no entry).
 * Picked deterministically per date so the same day shows the same tip until refresh logic changes.
 */

export type CalendarMood = "positive" | "negative" | "neutral" | "none";

const POSITIVE: string[] = [
  "Your log leans positive. Notice what helped today and try to repeat it tomorrow.",
  "Good energy shows in your words. Share that lift with someone or a hobby you enjoy.",
  "Ride this wave: jot one thing you're grateful for before bed.",
  "Positive streaks grow from small habits. Keep the routines that support you.",
  "Acknowledge this win: recognizing good days makes them easier to find again.",
];

const NEUTRAL: string[] = [
  "Neutral days can be a steady baseline. Check sleep, meals, and movement without judging yourself.",
  "Steady mood often means balance. Plan something small you look forward to.",
  "Mixed signals are normal. One neutral day doesn't define your week.",
  "Try a five-minute check-in: name one feeling, one need, and one tiny next step.",
  "Calm can be restorative. Give yourself permission to keep the pace manageable.",
];

const NEGATIVE: string[] = [
  "Heavy days are hard. Prioritize rest, hydration, and one kind action toward yourself.",
  "If today felt low, breaking tasks into tiny steps can reduce the load.",
  "Rough patches happen. Reaching out to someone you trust can help.",
  "Notice without spiraling: name the feeling, then one thing that usually helps a little.",
  "If low mood lasts or feels overwhelming, consider talking to a professional or crisis line.",
];

const NONE: string[] = [
  "No entry this day. When you're ready, a quick note here can make patterns clearer.",
  "Logging skipped. Even a word or emoji next time still builds your picture.",
  "Empty days happen. A fresh entry tomorrow still adds to your story.",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function pickCalendarAdvice(mood: CalendarMood, dateStr: string): string {
  const list =
    mood === "positive"
      ? POSITIVE
      : mood === "negative"
        ? NEGATIVE
        : mood === "neutral"
          ? NEUTRAL
          : NONE;
  const i = hashString(`${dateStr}:${mood}`) % list.length;
  return list[i]!;
}

export function moodLabelForCalendar(mood: CalendarMood): string {
  if (mood === "none") return "No entry";
  return `Mostly ${mood}`;
}
