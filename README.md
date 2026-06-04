# JoJo Tennis

JoJo Tennis 是一個以 Next.js 建置的網球服務平台，包含揪球、球場、教練、會員、新聞、評測、後台管理與聊天室功能。

## Current Architecture

目前專案已完成資料層遷移：

- **Supabase PostgreSQL**：主要資料庫。會員資料、球場、教練、文章、評測、通知 token、排程資料等功能資料皆以 Supabase 為主。
- **Upstash Redis**：聊天室服務。聊天室 metadata 與訊息內容皆走 `/api/chat/*` API 並寫入 Redis，不再使用 Firebase Firestore 儲存聊天室。
- **Firebase Authentication**：僅保留 Google 登入與 Firebase ID token 驗證用途。
- **Firebase 不再作為資料庫使用**：新功能不應新增 Firestore collection、Firestore listener 或 Firestore write path。
- **Resend**：Email 寄送與模板通知。
- **Cloudinary / Supabase Storage**：媒體上傳與圖片資產，依功能模組使用。

## Tech Stack

- Next.js 14 App Router
- React 18
- Tailwind CSS
- Supabase JS
- Upstash Redis
- Firebase Auth
- Resend / React Email
- Vercel 部署

## Local Development

安裝依賴：

```bash
npm install
```

啟動開發環境：

```bash
npm run dev
```

開啟：

```text
http://localhost:3000
```

Production build 檢查：

```bash
npm run build
```

## Environment Variables

本機使用 `.env.local`。正式環境請在 Vercel Environment Variables 設定。

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
```

### Upstash Redis

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CHAT_MESSAGE_TTL_DAYS=7
```

Vercel KV 相容變數仍可作為 fallback：

```env
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

### Firebase Auth

Firebase 僅用於 Google 登入與 token 驗證。

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_ADMIN_SA_JSON=
```

不要新增 Firestore 資料功能。若需要伺服器端驗證 Firebase ID token，使用 Firebase Admin Auth。

### Email

```env
RESEND_API_KEY=
OFFICIAL_SUPPORT_EMAIL=
OFFICIAL_EMAIL_FROM=
```

### App

```env
APP_BASE_URL=
CRON_SECRET=
```

## Data Ownership Rules

- 新資料表、查詢、後台列表與統計應優先使用 Supabase。
- 聊天室列表、聊天室 metadata、訊息讀寫、聊天室刪除應走 Upstash Redis API。
- Firebase 只允許出現在登入、Google OAuth、ID token 驗證或相容舊登入流程中。
- 若發現 Firestore 仍被用於非認證資料，應視為待遷移 legacy code。

## Chat API

聊天室目前由下列 API 管理：

- `GET /api/chat/conversations`
- `POST /api/chat/conversations`
- `DELETE /api/chat/conversations?conversationId=...`
- `GET /api/chat/messages?conversationId=...`
- `POST /api/chat/messages`

Redis key 命名集中在 `src/lib/upstashChat.ts`。

## Supabase Migrations

資料庫 schema 放在：

```text
supabase/migrations/
```

新增或調整 schema 時，請建立 migration 並確認 RLS / grants / Data API exposure 設定正確。

## Admin Notes

後台路徑：

```text
/admin
/admin/users
/admin/matches
/admin/messages
```

管理員判斷由登入狀態與管理員 email 設定控制。後台資料來源應與 Supabase / Redis 保持一致，不應再依賴 Firestore 統計。

## Deployment

專案部署於 Vercel。推送到主分支後由 Vercel 自動部署。

部署前至少執行：

```bash
npm run build
```

## Maintenance Checklist

- 新功能資料表是否已在 Supabase migration 中定義。
- API 是否使用 Supabase service role 或正確的 RLS policy。
- 聊天室是否完全走 Upstash Redis。
- Firebase 是否僅用於 Google Auth / ID token 驗證。
- 後台統計是否和實際資料來源一致。
