/** Resolved at bundle time from EXPO_PUBLIC_API_URL (see mobile/.env). */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export function apiLooksLikeLocalhost(): boolean {
  return /localhost|127\.0\.0\.1/.test(API_BASE_URL);
}
