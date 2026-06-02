# JoJo Tennis 第一階段改造計畫｜給業主的版本

**日期**：2026/05/30
**對應會議**：2026/05/27 討論會議
**單號**：JOJO-2026-0525-01
**總價**：NT$ 8,800（未稅） / NT$ 9,240（含稅）
**付款狀態**：✅ 業主已完成付款，三方服務申請完成後即進入實作。

> 這份文件是給 JoJo Tennis 業主看的版本，用業務語言寫，避免技術術語。完整的技術版本見 [`renovation-plan-dev.md`](./renovation-plan-dev.md)。

---

## 一、這次改造會帶給網站什麼

1. **資料更穩、未來好擴充**：把網站的核心資料（球場、會員、文章）搬到一個正式的資料庫，未來要加會員、加功能不會卡住。
2. **球場好找、好看**：球場頁面加入 Google 地圖、可以滑動看球場環境照，使用者體驗大幅提升。
3. **討論區轉型成「球具評測」**：原本討論區流量起不來，改成由站方/編輯定期發佈的球具評測內容，會員會願意看、也適合做 SEO。
4. **LINE 一鍵登入**：台灣使用者最熟悉的 LINE，不需要記新密碼。
5. **變成手機 App 一樣的體驗（PWA）**：使用者可以把網站「加到主畫面」，開啟後沒有瀏覽器網址列，跟 App 一樣。
6. **重要事件主動通知**：有人申請你的約打、申請被接受/婉拒、新會員歡迎信，都會自動推播 + 寄 email。
7. **約打評論 + 信譽機制**：約打結束後 host 與 player 互評，建立「參加率」指標，避免放鳥行為、提升 community 品質。

---

## 二、需要業主親自操作的事（重要前提）

**因為開發方目前只有 GitHub 程式碼倉庫的權限，沒有以下 console 的存取權**，所以**所有後台設定都需要業主親自登入操作**。開發方會提供逐步指令，業主依指引操作即可（每項約 5–15 分鐘）。

### 2-1. 需業主申請的兩個新三方服務

| 服務 | 用途 | 業主要做的事 | 急迫度 |
|---|---|---|---|
| **Supabase**（PostgreSQL 資料庫） | 網站的核心資料庫 | 1. 到 supabase.com 用 GitHub 或 Google 登入<br>2. 建立新專案，地區選 **Tokyo (ap-northeast-1)** 或 **Singapore**<br>3. 設一個強密碼（記下來）<br>4. 把專案的 **Project URL** + **anon key** + **service_role key** 三個值新增到 Netlify env vars<br>5. 開發方提供 SQL migration 後，業主貼進 Supabase SQL Editor 執行 | **最高**，影響全部功能 |
| **Resend**（Email 寄送服務） | 寄歡迎信、約打通知、公告信 | 1. 到 resend.com 註冊（建議用公司 email）<br>2. **Add Domain** 加入 `jojotennis.com`<br>3. Resend 會給三筆 DNS records（SPF / DKIM / DMARC），業主到網域註冊商（Cloudflare / GoDaddy / 中華電信等）把這三筆 records 加進去<br>4. 等待驗證通過（通常 5 分鐘 ~ 24 小時）<br>5. 產生一把 API key，加到 Netlify env vars | **高**，影響 email 功能 |

#### 為什麼選 Supabase？

- 業界主流、免費額度足夠初期使用（每月 500MB 資料庫、2GB 流量、5 萬月活躍用戶以內免費）。
- 內建會員權限管控、檔案儲存、即時資料推送，省去自己寫後端的成本。
- 萬一未來要搬家，因為它就是標準 PostgreSQL，搬到 AWS RDS、Google Cloud SQL 都可以。

#### 為什麼選 Resend？

- 寄信穩定、不容易被當垃圾信、開發體驗最好（市場新興主流，許多新創都在用）。
- 每月 3000 封免費（折合每天約 100 封）、付費方案也合理（NT$ 600/月起 5 萬封）。
- 有完整的退訂、bounce 處理機制，符合 email 合規要求。

### 2-2. 既有服務需業主登入做設定

| 服務 | 業主要做的事 | 用途 | 急迫度 |
|---|---|---|---|
| **Firebase Console** | 1. 啟用 **Cloud Messaging**<br>2. 在 Project Settings → Cloud Messaging 取得 **Web Push VAPID key**<br>3. 在 Project Settings → Service accounts → **Generate new private key**（下載 JSON）<br>4. 把 LINE Login callback URL 加到「Auth → Sign-in method → Authorized domains」白名單<br>5. 上傳 VAPID key 與 Service Account JSON 到 Netlify env vars | 推播通知、LINE Login 後端、Email 觸發後端 | **最高** |
| **Netlify Dashboard** | Site settings → Environment variables，按開發方提供清單貼入約 15 個 keys（Supabase ×3 / Resend ×1 / FCM ×2 / LINE ×2 / GCP ×1 / Firebase Admin ×1 / 其他 ×5） | 所有 secret 集中管理處 | **每次拿到新 key 就要做** |
| **GCP Console**（業主 05/27 已準備申請）| 1. 建立 GCP 專案<br>2. **APIs & Services** → 啟用 **Maps JavaScript API**<br>3. **Credentials** → 建立 API key → **Application restrictions** 設 HTTP referrers，加入 `jojotennis.com/*`、`*.netlify.app/*`、`localhost:3000/*`<br>4. 把 API key 加到 Netlify env vars | 球場地圖 | 高 |
| **LINE Developers Console** | 1. 到 developers.line.biz 用 LINE 帳號登入<br>2. 建立 **Provider**（業主名稱）<br>3. 在 Provider 下建立 **LINE Login Channel**<br>4. Channel settings → **Callback URL** 加入 `https://jojotennis.com/api/auth/line/callback`<br>5. 把 **Channel ID** + **Channel secret** 加到 Netlify env vars | LINE 一鍵登入 | 中 |
| **網域 DNS 後台**（中華電信 / Cloudflare 等）| 加入 Resend 提供的三筆 DNS records（步驟 2-1 的 Resend 設定流程）| Email 寄件人驗證 | 與 Resend 同步 |

### 2-3. Secret 安全傳遞建議

- 業主到各家 console 取得的 keys / JSON 檔案，**直接由業主自己貼到 Netlify Environment Variables**，**不必傳給開發方明文**。
- 開發方會提供一份「對照清單」說明每個 env var 名稱、用途、從哪個 console 取得（見專案 `docs/owner-setup-checklist.md`，由開發方產出）。
- 若需要傳遞檔案（例如 Firebase Service Account JSON），建議用 **1Password 或 Bitwarden 共享 vault**；**不要用 email / LINE / Slack 明文傳送**。
- 開發方本機開發用「自己建的測試專案」，不會用到 production 的 keys。

### 2-4. 不影響本期、但仍須業主另行申請

| 服務 | 用途 | 申請時機 |
|---|---|---|
| 圖庫三方 | 站方使用素材 | 業主依需求自行申請 |
| SMS 簡訊驗證（公司行號名義）| 手機驗證 | 下期使用前 |
| ECPay / PayUni 金流 | 信用卡、ATM、LINE Pay、Apple Pay | 下期使用前 |

---

## 三、本期會做的事（NT$ 8,800 含蓋）

1. 把主要資料庫從 Firebase 雙寫到 Supabase（網站不會中斷服務）。
2. 球場 Google Maps 地圖（PIN 點地圖、點 PIN 看球場詳細）。
3. 球場詳細頁加上**圖片輪播**（後台可上傳多張環境照）。
4. 把社團 / 討論區改為「**球具評測**」內容頁，含後台編輯。
5. LINE 一鍵登入。
6. 整個網站變成 **PWA**（可「加到主畫面」當 App 用）。
7. **推播通知**：聊天訊息、約打申請、被接受/婉拒（含 iPhone 適配引導）。
8. **約打評論系統**：雙向星評 + 參加率指標 + 後台管理介面。
9. **Email 通知**：歡迎信、約打事件、後台批量公告功能。

---

## 四、本期不做（未來階段）

- 海外（日本）分頁與多語翻譯
- 廠商 / 教練專屬後台入口（先看雛形）
- 手機簡訊驗證（待業主完成三方申請）
- 金流串接（待業主完成 ECPay / PayUni 申請）
- AI 問答助理
- QR Code 分潤、打卡徽章、會員等級徽章

---

## 五、預計時程與業主里程碑

| 階段 | 主要工作 | 預估時間 | 業主關鍵動作 |
|---|---|---|---|
| **第 0 週（準備）** | 申請 Supabase、Resend、GCP、LINE Channel；啟用 Firebase Cloud Messaging | 3–7 天 | **所有 console 申請 + Netlify env vars 設定**（本期最關鍵的業主工作） |
| **第 1 週** | Supabase 建置、schema 設計、資料雙寫機制 | 7 天 | 在 Supabase 跑開發方提供的 SQL migration |
| **第 2 週** | 球場地圖 + 圖片輪播 + 球具評測重構 | 7 天 | 提供球場環境照（可後補）、確認球具評測首發內容方向 |
| **第 3 週** | LINE Login + PWA + 推播通知 | 7 天 | Firebase Console 確認 FCM 已啟用、Netlify env vars 已含 LINE/VAPID |
| **第 4 週** | 約打評論系統 + Email 通知 + 整合測試 | 7 天 | 確認歡迎信文案、確認 Resend DNS 已驗證 |
| **驗收** | 上線前 Preview 連結 + 業主測試 | 2–3 天 | 業主依驗收清單實測 |

> **時程關鍵假設**：業主能在第 1 週內完成 Supabase + Resend + GCP + LINE 四個申請，並把 keys 貼進 Netlify。若延遲，對應功能會順延（PWA / Email / 地圖功能 dependency 最高）。

### 開發方無權限項目的處理方式

- 開發方**無法**：直接登入業主的 Firebase、Netlify、GCP、DNS 後台。
- 開發方**會做**：提供逐步圖文指令、env var 對照表、SQL 腳本、預先測試完畢的 Preview build。
- 業主**只需**：依指令在對應後台操作（每項約 5–15 分鐘），出問題回報開發方協助 troubleshoot。

---

## 六、驗收方式

完工後，開發方會提供一個 Preview 連結（不影響正式網站），業主依照以下清單實際操作驗證：

1. 在後台新增/編輯一個球場，前台地圖與圖片輪播都正常顯示。
2. 用 LINE 登入註冊一個新會員，收到歡迎信。
3. 開一場約打、另一個帳號申請，host 收到通知 + email；接受後 player 也收到。
4. 在手機（Android + iPhone）把網站加到主畫面，開啟為 App 模式並收到推播。
5. 約打日期過後 host 評論 player、雙方頭像旁顯示參加率。
6. 後台批量公告功能，寄信給選定的會員群組。

驗收通過後即正式上線到 `jojotennis.com`。

---

## 七、後續可選的加值方向（不在本期）

- 海外/日本分頁與多語：估價另議，建議 2026 Q3 海外宣傳前完成。
- 廠商後台：估價另議，待業務模式（廠商月費 NT$ 1,500–2,500）確定後規劃。
- 金流串接：估價另議，含信用卡、ATM、LINE Pay、Apple Pay。
- AI 問答客服：估價另議，視會員數成長到 1,000 人以上再評估。

---

## 八、付款狀態

- **業主已完成付款（NT$ 9,240 含稅）**，開發方確認三方服務申請完成後即進入實作。
- 任何超出本計畫範圍的需求，會另列 Change Request 並重新估價。

---

## 聯絡與下一步

1. 業主依本文件 §2-1 開始申請 **Supabase + Resend**（最高優先）。
2. 業主取得每組 keys 後，依 §2-2 在 **Netlify Environment Variables** 設定。
3. 業主回報「Supabase 已建好、Netlify env vars 已就位」→ 開發方提供 SQL migration 與第一個 Preview build。
4. 開發方每週進度報告，業主依里程碑檢視。
