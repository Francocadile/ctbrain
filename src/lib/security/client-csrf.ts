// Client-side helpers for CSRF handling

export const CSRF_HEADER_NAME = "X-CT-CSRF";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// For now we support a future cookie-based token (e.g. "ctb_csrf")
// but fall back to the static flag expected by assertCsrf ("1"/"ctb").
export function getClientCsrfToken(): string | null {
  // If in the future a dedicated CSRF cookie is introduced, prefer it here.
  const fromCookie = readCookie("ctb_csrf");
  if (fromCookie && fromCookie.trim()) return fromCookie.trim();

  // Current backend accepts the static flag via X-CT-CSRF.
  return "1";
}
