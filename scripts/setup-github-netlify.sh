#!/usr/bin/env bash
# TennisTW：一鍵 GitHub push + Netlify 設定指引
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
GH="$ROOT/.tools/gh"

if [[ ! -x "$GH" ]]; then
  echo "正在下載 GitHub CLI…"
  mkdir -p .tools
  ARCH="$(uname -m)"
  if [[ "$ARCH" == "arm64" ]]; then
    ZIP="gh_2.92.0_macOS_arm64.zip"
    DIR="gh_2.92.0_macOS_arm64"
  else
    ZIP="gh_2.92.0_macOS_amd64.zip"
    DIR="gh_2.92.0_macOS_amd64"
  fi
  curl -sL "https://github.com/cli/cli/releases/download/v2.92.0/$ZIP" -o .tools/gh.zip
  unzip -qo .tools/gh.zip -d .tools
  mv ".tools/$DIR/bin/gh" .tools/gh
  rm -rf .tools/gh.zip ".tools/$DIR"
fi

if ! "$GH" auth status &>/dev/null; then
  echo ""
  echo ">>> 請在瀏覽器完成 GitHub 登入（會自動開啟或顯示驗證碼）"
  "$GH" auth login -h github.com -p https -w
fi

USER="$("$GH" api user -q .login)"
REPO_NAME="${1:-TennisTW}"
echo "GitHub 使用者：$USER"
echo "建立並推送至：github.com/$USER/$REPO_NAME"

if "$GH" repo view "$USER/$REPO_NAME" &>/dev/null; then
  echo "遠端 repo 已存在，僅設定 remote 並 push…"
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/$USER/$REPO_NAME.git"
  git push -u origin main
else
  "$GH" repo create "$REPO_NAME" --private --source=. --remote=origin --push
fi

echo ""
echo "✅ 已推送到 https://github.com/$USER/$REPO_NAME"
echo ""
echo "── Netlify（請在瀏覽器完成）──"
echo "1. 開啟 https://app.netlify.com/start"
echo "2. Import from Git → GitHub → 選 $REPO_NAME"
echo "3. Build 會自動讀 netlify.toml（publish: dist）"
echo "4. Deploy site"
echo ""
if command -v open &>/dev/null; then
  open "https://app.netlify.com/start"
fi
