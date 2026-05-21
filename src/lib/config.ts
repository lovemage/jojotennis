const firebaseFlag = process.env.NEXT_PUBLIC_USE_FIREBASE === "true";
const hasBuildTimeConfig = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
);

/** 需同時開啟 flag 且 build 時有 Firebase 設定，避免 production 靜默壞掉 */
export const USE_FIREBASE = firebaseFlag && hasBuildTimeConfig;

export const SUPER_ADMIN_EMAILS = ["sasabrinalu@gmail.com"];
