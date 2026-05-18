export type JojoUser = {
  email: string;
  nickname: string;
};

export const authStorageKey = "jojo_user";

export function getUser(): JojoUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const savedUser =
    window.localStorage.getItem(authStorageKey) ??
    window.localStorage.getItem("jojo-tennis-user");

  return savedUser ? (JSON.parse(savedUser) as JojoUser) : null;
}

export function saveUser(user: JojoUser) {
  window.localStorage.setItem(authStorageKey, JSON.stringify(user));
  window.dispatchEvent(new Event("jojo-auth-change"));
}

export function logout() {
  window.localStorage.removeItem(authStorageKey);
  window.localStorage.removeItem("jojo-tennis-user");
  window.dispatchEvent(new Event("jojo-auth-change"));
}

export function isLoggedIn() {
  return Boolean(getUser());
}
