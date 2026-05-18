export type MockLoginUser = {
  email: string;
  password: string;
  nickname: string;
};

export const MOCK_USERS: MockLoginUser[] = [
  { email: "test@jojo.tw", password: "test1234", nickname: "測試球友" },
  { email: "coach@jojo.tw", password: "coach1234", nickname: "王教練" },
  { email: "beginner@jojo.tw", password: "begin1234", nickname: "新手小明" },
];

const sessionMockUsersKey = "jojo_mock_users";

export function getMockUsers() {
  if (typeof window === "undefined") {
    return MOCK_USERS;
  }

  const extraUsers = JSON.parse(
    window.sessionStorage.getItem(sessionMockUsersKey) ?? "[]",
  ) as MockLoginUser[];

  return [...MOCK_USERS, ...extraUsers];
}

export function addSessionMockUser(user: MockLoginUser) {
  const currentUsers = JSON.parse(
    window.sessionStorage.getItem(sessionMockUsersKey) ?? "[]",
  ) as MockLoginUser[];

  window.sessionStorage.setItem(
    sessionMockUsersKey,
    JSON.stringify([
      ...currentUsers.filter((currentUser) => currentUser.email !== user.email),
      user,
    ]),
  );
}
