export type MockUser = {
  nickname: string;
  email?: string;
};

export const authStorageKey = "jojo-tennis-user";

export function getMockUser(): MockUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const savedUser = window.localStorage.getItem(authStorageKey);
  return savedUser ? (JSON.parse(savedUser) as MockUser) : null;
}

export function saveMockUser(user: MockUser) {
  window.localStorage.setItem(authStorageKey, JSON.stringify(user));
  window.dispatchEvent(new Event("jojo-auth-change"));
}
