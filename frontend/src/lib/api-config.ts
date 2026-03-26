/** Backend base URL. Set NEXT_PUBLIC_API_BASE_URL in .env.local (see .env.example). */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
