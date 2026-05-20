const SESSION_COOKIE = "jojo_session";
const ADMIN_COOKIE = "jojo_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

function writeCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

/** Sync auth cookies for middleware route protection (client-side only). */
export function syncAuthCookies(user: { uid: string } | null, isAdmin: boolean) {
  if (typeof document === "undefined") return;

  if (user) {
    writeCookie(SESSION_COOKIE, "1", MAX_AGE);
    if (isAdmin) {
      writeCookie(ADMIN_COOKIE, "1", MAX_AGE);
    } else {
      clearCookie(ADMIN_COOKIE);
    }
    return;
  }

  clearCookie(SESSION_COOKIE);
  clearCookie(ADMIN_COOKIE);
}

export { SESSION_COOKIE, ADMIN_COOKIE };
