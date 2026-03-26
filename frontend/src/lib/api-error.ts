/**
 * Normalize FastAPI / Pydantic error bodies for display.
 */
export function formatApiErrorBody(data: unknown): string {
  if (!data || typeof data !== "object") return "Request failed";
  const d = data as { detail?: unknown };
  const detail = d.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((x) => (x && typeof x === "object" && "msg" in x ? String((x as { msg?: string }).msg ?? "") : ""))
      .filter(Boolean);
    return parts.length ? parts.join(" ") : "Request failed";
  }
  if (detail != null && typeof detail === "object" && "message" in detail) {
    return String((detail as { message?: string }).message ?? "Request failed");
  }
  return "Request failed";
}

/**
 * User-facing message for thrown errors (network vs API body).
 */
export function describeNetworkError(err: unknown, apiBase: string): string {
  if (err instanceof Error) {
    const m = err.message;
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) {
      return `Could not reach the API at ${apiBase}. Is the backend running, and does NEXT_PUBLIC_API_BASE_URL match (production vs local)?`;
    }
    return m;
  }
  return "Something went wrong";
}
