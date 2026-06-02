# Supabase Setup

本專案目前保留 Firebase Auth，資料主幹逐步改到 Supabase PostgreSQL。

## 必填 Env Vars

前端可公開：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 是新版命名；若只填舊的 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 也可相容。

Server only：

```env
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
SUPABASE_DB_SSL_CA_PATH=data/prod-ca-2021.crt
```

`SUPABASE_DB_URL` 請使用 Supabase Dashboard 的 database connection string。不要 commit 真實密碼。

## CA Cert

Production CA cert 已放在：

```text
data/prod-ca-2021.crt
```

用 `psql` 直連 production database 時建議使用：

```bash
PGSSLMODE=verify-full \
PGSSLROOTCERT=data/prod-ca-2021.crt \
psql "$SUPABASE_DB_URL"
```

如果只是透過 `@supabase/supabase-js` 走 Data API，通常不需要這個 cert。

## 套用 Migrations

目前 migration 檔：

```text
supabase/migrations/0001_init.sql
supabase/migrations/0002_engagement_notifications_email.sql
```

業主尚未把 env vars 加到 Netlify 前，可先在本機或 Supabase SQL Editor 手動執行 SQL。

使用 `psql`：

```bash
PGSSLMODE=verify-full \
PGSSLROOTCERT=data/prod-ca-2021.crt \
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql

PGSSLMODE=verify-full \
PGSSLROOTCERT=data/prod-ca-2021.crt \
psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_engagement_notifications_email.sql
```

## 上線前必做

目前 migration 內有 `prelaunch public write` policies，目的是讓未上線開發期可快速測試。

正式上線前必須改成：

- public read only：`courts/news/equipment_reviews`
- write through server route：後端用 `SUPABASE_SERVICE_ROLE_KEY`
- admin-only write：用 Firebase Admin / Supabase JWT claim 驗證
- 不允許 browser anon key 直接寫入管理資料

Supabase 新表若無法被 Data API 讀到，請檢查 Supabase Dashboard 的 Data API exposure 設定與 SQL grants；RLS 只是列權限，不等於 API exposure。
