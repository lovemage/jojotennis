export const firestoreCollections = {
  courts: "courts",
  matchPosts: "matchPosts",
  clubs: "clubs",
  profiles: "profiles",
  bookingSources: "bookingSources",
  news: "news",
  coaches: "coaches",
  studentNeeds: "studentNeeds",
} as const;

export type FirestoreCollection =
  (typeof firestoreCollections)[keyof typeof firestoreCollections];
