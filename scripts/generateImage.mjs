#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { mkdir } from "node:fs/promises";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("缺少環境變數 OPENAI_API_KEY。請在 .env.local 或 shell 設定後重試。");
  process.exit(1);
}

const args = process.argv.slice(2);
const flags = new Map();
const positional = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith("--")) {
    const key = arg.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      flags.set(key, next);
      i++;
    } else {
      flags.set(key, "true");
    }
  } else {
    positional.push(arg);
  }
}

const prompt = flags.get("prompt") ?? positional[0];
const outPath = flags.get("out") ?? positional[1] ?? "out.png";
const model = flags.get("model") ?? "gpt-image-2";
const size = flags.get("size") ?? "1024x1024";
const quality = flags.get("quality") ?? "high";
const count = Number.parseInt(flags.get("n") ?? "1", 10);

if (!prompt) {
  console.error(
    [
      "用法: node scripts/generateImage.mjs <prompt> [outPath]",
      "  或: node scripts/generateImage.mjs --prompt \"...\" --out path.png --model gpt-image-2 --size 1024x1024",
      "",
      "選項：",
      "  --prompt <text>       要生成的圖片描述（必填）",
      "  --out <path>          輸出檔案路徑，多張時會自動加上 -1、-2... 後綴（預設 out.png）",
      "  --model <id>          OpenAI 圖像模型 ID，預設 gpt-image-2",
      "  --size <WxH>          1024x1024 / 1024x1536 / 1536x1024（預設 1024x1024）",
      "  --quality <level>     low / medium / high（預設 high）",
      "  --n <number>          張數（預設 1）",
    ].join("\n"),
  );
  process.exit(1);
}

const body = {
  model,
  prompt,
  size,
  quality,
  n: count,
};

console.log(`[generateImage] model=${model} size=${size} quality=${quality} n=${count}`);
console.log(`[generateImage] prompt: ${prompt}`);

const response = await fetch("https://api.openai.com/v1/images/generations", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

if (!response.ok) {
  const text = await response.text();
  console.error(`[generateImage] HTTP ${response.status}: ${text}`);
  process.exit(1);
}

const payload = await response.json();
const images = Array.isArray(payload?.data) ? payload.data : [];
if (images.length === 0) {
  console.error("[generateImage] API 沒有回傳圖片，原始回應：", JSON.stringify(payload, null, 2));
  process.exit(1);
}

for (let i = 0; i < images.length; i++) {
  const item = images[i];
  const base64 = item?.b64_json;
  if (!base64) {
    console.error(`[generateImage] 第 ${i + 1} 張缺少 b64_json：`, JSON.stringify(item));
    continue;
  }
  const buffer = Buffer.from(base64, "base64");
  const target =
    images.length === 1
      ? resolve(outPath)
      : resolve(outPath.replace(/\.(\w+)$/, `-${i + 1}.$1`));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buffer);
  console.log(`[generateImage] saved → ${target}`);
}
