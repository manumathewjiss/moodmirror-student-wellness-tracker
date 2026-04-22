/** localStorage + cross-tab event names for the signed-in user (AIMoodDiary). */
const LEGACY_USERNAME_KEY = "moodmirror_username" as const;

export const USERNAME_STORAGE_KEY = "aimooddiary_username" as const;
export const USER_CHANGED_EVENT = "aimooddiary-user-changed" as const;

export function getStoredUsername(): string | null {
  if (typeof window === "undefined") return null;
  let u = localStorage.getItem(USERNAME_STORAGE_KEY);
  if (u) return u;
  const legacy = localStorage.getItem(LEGACY_USERNAME_KEY);
  if (legacy) {
    localStorage.setItem(USERNAME_STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_USERNAME_KEY);
    return legacy;
  }
  return null;
}

export function setStoredUsername(username: string) {
  localStorage.setItem(USERNAME_STORAGE_KEY, username);
  window.dispatchEvent(new CustomEvent(USER_CHANGED_EVENT));
}

export function clearStoredUsername() {
  localStorage.removeItem(USERNAME_STORAGE_KEY);
  localStorage.removeItem(LEGACY_USERNAME_KEY);
  window.dispatchEvent(new CustomEvent(USER_CHANGED_EVENT));
}
