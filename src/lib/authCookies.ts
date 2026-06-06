const SESSION_COOKIE = "jojo_session";
const ADMIN_COOKIE = "jojo_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

function writeCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

/** Sync the lightweight client-side UX cookie used by middleware redirects. */
export function syncAuthCookies(user: { uid: string } | null, _isAdmin: boolean) {
  if (typeof document === "undefined") return;
  void _isAdmin;

  if (user) {
    writeCookie(SESSION_COOKIE, "1", MAX_AGE);
    clearCookie(ADMIN_COOKIE);
    return;
  }

  clearCookie(SESSION_COOKIE);
  clearCookie(ADMIN_COOKIE);
}

export { SESSION_COOKIE };
