# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

揪揪網球 / JoJo Tennis — a zh-TW tennis community web app (find courts, find partners, join clubs, book coaches, read news). Deployed on Netlify, backed by Firebase (Auth + Firestore + Storage). The production host is `jojotennis.com`.

## Commands

```bash
npm run dev              # next dev (App Router, http://localhost:3000)
npm run build            # next build
npm run start            # next start (after build)
npm run lint             # next lint (eslint-config-next)
npm run seed             # node --env-file=.env.local scripts/seedFirestore.mjs
npm run deploy:preview   # netlify deploy --build
npm run deploy:prod      # netlify deploy --build --prod
```

There is no test runner configured.

`.env.local` must define the `NEXT_PUBLIC_FIREBASE_*` keys consumed by `lib/firebase.ts` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId). The seed script reads the same vars via `dotenv`.

## Repository layout caveat — two parallel trees

This repo started as an Expo project and was migrated to Next.js; both layouts coexist. The Next.js App Router is what ships. **Use the paths the tsconfig aliases point to, not their lookalikes.**

`tsconfig.json` paths:

| Alias | Resolves to | Notes |
|---|---|---|
| `@/*` | repo root | catches `@/components/*`, `@/data/*`, `@/lib/firebase`, `@/lib/firestoreCollections`, `@/lib/auth*` etc. |
| `@/lib/*` | `./src/lib/*` | **most domain services live here** (authService, matchService, messageService, newsService, adminService, mappers, schema, uiTypes, config, authCookies, …) |
| `@/context/*` | `./context/*` | only `AppContext.tsx` — the active provider. `src/context/AppContext.tsx` is a stale mirror; ignore it. |
| `@/hooks/*` | `./src/hooks/*` | `useFirebaseDataListeners`, `useAuth`, `useMatch`, `useMessages`. The root `hooks/` dir is Expo-era and unused by the web app. |
| `@/stores/*` | `./src/stores/*` | zustand stores (`useAuthStore`, `useNotificationStore`) — mirrors of AppContext state for consumers that need a store handle. |

Gotcha: `@/lib/firebase` resolves to `lib/firebase.ts` (root, the real Firebase init), while `@/lib/firestoreCollections` resolves to `src/lib/...` — except `src/lib/firebase.ts` is just a re-export of the root one. When editing Firebase init, edit `lib/firebase.ts`.

The `app/(tabs)/*.tsx` siblings (e.g. `match.tsx`, `profile.tsx`) and the `app/club/[id].tsx` / `app/court/[id].tsx` files are Expo Router leftovers. Next.js App Router uses the `page.tsx` files inside the same folders — that's what the running app serves. Don't add new routes in the Expo style.

## Architecture

### Single-provider state model

`app/layout.tsx` wraps the tree in `AppProvider` (`context/AppContext.tsx`). Almost every page reads global state through `useApp()`. The provider:

1. Subscribes to Firebase Auth via `onAuthChange` → keeps `fbUser`, hydrates the UI `user` via `getUserProfile`.
2. Mounts three Firestore listener hooks from `src/hooks/useFirebaseDataListeners.ts`:
   - `useFirebaseCoreListeners` — matches, match_applications, users, news, student_posts, pending_courts, admin_emails.
   - `useFirebaseInboxListener` — per-user inbox messages.
   - `useFirebaseConversationListeners` — conversations + per-conversation message subscriptions (refs in `messageUnsubs`).
3. Exposes mutators (`addMatch`, `applyMatch`, `respondToApplicant`, `sendChatMessage`, `saveNewsArticle`, admin ops, …) that delegate to service modules in `src/lib/*Service.ts`.
4. Mirrors auth + unread state into the zustand stores so non-React-tree consumers can read it.

Firestore `Timestamp`/`Date` values are normalized to numbers via `toMillis`; raw schema docs are converted to UI shapes by `toUi*` helpers in `src/lib/mappers.ts`. **Schema types** (`src/lib/schema.ts`) describe Firestore docs; **UI types** (`src/lib/uiTypes.ts`) describe what components consume. Keep this boundary — don't leak Firestore Timestamps into components.

`src/lib/config.ts` hard-codes `USE_FIREBASE = true`. Old branches in AppContext still check this flag and contain localStorage-mock fallbacks; those branches are effectively dead but kept around. New code should assume Firebase.

`SUPER_ADMIN_EMAILS` is also hard-coded there (`sasabrinalu@gmail.com`). Admin status is derived from `adminEmails` state (super admins ∪ Firestore-granted admins via `adminService.grantAdminEmail`).

### Auth and admin gating (double-layer)

1. **Middleware** (`middleware.ts`) reads two cookies (`jojo_session`, `jojo_admin`) on `/admin/:path*`. Missing session → redirect to `/auth?next=...`. Present session but not admin → redirect to `/`.
2. **AdminLayout** (`app/admin/layout.tsx`) re-checks `isAdmin` from AppContext at runtime and renders nothing until auth is ready.

Cookies are set client-side by `syncAuthCookies` in `src/lib/authCookies.ts`, called from AppContext whenever auth state changes. They are **not** httpOnly and are only a UX gate — Firestore security rules are the real authority.

`firestore.rules` currently allows public read and any-authenticated write. Anything stricter must be added there, not in the cookie/middleware layer.

### Service module convention

Domain logic for each collection lives in a `src/lib/<entity>Service.ts` file (matchService, messageService, clubService, coachService, courtService, newsService, userService, adminService, studentService, heartService, inboxService, seedService). They contain both `subscribe*` (returning `onSnapshot` unsubscribers used by the listener hooks) and mutator functions. AppContext calls into services; components call into AppContext. Components should not import services directly except for read-only fetches not covered by listeners (e.g. `fetchAdminDashboardCounts`).

### Firestore collections

Production collection names (see `firestore.indexes.json` and service files): `matches`, `match_applications`, `users`, `clubs`, `club_members`, `courts`, `pending_courts`, `conversations`, `messages` (subcollection of conversations), `coaches`, `student_posts`, `news`, plus `admin_emails`. The older `lib/firestoreCollections.ts` constant map (`matchPosts`, `profiles`, …) is **out of date** — trust the service files and indexes file.

Conversation IDs follow conventions: direct chats use the sorted-uid pair `${uidA}_${uidB}`; match-related chats use `match_${matchId}`; club chats use `club_${clubId}`. Code in `AppContext.getOrCreateConversation` relies on these prefixes.

### Styling

Tailwind only (`tailwind.config.ts`); custom palette tokens are `clay`, `pine`, `ivory`, `parchment`, `gold`, `white`, `ink`, `muted`. Geist Sans/Mono are loaded as local fonts in `app/layout.tsx`. No CSS modules, no styled-components.

### Deploy

`netlify.toml` is the source of truth — `@netlify/plugin-nextjs`, Node 18, security headers set there. The `firebase.json` `hosting` block references `.next` but is **not** the deploy path; only the `firestore` and `storage` sections of `firebase.json` (rules + indexes) are actively used, via `firebase deploy --only firestore,storage` runs.
