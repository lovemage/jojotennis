# JoJo Tennis 第一階段改造計畫 — 開發方執行版

> 對應 2026/05/27 業主討論會議結論。給開發方執行用，含技術決策、檔案路徑、schema、驗證步驟。業主友善版見 [`renovation-plan-client.md`](./renovation-plan-client.md)。

## Context

業主 JoJo Tennis 於 2026/05/27 會議中拍板：原本以 Firebase 為主、沒有獨立資料庫的設定，改為**雙寫過渡——保留 Firebase Auth + Firestore (即時聊天)，新增 PostgreSQL on Supabase** 作為主資料庫。目的不是解決現有 Bug，而是為了**未來擴充更容易、會員與球場資料能長期維運**，並順勢補上會議中業主點名的三個產品缺口：

1. 球場地圖（Google Maps PIN）—— 目前 `app/court/[id].tsx` 只有「導航到 Google Maps」外部連結，沒有嵌入地圖；首頁無法視覺化看附近球場。
2. 球場圖片輪播 —— `Court` schema 完全沒有圖片欄位，球場頁全是文字，業主希望加環境照輪播。
3. 「社團 / 討論區」轉型「球具評測」—— 目前 `clubService` + `ClubExplorer` 是社團 + 自動聊天室，但討論區流量起不來、台灣使用者習慣 LINE，業主決定**砍掉討論定位、改為由站方/編輯發佈的球具評測內容頁**。

同時新增 **LINE Login** 作為第三登入方式（台灣使用者習慣，且 Google 在 LINE 內建瀏覽器常被擋）、**Cloudinary 圖庫** 取代 Firebase Storage（球場照、評測封面、頭像）並提供 CDN + 自動 WebP/srcset 轉檔，最後將網站升級為 **PWA + 推播通知（FCM）**，讓會員可以「加到主畫面」當 App 用、收到約打申請與聊天訊息的推播。

本期不做：海外/日本分頁、SMS 驗證、金流串接、AI 問答、廠商入口、新版「球友回報球場問題」（既有 `pending_courts` 雛形已夠）。

---

## 服務模式：半自助開發（Dev 折扣價）

本案為小型專案，套用工作室 **Dev 折扣價**，採「**半自助開發服務**」模式（參考 <https://oceanads.org/self-service-apply.html>）。對開發方的意涵：

- **所有 production 雲端帳號由 Sabrina 直接持有**：Supabase、Resend、Cloudinary、Firebase、Netlify、GCP、LINE Developers、DNS。開發方**不擁有任何 production secret**。
- 開發方在自己的「dev 環境」開發：自建 dev Supabase / dev Resend / dev Cloudinary / dev Firebase 專案，與 production 完全隔離。
- 開發方提供 **完整圖文教學引導**（含截圖、API key 取得位置、Netlify env var 名稱對照），協助 Sabrina 順利完成所有 console 操作。
- 開發方提供 **無限次免費諮詢與遠端 screen share** 引導，但**不代為登入** Sabrina 的帳號。

---

## 權限分工與協作模型

**現況**：開發方僅有 **GitHub repo 存取**，**沒有** Firebase Console、Netlify Dashboard、業主既有 GCP 的存取權限。所有 console 端設定（環境變數、Service Account、DNS、Cloud Messaging 啟用等）**都需要業主操作**，開發方提供「逐步指令清單」。

**協作流程**：
1. 開發方在自己的「測試環境」開發（自建 dev 三方專案）。
2. push 到 GitHub branch → Netlify 自動觸發 Preview Build → Preview URL 用業主在 Netlify 設好的 env vars。
3. 業主收到開發方「請新增以下 env vars」指令 → 在 Netlify Dashboard 加 → 觸發 redeploy → 雙方對 Preview URL 驗收。
4. 業主**永遠掌控 production env**；開發方無法看到 secret 值。

**業主必須親自做的事**：詳見 [`renovation-plan-client.html`](./renovation-plan-client.html) §3-1 ~ §3-2 對照表。

**Secret 傳遞原則**：
- 開發方提供「env var 對照清單」，描述每個變數名稱、用途、從哪個 console 取。
- 業主到對應 console 取得值後，**業主自己貼到 Netlify env vars**，不傳給開發方明文 secret。
- Service Account JSON 等大塊內容：業主下載後直接上傳到 Netlify environment files。
- 開發方只需要「dev 環境的等價 keys」（自建專案產出的）。
- 申請各服務時請用 **Email / Password 註冊**，不要用 Google 一鍵登入，避免帳號控制權綁定 Google 而影響未來轉交。

**部署不需要開發方有 Netlify 權限**：因為 GitHub-Netlify 串接會自動建 Preview 與 production deploy；開發方只 push code 即可。Env vars 是業主自管的。

---

## 程式碼基底現況注意事項（開工前必讀）

本 repo 由 Expo 專案改寫成 Next.js，兩種佈局並存。**新增路由一律走 Next.js App Router（`app/<path>/page.tsx`）**，不要動 Expo 遺留檔。

- `app/court/[id].tsx`、`app/club/[id].tsx`、`app/(tabs)/court.tsx`、`app/(tabs)/club.tsx`、`app/(tabs)/match.tsx`、`app/(tabs)/profile.tsx` 都是 Expo Router 遺留。Next.js 不認 `[id].tsx`，這些檔對線上**沒有作用**（`/court/<id>` 目前是 404，本期 §3 球場詳細頁等於從零建）。
- Profile 真正的路由在 `app/(tabs)/profile/page.tsx`（不是 `app/profile/page.tsx`）；Matches 在 `app/matches/[id]/page.tsx`；Court 列表在 `app/(tabs)/courts/page.tsx`。
- 服務模組放 `src/lib/<entity>Service.ts`；Firebase 初始化只動根目錄 `lib/firebase.ts`（`src/lib/firebase.ts` 只是 re-export）。
- `lib/firestoreCollections.ts` 的 `matchPosts/profiles/...` 常數已過期，**不要拿來用**；以實際 collection 名稱（`matches`/`users`…）為準，本期可順手刪掉。
- 既有 soft-delete 約定：`BaseDocument` 帶 `isDeleted: boolean` + `deletedAt: Date`（見 `src/lib/schema.ts:1-7` 與 `src/lib/softDelete.ts`），Supabase 對應欄位請維持 `is_deleted bool` + `deleted_at timestamptz` 雙欄位。

---

## 架構決策

| 決策 | 選擇 | 理由 |
|---|---|---|
| DB 策略 | **雙寫過渡** | 主資料 (courts, clubs→reviews, news, users) 進 SQL；conversations/messages/match_applications 仍走 Firestore，避免重寫 realtime listeners |
| SQL 託管 | **PostgreSQL on Supabase** | 免費額度足、內建 RLS + Storage、與 Next.js 整合佳；不需自己跑後端 API |
| 登入 | **Firebase Auth 主導 + LINE Login (OIDC) 接入** | 不換 Auth 系統，LINE 用 Firebase Auth Custom Token 對接，保留現有 `onAuthChange` 流程 |
| 圖片儲存 | **Cloudinary**（球場圖、評測封面、頭像）；Firebase Storage 僅留作備援 | 半自助模式下 Sabrina 自有帳號；CDN + 自動 WebP / srcset 轉檔，圖片載入優化更佳 |
| 部署 | **Netlify（沿用）** | `netlify.toml` 已是 source of truth |
| PWA 框架 | **`@serwist/next`** | App Router 原生支援、Workbox v7 為核心；`next-pwa` 已停更不支援 App Router |
| 推播後端 | **Firebase Cloud Messaging (FCM)** | 同時支援 Android Chrome / Edge / iOS Safari (PWA 模式)；既有 Firebase Admin 已可重用 |
| iOS 推播策略 | **首訪軟提示「加到主畫面」** | iOS 一般分頁無法 push；必須引導加入主畫面才能 `requestPermission` |

---

## 範圍（本期含）

1. Supabase Postgres 建置 + schema design + 主資料雙寫
2. 球場 Google Maps 地圖 PIN 點
3. 球場圖片輪播（含後台上傳）
4. 社團 → 球具評測 內容頁重構
5. LINE Login 接入（Firebase Auth Custom Token）
6. PWA 改造（installable、icon、splash、Service Worker）
7. 推播通知（FCM）：聊天訊息 + 約打申請與回覆事件；iOS 主畫面引導
8. 約打評論系統（host ↔ player 雙向、星評 + 出席紀錄 + 參加率顯示）
9. Email 通知系統（Resend + React Email）：歡迎信、約打事件、管理員公告

## 範圍（本期不含；列為第二/三階段）

- 海外 / 日本分頁與 region 切換器
- 中英 / 日 i18n 與 AI 翻譯
- 廠商 / 教練後台入口
- 手機簡訊驗證（待業主完成三方申請）
- ECPay / PayUni 金流串接（待業主申請完成）
- AI 問答助理
- 球友打卡徽章 / gamification
- 「新球具評測發布」與「管理員手動公告」推播（本期不觸發）
- 部分離線閱讀、離線寫入同步

---

## 實作分項

### 1. Supabase + 雙寫過渡（架構基礎）

**新增檔案：**
- `src/lib/supabase.ts` — Supabase client 初始化（`createClient` browser + `createServerClient` for RSC/Route Handler）。
- `src/lib/supabase.types.ts` — 由 `supabase gen types typescript` 自動產生的 DB 型別。
- `supabase/migrations/0001_init.sql` — 初始 schema：
  - `courts` (mirror of `Court` schema + 新欄位 `images jsonb[]`, `region text default 'TW'`)
  - `equipment_reviews` (取代 clubs)
  - `news`, `users`（user profile mirror，uid 用 Firebase Auth UID 當 PK）
  - 全部加 `created_at`, `updated_at`, `is_deleted bool`, `deleted_at timestamptz`（對齊既有 Firestore soft-delete 約定）
- `scripts/migrateFirestoreToSupabase.mjs` — 一次性遷移腳本：從 Firestore 拉資料，map 到 Supabase 並 upsert。

**雙寫策略：**
- `USE_FIREBASE = true` 旁新增 `USE_SUPABASE = true` 旗標（`src/lib/config.ts`）。**旗標語意：整體 kill switch；`true` = 讀寫都走 Supabase 主幹（Firestore 為背景備援），`false` = 讀寫完全 fallback 到 Firestore（Supabase 整體掛掉時應急回滾）**。不允許「讀 Supabase / 寫 Firestore」這種半混合狀態，因為 read-write 路徑分裂會讓 UI 顯示與實際 DB 不同步。
- 改寫 `courtService.ts` / `clubService.ts`（將被改名為 `equipmentReviewService.ts`）/ `newsService.ts` / `userService.ts`：
  - **讀取**：Supabase 為 source of truth（用 `@tanstack/react-query` 已存在的 dep 快取）。
  - **寫入**：**Supabase 為主（await 並回傳結果決定 UI 是否成功），Firestore 為非同步 fire-and-forget backup（`void firestoreWrite().catch(logError)`，不 await、不阻塞、不影響 UI 成功訊息）**。這避免「Firestore 寫成功但 Supabase 寫失敗 → UI 顯示成功但主 DB 沒資料」的 race condition。
  - `subscribe*` Firestore listener 改為對應 Supabase Realtime channel（courts/news/equipment_reviews 改變頻率低，這部分可改 SWR/polling 30s）。
- `useFirebaseDataListeners.ts` 拆出 `useSupabaseDataListeners.ts`，AppContext 同時掛載；保留聊天/match 走 Firestore。

**RLS policies（Supabase）：**
- `courts`, `equipment_reviews`, `news` — 公開讀；寫入限 admin（用 JWT custom claim `is_admin`）。
- `users` — 自己可讀寫自己；admin 可讀全部。
- JWT 來源：Firebase ID Token 透過 Supabase 的 Third-Party Auth Bridge（或自建一個 `/api/supabase-token` Route Handler 用 service role 簽 JWT，並把 `firebase_uid` 寫進 sub）。

**業主需提供：**
- Supabase 專案 URL + anon key + service role key（加入 `.env.local`、Netlify env vars）。

---

### 2. 球場 Google Maps 地圖 PIN 點

**新增/修改：**
- 新增 `components/CourtsMap.tsx` —— 用 `@vis.gl/react-google-maps`（官方 React wrapper，輕量、支援 Next.js）。輸入 `courts: Court[]`，渲染地圖、PIN、InfoWindow，點 PIN 顯示球場名片，可連到 `/court/[id]`。
- 修改 `components/CourtsExplorer.tsx` —— 上方加 tab：「列表 / 地圖」，地圖模式渲染 `<CourtsMap>` 並傳入已篩選後的 courts。
- 新增 `lib/googleMaps.ts` —— 包裝 `loadGoogleMapsScript`（用 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY），含 SSR 保護。

**Key 限制：** API key 在 GCP 限制 `HTTP referrer = jojotennis.com, *.netlify.app, localhost`；本期不用 Places API（球場資料是站內），只用 Maps JavaScript API + Marker。

**業主需提供：**
- GCP 專案、啟用 Maps JavaScript API、產出受限 API key。

---

### 3. 球場圖片輪播（Cloudinary）

**Schema 變更：**
- `courts.images` 改為 `jsonb` 陣列，存 `{ publicId: string, caption?: string, sortOrder: number }`，圖片實體存 Cloudinary（folder：`courts/{courtId}/`）；URL 由 Cloudinary SDK 動態組成，支援即時轉檔。

**新增/修改：**
- 新增 `src/lib/cloudinary.ts` —— Cloudinary client wrapper：`uploadSigned(file, folder)`、`getOptimizedUrl(publicId, { width, format })`、`deleteAsset(publicId)`；後端走 signed upload preset，前端不直接持有 API secret。
- 新增 `app/api/cloudinary/sign/route.ts` —— 簽發 signed upload params（含 folder、tags、eager transformation），由前端拿到後 POST 到 Cloudinary。**Route Handler 必須 `export const runtime = 'nodejs'`**（`cloudinary` SDK 需 Node 環境）。
- 新增 `app/api/cloudinary/delete/route.ts` —— 後端用 API secret 呼叫 Cloudinary destroy API 刪檔；前端只送 publicId、不直接持有 secret。同樣 `runtime = 'nodejs'`。
- 新增 `components/CourtImageCarousel.tsx` —— 左右滑動 + 縮圖，無第三方依賴（純 CSS scroll-snap + 鍵盤左右鍵）；給 4–10 張圖最佳體驗；用 `<img srcset>` 拉 Cloudinary 多尺寸 URL（`f_auto,q_auto,w_400/800/1600`）。
- 新增 `app/court/[id]/page.tsx`（**從零建**——既有 `app/court/[id].tsx` 是 Expo 遺留，不要動）：球場詳細頁，頂部 `<CourtImageCarousel>`、嵌入 §2 的單點地圖；沒有圖時顯示預設佔位圖（`public/court-placeholder.svg`）。同步在主導覽列補上連結。
- 修改 `app/admin/courts/page.tsx` —— 表單新增「圖片管理」區塊：多檔上傳、排序、刪除；上傳流程：取 signed params → POST Cloudinary → publicId 寫回 Supabase `courts.images`。**注意**：該檔目前是 ~285 行的 inline 單一表單元件，圖片管理區塊建議拆出獨立 `<CourtImagesAdminPanel>` 元件並用 zustand 或 `useReducer` 管狀態，避免一個元件失控膨脹。
- 球具評測封面（`equipment_reviews.cover_image_public_id`，見 §4）與會員頭像（`users.avatar_public_id`）同樣改走 Cloudinary，DB 只存 publicId，URL 在 render 時用 Cloudinary SDK 動態組（換 cloud / 加 transformation 不用改 DB）。

**Cloudinary 設定（業主需在 Dashboard 完成）：**
- 採後端 API signing（每次請求由後端用 secret 簽參數），**不使用 upload preset**，因此 Cloudinary 端不必另建 preset。
- 設定 folder 結構：`courts/`、`reviews/`、`avatars/`。
- 設定自動 backup（Settings → Account → Auto-backup，可選）。

---

### 4. 社團 → 球具評測 重構

**Schema 變更：**
- 新增 Supabase 表 `equipment_reviews`：
  - `id uuid pk`
  - `title text`、`slug text unique`、`category text`（拍/線/鞋/握把）
  - `brand text`、`model text`
  - `cover_image_public_id text`（Cloudinary publicId）、`gallery jsonb`（陣列：`[{ publicId, caption?, sortOrder }]`）
  - `content_md text`（Markdown 本文，內嵌圖片以 Cloudinary URL 呈現）
  - `author_uid text`、`is_published bool`、`published_at timestamptz`
  - `view_count int`、標準時間戳
- 後台編輯器內嵌 `<CloudinaryImagePicker>` 元件，使用 §3 的 signed upload 流程；內文 Markdown 內的 `![alt](publicId)` 由 mdast plugin 在 render 時轉成 Cloudinary CDN URL（含 `f_auto,q_auto`）。

**路由變更：**
- 新增 `app/reviews/page.tsx` —— 列表頁，支援分類過濾。
- 新增 `app/reviews/[slug]/page.tsx` —— 詳細頁，渲染 markdown。
- 新增 `app/admin/reviews/page.tsx` —— 編輯後台，沿用 `app/admin/news/page.tsx` 模式（既有編輯器、Storage 上傳已可重用）。
- 主導覽列 `<HeaderStatus />` / 底部 tab：把「社團」改為「球具評測」並 routes 指向 `/reviews`。
- 保留 `app/(tabs)/club/page.tsx` 一段時間並改為 redirect 至 `/reviews`，避免外部連結 404。

**舊資料處理：**
- `clubs`、`club_members`、club-type `conversations` 在 Firestore 軟刪除（不真實刪），管理員後台 `/admin/clubs` 保留只讀以備查。
- **`useFirebaseConversationListeners` 必須過濾 `id.startsWith('club_')` 的 conversation**，否則即使 `clubs` 軟刪後，這批 conversation row 仍會出現在使用者的對話列表（會點開找不到對應 club 頁面）。同時 `inboxService` 也要過濾 club-type message thread。
- `clubService.ts` 全部 deprecate，UI 不再呼叫。
- `data/mock_clubs.json` 不刪（純參考資料）。

---

### 5. LINE Login

**新增：**
- `src/lib/lineAuth.ts` —— LINE Login OAuth2 流程：`getLineLoginUrl(state, nonce)`、`exchangeCodeForToken(code)`、`getLineProfile(accessToken)`、`getLineEmail(idToken)`（解 OpenID ID Token 拿 email，需 channel 開 Email scope）。
- `app/api/auth/line/callback/route.ts` —— Route Handler：收 LINE 回傳 `code`，用 LINE channel secret 換 token、抓 profile + email、用 Firebase Admin SDK `createCustomToken(uid='line_${lineUserId}', { provider: 'line' })`（把 provider 寫進 custom claims，讓 Firestore rules / 前端 ID token 都查得到），並把 profile 上 sert 到 Supabase `users`；最後 redirect 回 `/auth?token=...` 讓前端 `signInWithCustomToken`。**`runtime = 'nodejs'`**（Firebase Admin SDK 需 Node）。
- `app/api/auth/line/login/route.ts` —— 產生 state/nonce，導去 LINE 授權頁。
- 修改 `app/auth/page.tsx` —— 加「使用 LINE 登入」按鈕，呼叫 `/api/auth/line/login`。
- 修改 `src/lib/authService.ts` —— 加 `loginWithLineCustomToken(token)`。
- **新增 `src/lib/firebaseAdmin.ts`（server-only 獨立模組）** —— Firebase Admin SDK 初始化。**注意：不要塞進根目錄 `lib/firebase.ts`**，因為該檔有 `typeof window !== 'undefined'` 保護、本來就是 client init；混入 Admin 會被 Next bundler 試圖打包進 client 而 build fail。實作：
  ```ts
  import 'server-only';   // 確保被 import 進 client 時 build 就直接報錯
  import { cert, getApps, initializeApp } from 'firebase-admin/app';
  import { getAuth } from 'firebase-admin/auth';
  import { getMessaging } from 'firebase-admin/messaging';

  const app = getApps()[0] ?? initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SA_JSON!)),
  });
  export const adminAuth = getAuth(app);
  export const adminMessaging = getMessaging(app);
  ```
  所有需要 `createCustomToken` / `send` 的 Route Handler 改 import 自此檔。

**會員合併策略：**
- 同一人若先用 Google 後用 LINE 會產生兩個 uid。會議結論：**接受兩個 ID**，會員列表用 tag 標示來源（`provider: 'google' | 'line' | 'password'`）。Supabase `users` 加 `provider` 欄位；同時透過 Firebase Custom Claims 寫入 `provider`，避免 Firestore rules 端要回查 Supabase。
- **Custom Claims 寫入後，前端需強制 `user.getIdToken(true)` 一次才能拿到新 claim**；LINE callback redirect 回前端後，`signInWithCustomToken` 完成的下一步就要 force-refresh ID Token。
- **`firestore.rules` 也要對應更新**：現行 rules 只檢查 `request.auth != null`；若要利用新 claim（例如限制 admin-only 寫入），需新增 `request.auth.token.is_admin == true` 之類條件，否則 claim 寫了等於白寫。本期至少把 `is_admin` claim 同步寫入並更新 rules（既有 `adminEmails` 機制可保留，但 rules 改用 claim 比讀 Firestore `admin_emails` collection 更省一次 round-trip）。
- 不做自動 link（避免帳號劫持風險）；之後若要，由使用者在 Profile 頁手動「連結 LINE」。

**業主需提供：**
- LINE Developers Console → Provider 與 Channel（Login type）、Channel ID、Channel Secret、Callback URL 註冊。
- **LINE Channel 申請開啟 Email scope**（需上傳「個資使用同意」PDF，審核 1–3 個工作天）；沒開的話拿不到 email，§9 歡迎信就寄不出去。
- Firebase Admin Service Account JSON（GCP Console 取得），加進 Netlify env vars。

**LINE 計費備註（給開發方知曉）：**
- **LINE Login**（本期使用）— **完全免費**，無使用量限制。
- **LINE Messaging API**（本期**不使用**）— 若未來 Sabrina 想用 LINE 官方帳號 broadcast 訊息給會員，計費為：免費 200 則/月、超出最低 NT$ 800/月（中用量含 3,000 則）。本期推播以 FCM 為主，避免進入 LINE 計費。
- 任何「LINE 通知」需求出現時，先確認是「Login」還是「Messaging push」——前者免費、後者計費。

---

### 6. PWA 改造（installable、icon、splash、Service Worker）

**套件選型：**
- 使用 **`@serwist/next`**（next-pwa 已停更、官方推薦繼任者，原生支援 App Router 與 Next 14）。
- Service Worker 由 `@serwist/next` 產生，以 Workbox v7 為核心。

**新增/修改：**
- `next.config.mjs` —— 用 `@serwist/next` 的 `withSerwist` HOF 包裝 `nextConfig`（既有 next.config 目前是 plain object，需轉成被 HOF 包過的形式）：
  ```ts
  import withSerwistInit from '@serwist/next';
  const withSerwist = withSerwistInit({
    swSrc: 'app/sw.ts',          // §7 FCM handler 也寫進這個檔
    swDest: 'public/sw.js',
    cacheOnFrontEndNav: true,
    reloadOnOnline: true,
    disable: process.env.NODE_ENV === 'development', // dev 不啟 SW 避免快取礙事
  });
  export default withSerwist({ /* 原本的 nextConfig */ });
  ```
  Caching strategies 寫在 `app/sw.ts` 內的 `defaultCache`（serwist 提供現成 preset）+ 自訂 routes：
  - 靜態資源 (`/_next/static`、字體、圖片) → `CacheFirst`
  - API 路由 → `NetworkFirst` 含 timeout fallback
  - HTML 文件 → `NetworkFirst` 不快取個人化資料
- 新增 `app/sw.ts` —— **同時是 Serwist SW 入口與 FCM background message handler（§7 使用）**，兩者共用同一個 SW 檔，避免 dual-SW 衝突。骨架：
  ```ts
  import { defaultCache } from '@serwist/next/worker';
  import { Serwist } from 'serwist';
  import { initializeApp } from 'firebase/app';
  import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

  declare const self: ServiceWorkerGlobalScope;

  // Serwist precache + runtime caching
  const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: defaultCache,
  });
  serwist.addEventListeners();

  // FCM background push（與 Serwist 共存）
  const app = initializeApp({ /* 6 個 NEXT_PUBLIC_FIREBASE_* config */ });
  const messaging = getMessaging(app);
  onBackgroundMessage(messaging, payload => {
    self.registration.showNotification(payload.notification?.title ?? '', {
      body: payload.notification?.body,
      icon: '/icons/icon-192.png',
      data: payload.data,
    });
  });

  self.addEventListener('notificationclick', e => {
    e.notification.close();
    const url = (e.notification.data as { url?: string })?.url ?? '/';
    e.waitUntil(self.clients.openWindow(url));
  });
  ```
  **重點**：`firebase/messaging/sw` 是專門給 SW context 用的 subpath；不要寫成 `firebase/messaging`（那是 client）。
- 改 `public/site.webmanifest` —— 補齊 PWA 必填欄位：`name`, `short_name`, `start_url=/`, `display=standalone`, `background_color`, `theme_color=#0D9488`（或對應 brand 色），`icons`（192, 512, 512 maskable）。
- 新增 `public/icons/` —— PWA app icon set：
  - `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`
  - `apple-touch-icon-180.png`（iOS 首頁圖示，必要）
  - `apple-splash-*.png`（iPhone/iPad 各尺寸開機畫面，避免白屏）
- 改 `app/layout.tsx` —— `<head>` 加：
  ```html
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="theme-color" content="#0D9488" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="JoJo Tennis" />
  <link rel="apple-touch-startup-image" href="/icons/apple-splash-..." media="..." />
  ```
- 新增 `components/InstallPrompt.tsx`：
  - **Android / Chrome / Edge**：監聽 `beforeinstallprompt` event，主畫面顯示「安裝 App」按鈕，點擊呼叫 `prompt()`。
  - **iOS Safari**：偵測 `navigator.userAgent` + `'standalone' in window.navigator`，若是 iOS 且未 standalone，**首訪 + 第 3 次訪問**才顯示「加到主畫面」教學浮層（分享圖 ↑ → 加到主畫面），帶截圖示意；可關閉，記到 localStorage 避免騷擾。
- 改 `app/globals.css`（或 Tailwind） —— 全頁加 `env(safe-area-inset-*)` padding 處理 iPhone 瀏海與 Home Indicator；底部 tab bar 加 `padding-bottom: env(safe-area-inset-bottom)`。
- 改 `tailwind.config.ts` —— 加 `safe-*` utilities（或用 `tailwindcss-safe-area` plugin）。

**iOS Safari 適配補強：**
- 表單 input 字級 ≥ 16px 防 iOS auto-zoom。
- 100vh fix：用 `100dvh` + fallback `100vh`，避免 iOS 底欄遮擋。
- `webkit-touch-callout: none` 在按鈕上避免長按彈圖。
- 主要互動元素點擊區 ≥ 44×44pt。

**iOS Web Push 系統下限：**
- **iOS 16.4 以上**且**已加入主畫面**才能 `Notification.requestPermission()` 與接收 push（iPhone 8 之後機型皆可升級到 16.4+，但仍有少數舊機卡在 15.x）。
- `<InstallPrompt>` 偵測到 iOS < 16.4 時，改顯示「請先將系統升級至 iOS 16.4 以上才能收到推播通知」說明，不要繼續走「加到主畫面」流程徒勞無功。

---

### 7. 推播通知（FCM）

**架構：**

```
[Firebase Auth 使用者]
   ↓ requestPermission() + getToken(messaging, {vapidKey})
[FCM token 寫入 Supabase: fcm_tokens table]
   ↓
[事件發生 (Firestore trigger 或 Route Handler)]
   ↓ Firebase Admin SDK → send(message, token)
[Service Worker onBackgroundMessage → 系統推播]
```

**新增檔案：**
- `src/lib/messaging.ts` —— Browser 端：`requestNotificationPermission()`、`registerFcmToken()`、`onForegroundMessage(handler)`。**`getToken()` 必須帶 `{ vapidKey, serviceWorkerRegistration }` 兩個參數**，把 Serwist 註冊的 SW 傳進去；不傳會讓 Firebase SDK 嘗試自動註冊 `/firebase-messaging-sw.js`，與 Serwist 的統一 SW 衝突。
- `app/sw.ts` 內補上 `firebase-messaging-sw` 對等的 `push` handler：
  - 在 SW 內 `import { initializeApp } from 'firebase/app'` + `import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'`（`/sw` subpath，不是 client `firebase/messaging`）。
  - `initializeApp` 用既有 client config（與主程式相同 6 個 env vars）。
  - `onBackgroundMessage(messaging, payload => self.registration.showNotification(...))`。
  - 自訂 `notificationclick` handler 開啟對應深連結，例如 `/matches/{id}` 或 `/messages?conv={id}`。
- `src/lib/notificationTriggers.ts`（伺服器）—— 抽象的 `notifyUser(uid, payload)`，內部用 Firebase Admin SDK 把訊息送到該 uid 的所有 FCM tokens；token send 失敗（`messaging/registration-token-not-registered`）時自動從 `fcm_tokens` 刪除。
- `app/api/notify/match-application/route.ts` —— 約打申請與回覆事件的 Route Handler（由 `matchService` mutators 在寫入後 fetch 觸發）。**`runtime = 'nodejs'`**。
- `app/api/notify/chat-message/route.ts` —— 即時聊天事件。會由 `sendChatMessage` 於 client 送訊息後 POST 觸發；同時保留現有 Firestore listener 在前景顯示 UI。**`runtime = 'nodejs'`**。
- `app/api/fcm/register/route.ts` / `app/api/fcm/unregister/route.ts` —— 寫入 / 刪除 `fcm_tokens` row（登入後寫入、登出刪除）。`runtime = 'nodejs'`。

**Schema 變更（Supabase）：**
- 新增 `fcm_tokens` 表：`(token text pk, uid text fk, device text, last_seen_at timestamptz)`；登入後寫入、登出刪除。

**前端整合：**
- 新增 `components/EnableNotificationsButton.tsx` —— 在 Profile 頁與聊天頁首次互動處顯示「開啟通知」按鈕（必須 user gesture）；按下 → `Notification.requestPermission()` → `getToken()` → POST 到 `/api/fcm/register`。
- 不要在頁面載入時自動 `requestPermission`（iOS 與 Chrome 都會拒絕並黑名單）。
- `AppContext` 在使用者已 grant 時，掛 `onMessage` 顯示前景訊息浮層；不重複顯示作業系統通知。

**觸發點修改（本期兩個事件）：**
- `src/lib/matchService.ts` 的 `applyMatch` / `respondToApplicant` 寫入成功後，呼叫 `/api/notify/match-application`，後端讀對方 uid → `notifyUser`。
- `src/lib/messageService.ts` 的 `sendMessage` 寫入成功後，呼叫 `/api/notify/chat-message`；後端讀 conversation participants（排除自己）→ `notifyUser`，內文截斷 60 字。

**業主需提供：**
- Firebase Console → Cloud Messaging → 取得 **VAPID public key**（給瀏覽器端 `getToken`）。
- Firebase Service Account（已在 §5 申請）已含 FCM 權限，可重用。
- App icon 與 splash 設計素材（或開發方代為製作標準色塊版）。

---

### 8. 約打評論系統（host ↔ player 雙向 + 參加率）

**情境：** 每個 `matches/{matchId}` 對應一個 `conversations/match_${matchId}` 聊天室；當約打日期過後，host 與 accepted players 互相評分，最後在使用者頭像旁顯示一個「參加率」。

**Schema（Supabase）：**

```sql
match_reviews (
  id uuid pk,
  match_id text,           -- 對應 Firestore matches.matchId
  match_date timestamptz,
  reviewer_uid text,
  reviewee_uid text,
  direction text,          -- 'host_to_player' | 'player_to_host'
  attended bool,           -- 僅 host_to_player 有意義；player_to_host 固定 true
  excused bool default false,  -- 「請假/正當理由」勾選；不計入分母
  stars int check (1<=stars<=5),
  comment text,
  created_at timestamptz default now(),
  unique (match_id, reviewer_uid, reviewee_uid)
)

match_attendance_obligations (
  match_id text,
  participant_uid text,
  role text,               -- 'host' | 'player'
  match_date timestamptz,
  status text,             -- 'pending' | 'attended' | 'no_show' | 'cancelled' | 'host_cancelled' | 'early_withdrawn'
  evaluated_at timestamptz,
  primary key (match_id, participant_uid)
)
```

**核心規則（已確認）：**

1. **參加率公式（貝氏平滑）：**
   ```
   attendance_rate = (attended_count + 3) / (obligation_count + 4)
   ```
   - 分子 = 被 host 評為「有到」的場次（含「7 天緩衝預設出席」自動填補）。
   - 分母 = 該使用者所有「已過期 + 非豁免」的應到場次。
   - **未滿 5 場**：頭像旁顯示「新會員」徽章，不顯示百分比。
   - **滿 5 場**：顯示百分比（例 89%），點開可看「最近 N 場詳細」。

2. **Host 評論緩衝期：**
   - `match_date + 7 days` 後仍未評者，cron job 自動把該 obligation status 設為 `attended`、`match_reviews` 補一筆 `auto_filled=true, stars=null` 的紀錄。
   - 補填後 host 仍可在後台手動覆寫（用於補評星級）。

3. **Player 早退規則（48h）：**
   - Player 在 `match_date - 48h` 之前主動退出 → obligation status = `early_withdrawn` → 不計入分母。
   - `< 48h` 退出 → status = `no_show` → 計入分母且 attended=false。
   - Host 評論時可勾「正當理由」覆寫上面結果。

4. **Host 取消整場：**
   - obligation 全員 `host_cancelled`，不計入 player 分母；但會計入 host 的「履約率」分母。

5. **Host 履約率（替代「參加率」對 host 的意義）：**
   ```
   fulfillment_rate = (held_count + 3) / (opened_count + 4)
   ```
   - 分子 = 如期舉辦的場次（不含 host 自己取消的）。
   - 分母 = host 開過的所有約打。

**評論觸發 UX：**

- **約打日期過後**，聊天室頂端固定 banner：「這場約打結束了——點此評論你的隊友」。
- **Host 視角**：banner 點開 → 列出所有 accepted players，每個 player 一張卡：「有出席？✅／❌／🤒 請假」 + 1–5 星 + 可選評論。
- **Player 視角**：列出 host 一人 → 1–5 星 + 可選評論（沒有「有沒有出席」勾選）。
- **互看評論**：點對方頭像 → Profile 頁顯示參加率 / 履約率 + 該 user 收到的星評平均（雙重指標）。**個別評論內容預設不公開**，避免私訊化的評論變成糾紛源頭——只顯示**聚合分數**，個別 review row 僅本人與管理員可見。

**新增/修改檔案：**

- `supabase/migrations/0002_match_reviews.sql` —— 上方 schema。
- `src/lib/reviewService.ts` —— `submitReview()`、`getAttendanceStats(uid)`、`getFulfillmentStats(uid)`、`computeBayesianRate()`。
- `app/api/cron/auto-fill-attendance/route.ts` —— 實際工作邏輯：找 `match_date < now() - 7d` 且 status='pending' 的 obligation，全部設為 attended；同時順手清理 `fcm_tokens` 中 `last_seen_at` 超過 60 天的 row。`runtime = 'nodejs'`；用 `CRON_SECRET` 標頭驗證來源、避免被外部呼叫。
- `netlify/functions/auto-fill-attendance.ts` —— **Netlify Scheduled Function**（非 Next.js route handler），export `config = { schedule: '0 3 * * *' }`，內部 `fetch('${APP_BASE_URL}/api/cron/auto-fill-attendance', { headers: { 'x-cron-secret': process.env.CRON_SECRET } })`。**注意**：`@netlify/plugin-nextjs` 不會把 App Router `route.ts` 當成 scheduled function；排程必須走 `netlify/functions/` 路徑，由它 fetch API route 才會被 cron 觸發。
- `components/MatchReviewBanner.tsx` —— 聊天室頂部 banner，過期才顯示，點擊開啟 modal。
- `components/MatchReviewModal.tsx` —— 雙視角共用元件，根據 `currentUserRole` 切換表單。
- `components/UserStatsBadge.tsx` —— Profile 頁與聊天室名單用，顯示「參加率 / 履約率 + 平均星評」。
- 修改 `src/lib/matchService.ts` 的 `applyMatch` / `respondToApplicant` / 新增 `cancelMatch` / `withdrawFromMatch`，在每一個關鍵動作後 upsert 對應的 `match_attendance_obligations` row。
- 修改 `app/(tabs)/profile/page.tsx` 與 `components/ProfileDashboard.tsx`：頭像旁加 `<UserStatsBadge>`。（路徑提醒：`app/profile/page.tsx` 不存在；profile 在 `(tabs)` group 下。）
- 修改 `app/matches/[id]/page.tsx`：嵌入 `<MatchReviewBanner>`。

**保護機制：**

- 同一 match 同一對 reviewer-reviewee 只能評一次（Supabase unique constraint）。
- Reviewer 必須是該 match 的 host 或 accepted player（在 Route Handler 用 service role 驗證 obligation 表）。
- 星評極端值（連續多筆 1 星 / 5 星 by same reviewer）將標記，但本期不做風控動作（紀錄為主）。
- 評論文字過濾：本期僅做基本長度限制（≤ 300 字）與最簡 profanity list；正式風控列入下期。

**冷啟動：** 既有歷史約打沒有 obligation 紀錄 → 在 migration 時（注意：既有 `Match` schema 的日期欄位是 `date: string`（YYYY-MM-DD），status 是 `'open' | 'closed' | 'cancelled'`，**沒有 `completed` / `matched`** — 用 `date` 對 `today()` 判斷新舊）：
- 對 `date < today()` 的 match（已過期，不論 status）：補 obligation，status 設 `attended`、`auto_filled=true`，讓老會員不會一開始就「無紀錄」。
- 對 `date >= today()` 且 `status='open'` 的 match（進行中 / 未來）：也補 obligation，obligation 表 status='pending'，否則之後 §7 的 trigger 沒有 row 可 upsert，會默默漏資料。
- `status='cancelled'` 的 match：不補 obligation。

---

### 9. Email 通知系統（Resend + React Email）

**架構：**
- **發信服務商**：Resend（API 簡潔、免費 3000/月，足夠初期）。
- **模板引擎**：React Email（Resend 同團隊產品，typed components、可預覽、cross-client CSS 已調好）。
- **觸發方式**：Route Handler / Server Action 寫入後同步呼叫 `sendEmail`，重大事件失敗時記錄到 Supabase `email_log` 以便重送，不阻塞主流程。

**新增檔案：**
- `src/lib/emailClient.ts` —— Resend client 初始化 + `sendEmail({to, subject, react, tags})` 包裝；含 retry（最多 2 次）、結果寫 `email_log`。
- `emails/` 目錄（React Email 規範）：
  - `emails/_layout.tsx` —— 共用排版（logo、footer、退訂連結、社群連結）。
  - `emails/Welcome.tsx` —— 新會員歡迎信（包含驗證 Email 連結、品牌介紹、CTA「立即找球場」「立即發約打」）。
  - `emails/MatchApplicationToHost.tsx` —— 「{playerName} 申請了你的約打」+ 申請者基本資料 + 「前往審核」CTA。
  - `emails/MatchAcceptedToPlayer.tsx` —— 「你的申請被接受」+ 約打詳情（時間、球場、host LINE）+ 加入聊天室 CTA。
  - `emails/MatchRejectedToPlayer.tsx` —— 婉拒信（友善口吻、推薦其他相似約打）。
  - `emails/AdminBroadcast.tsx` —— 通用公告模板（標題 + Markdown 內容 + 圖片 + 1–2 個 CTA）。
- `app/api/email/welcome/route.ts` —— 由 `registerWithEmail` / `loginWithGoogle` 首次建立 user profile 時呼叫。**`runtime = 'nodejs'`**（`resend` SDK 需 Node）。
- 既有 `src/lib/matchService.ts` 修改：`applyMatch`、`respondToApplicant` 寫入完成後同時呼叫對應 `app/api/email/match-*/route.ts`（同樣 `runtime = 'nodejs'`）。
- `app/admin/broadcast/page.tsx` —— 新後台頁：選 region/角色/全體 → 寫文案（內建 Markdown 編輯器）→ 預覽 → 排程或立即發送。後端走 `app/api/email/broadcast/route.ts`（`runtime = 'nodejs'`），分批 100 封一次發以免單次 API 過載。

**Schema（Supabase）：**

```sql
email_log (
  id uuid pk,
  to_email text,
  to_uid text,
  template text,           -- 'welcome' | 'match_application' | 'match_accepted' | 'match_rejected' | 'admin_broadcast'
  resend_id text,
  status text,             -- 'sent' | 'failed' | 'bounced' | 'complained'
  error text,
  meta jsonb,              -- 模板 props
  created_at timestamptz
)

email_preferences (
  uid text pk,
  welcome bool default true,
  match_events bool default true,
  admin_broadcast bool default true,
  unsubscribed_all bool default false,
  unsubscribed_at timestamptz
)
```

**退訂與合規：**
- 每封信底部都有「修改通知偏好」與「全部退訂」連結，連到 `/profile/email-preferences`。
- 全部退訂連結用 signed token（避免被惡意點擊取消他人訂閱），到 Route Handler 後設 `unsubscribed_all=true`。
- 發信前都檢查 `email_preferences`；不重複寄已退訂者。
- Resend webhook (`app/api/webhooks/resend/route.ts`) 監聽 `email.bounced` / `email.complained` → 自動標記 `email_log.status` 並設 `email_preferences.unsubscribed_all=true`（保護 sender reputation）。
- **Webhook 簽章驗證注意事項**：Resend 用 Svix HMAC 簽 raw body。Next.js App Router 中**必須 `await request.text()` 取得 raw string 後再 `JSON.parse`**，不能用 `request.json()`（會丟失原始 byte 順序導致 signature mismatch）。`runtime = 'nodejs'`；驗章用 `RESEND_WEBHOOK_SECRET`。

**寄件人設定：**
- From: `JoJo Tennis <hello@jojotennis.com>`，Resend 必須驗證 DNS（SPF + DKIM + DMARC）。
- 業主需在 DNS 後台加 Resend 提供的 records。

**與推播（§7）的職責分工：**

| 事件 | Push | Email | 理由 |
|---|---|---|---|
| 即時聊天訊息 | ✅ | ❌ | Email 一日多封噪音大；本期不做 |
| 約打申請（host 收） | ✅ | ✅ | 重要決策點，雙通道確保不漏 |
| 約打被接受/拒絕（player 收） | ✅ | ✅ | 影響後續安排，雙通道 |
| 新會員歡迎 | ❌ | ✅ | 引導 onboarding，email 適合長篇 |
| 管理員公告 | ❌ | ✅ | 群發 push 容易擾民、退訂機制 email 較完善 |

**業主需提供：**
- Resend 帳號 + API key（免費方案足夠初期）。
- DNS 後台存取，設 SPF / DKIM / DMARC（domain authentication）。
- `hello@jojotennis.com` 或對等寄件 email 設定。
- 確認預設的歡迎信文案（可由開發方提供初稿，業主審核 brand voice）。

---

## 重要可重用既有資產

| 既有 | 在新方案中的用途 |
|---|---|
| `src/lib/mappers.ts` 的 `toUi*` | 新的 Supabase row → UI 轉換維持同樣 boundary |
| `src/lib/uiTypes.ts` | UI 型別不動，只改 schema 來源 |
| `app/admin/news/page.tsx` 編輯器 | 完整搬給 `app/admin/reviews/page.tsx`，純內容類 CMS |
| `@tanstack/react-query`（已在 deps） | Supabase 讀取用它做 cache，搭配 Realtime |
| `components/CourtsExplorer.tsx` | 過濾邏輯不動，外加列表/地圖切換 |
| Firebase Storage SDK | **僅留作備援**，新功能不再使用；現有已上傳檔案保留可讀，新上傳改走 Cloudinary |

---

## 不重複實作的提醒

- `app/admin/pending/page.tsx` + `submitPendingCourtReport()` 已存在，**本期不再做新版「球友回報問題」**——既有 UI 已夠用，只需確認也雙寫到 Supabase。
- `components/CourtsExplorer.tsx` 已有「回報球場」modal，**不重做**。
- `news` 的 AI SVG 封面產生邏輯 (`data/news.ts`) 可直接搬到 `equipment_reviews` 預設封面。

---

## 驗證計畫

完工後依序驗證：

1. **DB 雙寫**：
   - 從後台新增一個球場 → 確認 Firestore `courts` 與 Supabase `courts` 都有資料。
   - 從前台讀取 → 確認讀到的是 Supabase 版本（修改 Supabase 行直接生效，Firestore 改動不生效）。
   - 跑 `scripts/migrateFirestoreToSupabase.mjs` → 確認舊資料完整搬遷（球場數一致、欄位無 null 例外）。

2. **Google Maps**：
   - 開 `/courts` → 切到「地圖」分頁 → 看到台北/台中/高雄 PIN 點散佈，點 PIN 開 InfoWindow → 連到正確球場頁。
   - 本地與 jojotennis.com referrer 都能載入（檢查 GCP key 限制）。

3. **圖片輪播 / Cloudinary**：
   - 後台 `/admin/courts` 編輯任一球場 → 上傳 3 張圖（檔案 > 5MB 也能上傳，Cloudinary 自動壓縮）、排序、刪一張 → Supabase `courts.images[].publicId` 寫入正確。
   - 前台 `/court/[id]` 看到輪播，左右切換 OK，無圖時顯示佔位圖。
   - 檢查 srcset：DevTools Network 選不同視窗寬度 → Cloudinary URL 帶不同 `w_` transformation；行動裝置載 400/800 px、桌面載 1600 px。
   - 自動轉檔：Chrome / Safari / Firefox 各自看 `f_auto` 是否分別交付 AVIF / WebP / WebP（Network 看 Content-Type）。
   - 後台刪除圖片 → 呼叫 `app/api/cloudinary/delete/route.ts` → Cloudinary Dashboard 該 publicId 消失；Supabase row 也刪除。
   - 球具評測封面與會員頭像同樣走 Cloudinary，驗證流程同上。

4. **球具評測**：
   - 主導覽列「球具評測」連到 `/reviews`，舊 `/clubs` 自動 redirect。
   - 後台 `/admin/reviews` 新增一篇文章、上傳封面、發佈 → 前台列表 + 詳細頁正常。

5. **LINE Login**：
   - 在 LINE App 內建瀏覽器點「使用 LINE 登入」→ 不跳出、無 Google 阻擋 → 回到 `/profile` 已登入。
   - Supabase `users` 出現 provider='line' 的紀錄，與既有 Google 帳號為**兩筆不同 uid**。
   - logout / login 之間 session 正確切換。

6. **PWA**：
   - Chrome DevTools → Application → Manifest 與 Service Workers 顯示綠燈、Lighthouse PWA 分數 ≥ 90。
   - Android Chrome：網址列出現「安裝」icon，安裝後桌面有 App icon、開啟為 standalone。
   - iOS Safari：分享 → 加到主畫面 → 開啟後**無瀏覽器 UI**、splash screen 正常、safe area 不被瀏海/Home Indicator 遮擋。
   - 第一次訪問 iOS Safari：軟提示「加到主畫面」教學浮層出現一次後 dismiss，第二次進站不再出現（localStorage 行為驗證）。
   - 表單在 iOS 不會被自動 zoom-in。

7. **約打評論系統**：
   - 用 host A 開一場約打、player B 申請並被接受 → match_date 之前在後台直接把日期改成「昨天」模擬到期。
   - 重新整理聊天室 → banner「這場約打結束了」出現。
   - A 點 banner → 看到 B 的評論卡 → 勾「有出席」+ 4 星 + 留言 → 送出。Supabase `match_reviews` 有對應 row、`match_attendance_obligations` B 那筆變成 `attended`。
   - B 同樣對 A 評 5 星 → 雙方 Profile 頁頭像旁顯示 stats badge。
   - 場次未滿 5 場時，badge 顯示「新會員」而非百分比。
   - 跑 `app/api/cron/auto-fill-attendance/route.ts` → 7 天未評的 pending obligation 自動補成 attended。
   - 嘗試對同一場 match 重複送出 review → 收到 unique constraint 錯誤、UI 顯示「已評論過」。

8. **推播通知**：
   - Profile 頁點「開啟通知」→ 瀏覽器原生彈窗 → 允許 → Supabase `fcm_tokens` 有對應 row。
   - 兩個瀏覽器各登入 A、B：A 對 B 的約打發申請 → B 在背景（含關閉分頁）收到 push，點擊跳到 `/matches/{id}`。
   - A 對 B 傳一則聊天訊息 → B 在另一個分頁/裝置收到 push，點擊跳到對應對話。
   - iOS Safari PWA（已加主畫面）：相同流程能收到推播；一般 Safari 分頁則收不到（符合預期，引導加主畫面）。
   - 同使用者已開啟通知後 logout → `fcm_tokens` 該 row 被刪除。

9. **Email 通知系統**：
   - 用新 email 註冊一個會員 → 收件匣收到歡迎信、版面在 Gmail / Outlook / iCloud 都顯示正常。
   - 用 host A 開約打、player B 申請 → A 收到「{B} 申請了你的約打」信件。
   - A 接受 B → B 收到「申請被接受」信，含正確時間/球場。A 拒絕另一申請 → 該申請者收到婉拒信。
   - 後台 `/admin/broadcast` 選「所有北部會員」+ 寫文案 → 預覽 → 寄出 → 抽查 5 位收信者收到、退訂連結點擊有效。
   - 在 Profile 設定關掉「約打通知」→ 再觸發一次申請 → email 不寄、但 push 仍正常。
   - 對某 email 觸發 bounce（用 Resend 測試地址 `bounce@simulator.resend.dev`）→ `email_log` 標記、`email_preferences.unsubscribed_all=true`。

10. **Lint / Build**：
   - `npm run lint` 過。
   - `npm run build` 過（含 Route Handlers 編譯）。
   - `npm run deploy:preview` 跑出 preview URL，手動跑一次上面五項。

---

## 業主需提供清單（影響工期）

| 項目 | 用途 | 阻塞範圍 |
|---|---|---|
| Supabase 專案 + keys | 整個 SQL 雙寫 | §1, §3, §4, §7, §8, §9 全部 |
| **Cloudinary 帳號 + Cloud name / API key / API secret** | 球場照、評測封面、頭像儲存與 CDN | §3, §4 |
| GCP 專案 + Maps API key | Google Maps | §2 |
| Firebase Admin Service Account | LINE Login 簽 custom token + FCM 後端送推播 | §5, §7 |
| LINE Developers Channel | LINE Login | §5 |
| Firebase Cloud Messaging VAPID key | 瀏覽器端 getToken | §7 |
| App icon / splash 設計素材（可由開發方代製） | PWA installable 體驗 | §6 |
| Resend API key + 自有網域 DNS 存取 | 寄送系統信、Domain authentication (SPF/DKIM/DMARC) | §9 |
| 歡迎信 / 公告信文案（開發方可代擬初稿） | Email brand voice | §9 |
| GitHub repo 存取（開發方已有） | 部署 | 全部（已就緒） |
| **Firebase Console 親自操作**：啟用 FCM、產 VAPID、下載 Service Account JSON | §5 §7 §9 之後端 | 開發方無法代勞 |
| **Netlify Dashboard 親自操作**：env vars 設定 | 全部 secret | 開發方無權限，需業主執行 |
| **DNS 後台親自操作**：Resend SPF/DKIM/DMARC | §9 寄信網域驗證 | 開發方無權限 |

業主在這些項目就緒前，開發方可先做：§1 schema 設計與 migration 腳本草稿、§2 component 殼（用 mock key）、§3 圖片輪播 UI + Cloudinary client wrapper（用 dev cloud name）、§4 評測頁 UI + 路由切換、§6 PWA manifest 與 Service Worker 殼、§7 通知 UI 與 hook（推播伺服器端待 Service Account 就緒再串）、§8 評論 schema 與 UI、§9 React Email 模板設計與 Resend client（皆可獨立進行，不被外部 key 阻塞）。

---

## Env Vars 對照清單（給業主貼進 Netlify）

| 變數名稱 | Public/Server | 取得位置 | 用途 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase Dashboard → Project Settings → API | Supabase client 連線 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | 同上 | 瀏覽器端讀 / 受 RLS 保護的寫 |
| `SUPABASE_SERVICE_ROLE_KEY` | server | 同上 | Route Handler 簽 JWT、bypass RLS |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | public | Cloudinary Dashboard 首頁 | 前端組 URL、SDK 初始化 |
| `CLOUDINARY_API_KEY` | server | Cloudinary Dashboard → Settings → Access Keys | 後端 signed upload |
| `CLOUDINARY_API_SECRET` | server | 同上 | 後端 signed upload 簽章 |
| `RESEND_API_KEY` | server | Resend Dashboard → API Keys | 寄信 |
| `RESEND_WEBHOOK_SECRET` | server | Resend Dashboard → Webhooks | 驗證 webhook |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | public | GCP Console → APIs & Services → Credentials | Maps JS API |
| `NEXT_PUBLIC_FIREBASE_API_KEY` 等 6 個 | public | Firebase Console → Project Settings | 既有 Firebase Web SDK |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | public | Firebase Console → Cloud Messaging → Web configuration | FCM `getToken()` |
| `FIREBASE_ADMIN_SA_JSON` | server | Firebase Console → Project Settings → Service accounts → Generate key（整個 JSON 內容貼進來） | Custom token + FCM 後端送推播 |
| `LINE_LOGIN_CHANNEL_ID` | public | LINE Developers → Channel | LINE OAuth flow |
| `LINE_LOGIN_CHANNEL_SECRET` | server | 同上 | 換 access token |
| `APP_BASE_URL` | server | 業主自訂（production = `https://jojotennis.com`） | LINE callback 組 URL、Email 連結、Netlify cron fetch |
| `UNSUBSCRIBE_TOKEN_SECRET` | server | 業主自產生隨機字串 | 簽 Email 退訂連結 |
| `CRON_SECRET` | server | 業主自產生隨機字串 | 驗證 §8 cron API 來源（Netlify scheduled function → API route） |

`NEXT_PUBLIC_` 前綴會打包進 client bundle；其他僅在 Server Action / Route Handler 可讀。Netlify 設定時請對應勾選 scope。

---

## 新增 npm dependencies

本期需新增的套件一次列出，方便 dev 起手 / 業主對帳。**已在 `package.json` 的不再列**（`@tanstack/react-query`、`firebase`、`zustand`、`next` 等）。

**Runtime dependencies：**

```bash
npm i \
  @supabase/supabase-js @supabase/ssr \
  @vis.gl/react-google-maps \
  serwist @serwist/next \
  cloudinary \
  firebase-admin \
  resend @react-email/components \
  remark remark-html gray-matter
```

| 套件 | 章節 | 用途 |
|---|---|---|
| `@supabase/supabase-js` + `@supabase/ssr` | §1 | Supabase client（browser + RSC/Route Handler） |
| `@vis.gl/react-google-maps` | §2 | Google Maps React wrapper |
| `serwist` + `@serwist/next` | §6 §7 | PWA / Service Worker（Workbox v7） |
| `cloudinary` | §3 §4 | 後端 signed upload + delete |
| `firebase-admin` | §5 §7 §9 | LINE custom token + FCM 後端送推播 |
| `resend` + `@react-email/components` | §9 | 寄信 SDK + React Email components runtime |
| `remark` + `remark-html` + `gray-matter` | §4 | 球具評測 Markdown → HTML 渲染 |

**Dev dependencies：**

```bash
npm i -D \
  react-email \
  supabase
```

| 套件 | 用途 |
|---|---|
| `react-email` | 本機 `email dev` 預覽信件模板 |
| `supabase`（CLI） | 本機跑 migration、`supabase gen types typescript` 產 `supabase.types.ts` |

**注意：** `firebase-admin`、`cloudinary`、`resend` 都僅在 server-side（Route Handler / Server Action）引用；client component 不要 import，否則 Next.js bundle 會試圖打包 Node-only 模組而 build fail。

---

## 後續階段預告（不在本期報價內）

- 海外 / 日本分頁與多語（會議結論已確認方向，列為第二期）。
- 廠商 / 教練後台入口（先做雛形給商家看）。
- 簡訊驗證 + 金流串接（待業主完成三方申請）。
- QR Code 分潤、打卡徽章、業配廣告位等商業化模組。
