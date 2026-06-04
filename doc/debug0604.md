# Code Review — commit 0694894 「Remove non-auth Firebase paths」

## TL;DR

這個 commit 是「移除 Firebase 非 Auth 路徑」遷移的**前半段**：刪除了 client 端 Firestore listener、FCM 路由、Firebase Messaging 程式碼，並把 `/admin/matches` 與 `chat/messages` 改讀 Supabase。但**寫入路徑（matches / match_applications / users / news / student_posts / coaches / pending_courts / adminUsers / inbox messages）完全沒移過去**，全部都還是寫 Firestore。結果是：Supabase 的新表始終是空的，admin 看不到任何 match、match chat 全部 403、公開的揪球列表整片空白。

如果要立刻 ship，這個 commit 不能上線。

---

## 🚨 Blocking Issues

### B1. AppContext 把核心 listener 關掉，但沒有 Supabase 替代品 → 公開頁面全空白
`context/AppContext.tsx:303`
```ts
const enableLegacyFirestoreListeners = false;
useFirebaseCoreListeners(enableLegacyFirestoreListeners, ...);
useFirebaseInboxListener(enableLegacyFirestoreListeners, ...);
```
受影響的 state：`matches / applications / users / newsArticles / studentNeeds / courtReports / adminEmails / messages`。

連帶破壞的頁面（全部讀的就是這些 state）：
- `components/MatchBoard.tsx:91` — `useApp().matches` → `/match` tab 永遠是「目前還沒有揪球」
- `components/HomePageContent.tsx:13` — `openMatches = 0`
- `components/ProfileDashboardContext.tsx` — 我的揪球 / 我參與的揪球都會空
- `app/matches/[id]/page.tsx` — `matches.find(...)` 找不到 → 永遠顯示「找不到球局」
- `app/admin/pending/page.tsx`（依靠 `courtReports` / `studentNeeds` / `adminEmails`）
- 動態授權的管理員（`grantAdminEmail` 寫入 Firestore `adminUsers`）讀不到 → 只剩 hard-coded super admin 能進 `/admin/*`

→ 必修：要嘛新增 Supabase listener/polling，要嘛在這個 commit 不要關 listener。

### B2. matchService 仍 100% 寫 Firestore，但讀取端已改 Supabase → 系統徹底斷裂
`src/lib/matchService.ts:1-16` 仍 import `firebase/firestore`，所有 `createMatch / applyToMatch / cancelMatch / closeMatch / adminUpdateMatchStatus / adminSoftDeleteMatch / runTransaction` 都寫 Firestore；沒有任何 Supabase 寫入。

但消費者已改 Supabase：
- `app/api/admin/matches/route.ts:96` 讀 Supabase `matches`
- `app/api/admin/matches/route.ts:152` PATCH Supabase `matches`
- `app/api/admin/matches/route.ts:177` DELETE Supabase `matches`
- `app/api/chat/messages/route.ts:55,63` 用 Supabase `matches` / `match_applications` 判斷聊天室存取權

實際後果：
- 任何使用者建立揪球 → 進 Firestore → admin 與 chat 的 Supabase 查詢都找不到
- **所有 match conversations 一律 403**：`canReadMatchConversation` 在 Supabase 查不到 owner_uid 也查不到 accepted 申請 → `Forbidden`，連主揪自己都進不了聊天室
- 即使是已存在的舊資料，因為 0005 migration 才剛新增空表，Supabase 也沒任何 row → 全站 match chat 直接死掉

→ 必修：在這個 commit 完成前，要嘛 matchService 同步寫 Supabase（或全面改寫成呼叫 API），要嘛還原 `chat/messages` 的 Firestore 權限檢查 + admin 改用 Firestore 直到 matchService 遷完。

### B3. Migration 0005 RLS 是公開讀寫 → 任何人都能改別人揪球
`supabase/migrations/0005_add_matches_tables.sql:57-71`
```sql
create policy "matches prelaunch public write"
  on public.matches for all using (true) with check (true);
create policy "match applications prelaunch public write"
  on public.match_applications for all using (true) with check (true);
```
Supabase anon key 在前端 bundle 裡（`NEXT_PUBLIC_*`），任何人拿著它就可以：
- 把任何揪球 `is_deleted = true`（達成全站 DoS）
- 改 `owner_uid` 奪取主揪
- 改 `status` 結束別人的揪球
- 直接 INSERT 假揪球

「prelaunch」字面寫在 policy name 不會讓它變安全。雖然目前主流量還沒有 client 走 Supabase（B2 的關係），但這個 RLS 一上線就是攻擊面。

→ 必修：拿掉公開 write policy；service role 本身就 bypass RLS，admin 路徑用 service role 就夠了。等真的有 client 直連 Supabase 寫入時，再加上 `auth.uid()::text = owner_uid` 之類的條件。

### B4. 刪除 `/api/notify/coach-submitted` 但前端呼叫端的程式碼被丟空殼
`components/CoachRegisterClient.tsx`（diff 第 1432–1450 行）原本 fire-and-forget 呼叫 `/api/notify/coach-submitted` 寄申請通知信給申請人 + 管理員。Endpoint 已被刪掉，但替代品（直接呼叫 `/api/email/...`）沒接上。

實際後果：教練申請送出後，**申請人收不到「我們已收到」確認信，管理員也收不到「有人申請待審核」通知信**。流程上看起來成功，但通知靜默消失。

→ 必修：要嘛在 coach submit 流程內就直接呼叫 `sendEmail` 兩封信（建議做法），要嘛新增 Supabase-only 版本的 notify route。順帶移除 `CoachRegisterClient.tsx` 中那個空 try/catch IIFE，目前是死掉的 placeholder。

### B5. CoachPageClient 顯示 seed 資料 → 真實申請的教練全部消失
`components/CoachPageClient.tsx`（diff 第 1410–1416 行）所有 Firestore listener 被刪除，直接 fallback 到 `seedCoaches` 與空的 `studentPosts`。

→ 必修：要走 Supabase 把已通過的教練 / 學員需求拉回來，或維持 Firestore listener 直到下批遷移完成。

---

## 🟡 Non-blocking Issues

### N1. `isMissingMatchesTable` 的 regex 有 escape bug
`app/api/admin/matches/route.ts:82`
```ts
/Could not find the table 'public\\.(matches|match_applications)'|relation .*matches.* does not exist/i
```
JS regex 字面值中 `\\.` 是「反斜線 + 任意字元」，不是 literal `.`。Supabase 訊息實際是 `public.matches`，第一個分支永遠不會 match。所幸 `error.code === "PGRST205"` 的前置檢查先攔住一般情況，但若哪天 Supabase 改錯誤訊息就會直接落 500。

修法：改成 `'public\.(matches|match_applications)'`。

### N2. `subscribeToAllMatches` / `subscribeToMatches` 等變成死碼
`src/lib/matchService.ts:200,224` 的 Firestore 訂閱已沒有呼叫者，但檔案還在用。建議等 B2 一起清。

### N3. Welcome email 模板只剩預設值
`app/api/email/welcome/route.ts:50-56` 移除 Firestore 模板讀取後，沒接 Supabase 也沒接 admin Edit。`/admin/email-templates` 後台改的內容對 welcome 信不會生效。`message-to-coach` 同樣 inline 拔掉模板覆寫。

→ 同步把 email 模板搬到 Supabase 或直接刪除「可在後台改模板」的功能說明，避免管理員以為改了有用。

### N4. `app/api/chat/messages/route.ts` 已被簡化為 Supabase，但檔頭仍未清理過的型別/註解
小事但好讀。

### N5. AppContext 的 `enableLegacyFirestoreListeners` 是 hard-coded local const
應該升為 `lib/config.ts` 的 flag 或環境變數，方便回滾。目前的寫法看起來像實驗未完成。

### N6. `/api/admin/matches` 沒處理 status 大小寫 / trim
PATCH 直接吃 `body.status` 與 check constraint 比對。前端傳 `"closed"` 沒問題，但若有第三方呼叫，目前完全沒驗證。建議在 route 內 whitelist：`if (!["open","closed","cancelled"].includes(body.status)) return 400`。

### N7. `/api/admin/matches` DELETE 後 `deleteRedisConversation(...).catch(() => undefined)` 完全吞錯
失敗時連 log 都沒有。若 Redis 暫時不可用，admin 軟刪除後 conversation 還躺在 Redis 不會被清。建議至少 `console.warn`。

### N8. Migration 缺 `applicant_count` 反正算的 GET 端 OK，但 cursor 性能/順序
`/api/admin/matches` GET 先抓所有 matches、再抓所有 applications，無分頁。資料一多會雷。短期 OK，長期要 cursor。

### N9. `match_applications.id uuid` 與 Firestore `appId` 字串型別不一致
不影響目前路徑（沒有跨庫 sync），但若未來要 Firestore → Supabase 補資料，要先把 schema 改成 text 或重新 UUID 化。

### N10. `app/sw.ts` 仍保留 `firebase/app` 依賴只剩 type
`firebase/messaging/sw` 已拔掉，但 `app/sw.ts` 完全可以省略所有 firebase 相關 import。確認 diff 後是乾淨的——OK。

### N11. PATCH/DELETE 後前端 UI 不會卡
`app/admin/matches/page.tsx` 中 `runMatchAction` 把 `actingMatchId` 放 finally reset，並在 try 內等 `loadMatches`。即使 API 拋錯，按鈕都會解除「結束中…」。**這部分沒有 stuck 風險**，只要 B2 修好讓 admin 真的看到資料。

---

## ✅ 確認 OK 的部分

- `app/api/chat/conversations/route.ts` 已改用 Supabase `users.role === "admin"` 判斷 admin email ✓
- `app/api/chat/messages/route.ts` 對話本體已不再走 Firestore REST ✓
- `app/api/email/broadcast/route.ts` 已改用 Supabase users 列名單 ✓
- `app/api/cron/auto-fill-attendance/route.ts` 移除 `fcm_tokens` 殘留 cleanup（因為 FCM 已棄用）✓
- `src/lib/firebaseAdmin.ts` 只保留 `getAdminAuth()`，正確 ✓
- `src/lib/authService.ts` 移除 Firestore `setDoc(doc(db,"users",...))` 寫入路徑 ✓
- LINE callback 不再寫 Firestore users ✓
- email verification confirm/request 不再寫 Firestore users ✓

---

## 🧪 建議測試項目

部署前必跑：
- [ ] 一般使用者瀏覽 `/match` → 預期會看到空列表（驗證 B1）
- [ ] 一般使用者建立揪球 → 看 Firestore 與 Supabase 各自有沒有 row（驗證 B2）
- [ ] 主揪打開自己揪球的聊天室 → 預期 403（驗證 B2）
- [ ] super admin 開 `/admin/matches` → 預期是空表，因為 Supabase 沒資料（驗證 B2）
- [ ] 用 anon key 直連 Supabase REST `POST /rest/v1/matches` 塞假揪球 → 預期會成功進 DB（驗證 B3）
- [ ] 用 anon key `PATCH` 任意 match 的 `owner_uid` → 預期成功（驗證 B3）
- [ ] 教練註冊送出後 → admin email 收不到通知信（驗證 B4）
- [ ] `/coach` 公開頁 → 只剩 seed coaches，找不到真實申請通過的教練（驗證 B5）
- [ ] 透過 `grantAdminEmail` 動態加的 admin 重新登入 → 預期 `jojo_admin` cookie 不會被 set，middleware 把他踢回首頁
- [ ] 寄 welcome 信 → 確認用預設文案而非 admin 後台改過的版本（N3）
- [ ] `/api/admin/matches` PATCH 改 `status: "anything"` → 預期被 Supabase check constraint 擋下；補上前端 whitelist（N6）

---

# 全 repo Firebase 使用掃描

## 1. 仍引用 `firebase/firestore` 的檔案（21 個）

- `lib/firebase.ts` — 初始化 `db`，**應拆除非 Auth 部分**
- `src/hooks/useFirebaseDataListeners.ts` — Firestore listener 工廠，目前被 `enableLegacyFirestoreListeners=false` 局部關掉（但 conversation listener 仍 enabled，呼叫的是 messageService 的 REST 版本，OK）
- `src/lib/matchService.ts` — **全部 Firestore CRUD，仍是寫入主路徑**
- `src/lib/newsService.ts`
- `src/lib/coachService.ts`
- `src/lib/courtService.ts`
- `src/lib/clubService.ts`
- `src/lib/studentService.ts`
- `src/lib/userService.ts`
- `src/lib/adminService.ts`
- `src/lib/pendingCoachService.ts`
- `src/lib/inboxService.ts`
- `src/lib/heartService.ts`
- `src/lib/seedService.ts`
- `src/lib/emailTemplateService.ts`
- `src/lib/landingSettings.ts`
- `src/lib/pageHeroSettings.ts`
- `src/lib/legalPagesService.ts`
- `src/lib/announcementService.ts`
- `src/lib/softDelete.ts`
- `app/admin/users/page.tsx`（透過 userService）

`firebase/messaging` / `firebase-admin/firestore` / `firebase-admin/messaging`：**0 個**（已乾淨）。

## 2. Dead code vs 真的會被執行

**仍會被觸發（user 瀏覽就可能打 Firestore）：**
- `matchService` — `addMatch / applyMatch / cancelMatch / closeMatch / respondToApplication / removeFromMatch / leaveFromMatch / transferMatchOwnership / joinMatchWithCode` 透過 AppContext mutators 被頁面呼叫
- `newsService` — `useFirebaseConversationListeners` 之外，`subscribeToNews` 雖在 disabled listener 內，但 `saveNewsArticle` 等仍透過 AppContext 被 `/admin/news/[id]/edit/page.tsx` 觸發
- `coachService` — `HeaderStatus.tsx` import `submitPendingCoach` 之類；admin 頁仍會用
- `courtService` — `CourtImagesAdminPanel` / `/admin/courts` / `/court/[id]` 都直接 import
- `clubService` — `ClubPageClient` 直接 `subscribeToClubs`
- `studentService` — AppContext 透過 `createStudentPost` 寫 Firestore
- `userService` — `updateUserProfile / updateUserAdminFields` 透過 AppContext / `/admin/users` 觸發
- `adminService` — `fetchAdminDashboardCounts`（`/admin` 首頁直接呼叫）+ `grantAdminEmail`
- `pendingCoachService` — `CoachRegisterClient` 直接呼叫
- `heartService` — `app/matches/[id]/page.tsx` 直接呼叫
- `emailTemplateService` / `landingSettings` / `pageHeroSettings` / `legalPagesService` / `announcementService` — admin pages 與 landing UI 都有 import
- `inboxService` — AppContext `saveInboxMessage`
- `seedService` — 只在 `npm run seed` 開發腳本

**接近 dead，但仍 import：**
- `softDelete.ts` — `matchService.adminSoftDeleteMatch` 仍呼叫，移走前不能刪
- `useFirebaseDataListeners.ts` 內 core / inbox listener 已被 flag 關掉但檔案本身還在；conversation listener 仍 active（內容已不打 Firestore）

## 3. 瀏覽時會產生 `firestore.googleapis.com` 流量的頁面

只要 **AppContext 內 mutator 被觸發** 或 **頁面直接 import 上面那批 service 的 subscribe**，就會打 Firestore。實際清單：

| 頁面 | 觸發點 |
|---|---|
| `/` (HomePageContent) | 之前 debug 已刪除，目前**乾淨** |
| `/match`（MatchBoard） | 沒讀取 Firestore（matches 空），但點「建立揪球」會走 `addMatch` → Firestore |
| `/matches/[id]` | 進入後若使用者點申請 / 結束揪球 → Firestore；`giveHeart` → Firestore |
| `/coach` | 已切 seed 資料，**乾淨**（但等於壞掉） |
| `/coach/register` | `submitPendingCoach` → Firestore |
| `/clubs`（ClubPageClient） | `subscribeToClubs` listener → Firestore（**這個 commit 沒處理**） |
| `/courts`（CourtsPageClient） | `subscribeToCourts` → Firestore |
| `/court/[id]` | `fetchCourtById` → Firestore |
| `/buddies` | 視 useApp 使用情況 |
| `/profile`（ProfileDashboardContext） | 目前只讀 AppContext.matches（空），**不再直接打 Firestore**。但 `updateProfile` → `updateUserProfileService` → Firestore |
| `/messages` | `sendFirestoreMessage` 但實際 messageService 已走 REST API；OK |
| `/admin` 首頁 | `fetchAdminDashboardCounts` → Firestore |
| `/admin/matches` | **已切 Supabase，乾淨**（但目前看不到資料） |
| `/admin/users` | userService → Firestore |
| `/admin/coaches` | coachService → Firestore |
| `/admin/courts` | courtService → Firestore |
| `/admin/news` + `/admin/news/[id]/edit` | newsService → Firestore |
| `/admin/email-broadcast`, `/admin/email-templates` | emailTemplateService → Firestore |
| `/admin/messages`, `/admin/pending` | 透過 AppContext state，state 為空 → 不打但壞掉 |
| `/news/[slug]` | newsService → Firestore |

額外：`grantAdminEmail` 寫 Firestore `adminUsers`，但 listener 已關 → 寫了沒人讀，動態 admin **不再生效**。

## 4. 建議下一批遷移到 Supabase API 的優先順序

依「壞影響面 × 流量」排序：

1. **matchService**（最緊急；解 B1 + B2）— 把 `matches` / `match_applications` 的 CRUD 全部搬到 Supabase。AppContext 改成讀新的 `/api/matches` (公開) + Realtime（如有）或固定 poll。順手做 owner / applicant 身份 RLS。
2. **adminService.grantAdminEmail + adminEmails 來源** — 改成寫 `users.role = 'admin'`，AppContext 不再讀 `adminUsers` collection；middleware 的 `jojo_admin` cookie 仍由 client 推。
3. **inboxService + useFirebaseInboxListener** — 設計 Redis 或 Supabase `messages` 表；目前 inbox 完全失能。
4. **courtService / pending_courts** — 影響 `/admin/courts` 與 `/courts` 顯示；資料量小，搬移簡單。
5. **coachService + pendingCoachService**（含 N5：CoachPageClient seed 退化）— 加上 `/api/notify/coach-submitted` 替代品（解 B4）。
6. **studentService**（學員需求）
7. **newsService**（影響 `/news` 與 admin 編輯）
8. **userService**（profile update）
9. **emailTemplateService / landingSettings / pageHeroSettings / announcementService / legalPagesService**（cms 類；目前 admin 改的東西失效，但影響面較窄）
10. **clubService**（看是否真的留下來）
11. **heartService / seedService**（最後）

---

# Supabase Migration `0005_add_matches_tables.sql` + `/api/admin/matches/route.ts` 焦點審查

## 1. Schema 欄位 vs 現有 UI Match 型別

Migration 欄位：`id, owner_uid, owner_nickname, title, city, district, venue, date, weekday, start_time, end_time, ntrp_required[], total_slots, filled_slots, status, note, join_mode, join_code, is_deleted, deleted_at, created_at, updated_at`。

對照 `src/lib/schema.ts` / `src/lib/uiTypes.ts` 的 Match：
- 缺：`isPrivate`（如果 UI 還在用）、`reviewed`、`applicants[]`（這個本來就 join 出來）。
- `applicants` 欄位資訊在 GET 用 count map 拼出來，**沒有實際的 applicant nickname / status 細節**。對 admin 列表 OK，但 `/matches/[id]` 詳細頁將來要切 Supabase 時需要另一個 endpoint 返回完整 applicant 陣列。
- `join_code` 沒有 unique constraint。理論上 6 位數字會碰撞，目前空間很大 OK，但若要走「輸入暗號加入」要做唯一性檢查。
- `ntrp_required` 是 `text[]`，但 admin GET 沒帶這欄位（admin UI 不需要 OK）；未來公開 list API 要記得 select。
- `id` 用 `text primary key default gen_random_uuid()::text`，方便沿用 Firestore 既有 id 字串。OK。

## 2. RLS policy 是否過寬

**過寬**：見 B3。`matches prelaunch public write` + `match applications prelaunch public write` 完全等於沒 RLS。

建議：
```sql
drop policy if exists "matches prelaunch public write" on public.matches;
drop policy if exists "match applications prelaunch public write" on public.match_applications;
-- 不要建立 anon write policy；只允許 service role bypass（預設）。
-- 之後若要 client 直連，至少：
-- create policy "match owner write" on public.matches for update
--   using (owner_uid = auth.jwt() ->> 'sub')
--   with check (owner_uid = auth.jwt() ->> 'sub');
```

`matches public read` 的 `using (is_deleted = false)` OK，但要注意：admin 想看 `is_deleted = true` 的會被擋；目前 admin 走 service role 所以 bypass RLS，沒事。但未來若 admin 改 anon key + JWT，要另外開 policy。

## 3. service role query 處理 soft delete / closed 是否正確

- GET：`select ... order by created_at desc`，**沒有過濾 is_deleted**，所以 admin 會看到已軟刪除的，符合頁面說明「含已取消/已刪除揪球」。OK。
- PATCH status：直接 UPDATE，**沒有檢查 status 合法值**，倚賴 DB check constraint；建議在 route 做 whitelist（N6）以給更友善錯誤。
- DELETE（軟刪除）：把 `is_deleted = true, deleted_at = now, updated_at = now`，**沒有同步修改 status**。前端列表仍會顯示 `match.status === "open"` 的軟刪除 row，admin 可能誤以為還活著。建議同時 set `status = 'cancelled'` 或在 UI 過濾 `isDeleted`。
- DELETE 沒有 cascade `match_applications`：DB schema 用 `on delete cascade`，但這是硬刪除才觸發。軟刪除留下一堆殘留的 application rows。若公開 `match_applications` 之後要連接 application count，要記得也軟刪除 application。

## 4. admin DELETE 同步刪 Redis conversation 的失敗處理

```ts
await deleteRedisConversation(`match_${matchId}`).catch(() => undefined);
```
完全吞錯，無 log。若 Redis 掛掉，admin 認為操作成功但 conversation 仍存在，使用者下次能進到一個「主揪/球局已不存在」的聊天室。建議：
```ts
await deleteRedisConversation(`match_${matchId}`).catch((err) =>
  console.warn("[admin/matches] redis cleanup failed:", err)
);
```
或更穩妥：把 Redis cleanup 包進一個重試 queue，避免遺漏。

## 5. PATCH 結束 / 取消 是否讓前端卡在「更新中」/「結束中」

讀過 `app/admin/matches/page.tsx`：
- `runMatchAction` 設 `actingMatchId`、await 動作 → await `loadMatches()` → catch 顯示 alert → finally 把 `actingMatchId` 設 null。
- 所以即使 PATCH 或 loadMatches 拋錯，按鈕都會解除「結束中…」狀態。
- 唯一邊角：若 `getAuthHeaders` 在中間因 token 過期拋錯，alert 訊息會是「請重新登入管理員帳號」，狀態也會正常解除。

**結論：沒有 stuck 風險**，但前提是 B2 修好讓 `loadMatches` 能真的看到 row。

---

## 動作建議

短期（這個 commit 之前要做的事）：
1. 還原 `enableLegacyFirestoreListeners = true`，或同步加上 Supabase listener；
2. 把 0005 的 `prelaunch public write` 兩條 policy 刪掉；
3. `/api/chat/messages` 的 `canReadMatchConversation` 暫時 fallback 到 Firestore 直到 matchService 遷移完；
4. CoachRegisterClient 補回申請通知信邏輯；
5. 把 `isMissingMatchesTable` 的 regex 修掉。

中期（下一個 PR）：
1. matchService 全面 Supabase 化（含公開 list/detail API + 申請流程 API）；
2. adminService 把動態 admin 搬到 `users.role`；
3. 把 inboxService 改寫到 Supabase（或宣告棄用）。

長期：剩下的 service modules（court / coach / news / club / student / cms / hearts）依優先順序逐一遷。
