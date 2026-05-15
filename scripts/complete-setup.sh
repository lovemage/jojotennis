#!/usr/bin/env bash
# 全自動：GitHub push + Netlify 部署（需先設定 .env.deploy）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
GH="$ROOT/.tools/gh"

if [[ -f "$ROOT/.env.deploy" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.deploy"
  set +a
fi

if [[ ! -x "$GH" ]]; then
  echo "缺少 .tools/gh，請先執行: ./scripts/setup-github-netlify.sh"
  exit 1
fi

# ── 1. GitHub 登入 ──────────────────────────────────────────
if [[ -n "${GH_TOKEN:-}" ]]; then
  echo ">>> 使用 GH_TOKEN 登入 GitHub…"
  echo "$GH_TOKEN" | "$GH" auth login --with-token
elif ! "$GH" auth status &>/dev/null; then
  echo ">>> 尚未登入。請在瀏覽器完成驗證（約 30 秒）"
  { printf 'y\n\n'; } | "$GH" auth login -h github.com -p https -w
fi

USER="$("$GH" api user -q .login)"
REPO_NAME="${GITHUB_REPO_NAME:-TennisTW}"
echo "GitHub: $USER / $REPO_NAME"

# ── 2. Push 到 GitHub ───────────────────────────────────────
if "$GH" repo view "$USER/$REPO_NAME" &>/dev/null; then
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/$USER/$REPO_NAME.git"
  git push -u origin main
else
  "$GH" repo create "$REPO_NAME" --private --source=. --remote=origin --push
fi
echo "✅ GitHub: https://github.com/$USER/$REPO_NAME"

# ── 3. 建置 Web ─────────────────────────────────────────────
echo ">>> 建置 Expo Web…"
npm ci
npm run build:web

# ── 4. Netlify 部署 ───────────────────────────────────────────
if [[ -z "${NETLIFY_AUTH_TOKEN:-}" ]]; then
  echo ""
  echo "⚠️  未設定 NETLIFY_AUTH_TOKEN，跳過自動部署。"
  echo "    請到 https://app.netlify.com/start 手動 Import Git → $REPO_NAME"
  open "https://app.netlify.com/start" 2>/dev/null || true
  exit 0
fi

export NETLIFY_AUTH_TOKEN
echo ">>> 部署到 Netlify…"
npx --yes netlify-cli@17 deploy --prod --dir=dist --message="TennisTW deploy $(date +%Y-%m-%d)"

echo ""
echo "✅ 完成！網址請見上方 netlify deploy 輸出（Site URL / Deploy URL）"
