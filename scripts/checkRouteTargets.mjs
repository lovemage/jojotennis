#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const sourceRoots = ["app", "components", "context", "src", "lib"];
const sourceExt = /\.(tsx?|jsx?|mjs)$/;
const ignoredFiles = new Set([
  "app/_layout.tsx",
  "app/modal.tsx",
  "app/(tabs)/_layout.tsx",
  "app/(tabs)/club.tsx",
  "app/(tabs)/court.tsx",
  "app/(tabs)/index.tsx",
  "app/(tabs)/match.tsx",
  "app/(tabs)/profile.tsx",
  "app/club/[id].tsx",
  "app/court/[id].tsx",
  "context/_recover.txt",
]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) out.push(...walk(path));
    else if (sourceExt.test(path)) out.push(path);
  }
  return out;
}

function normalizeManifestRoute(route) {
  return route
    .replace(/\/page$|\/route$/, "")
    .replace(/^\/\(tabs\)$/, "/")
    .replace(/^\/\(tabs\)/, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function routeToRegExp(route) {
  if (route === "/") return /^\/$/;
  const pattern = route
    .split("/")
    .map((part) => {
      if (!part) return "";
      if (/^\[\.\.\..+\]$/.test(part)) return ".+";
      if (/^\[.+\]$/.test(part)) return "[^/]+";
      return escapeRegExp(part);
    })
    .join("/");
  return new RegExp(`^${pattern}$`);
}

const manifest = JSON.parse(readFileSync(".next/server/app-paths-manifest.json", "utf8"));
const routes = Object.keys(manifest)
  .filter((route) => !route.endsWith("/_not-found/page") && !route.endsWith("/favicon.ico/route"))
  .map(normalizeManifestRoute);
const routeRegexps = routes.map((route) => [route, routeToRegExp(route)]);

function isKnownRoute(path) {
  return routeRegexps.some(([, regexp]) => regexp.test(path));
}

function normalizeTarget(raw) {
  if (!raw || !raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  const path = raw.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  return path;
}

function templateCandidates(raw) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return [];
  const withoutQuery = trimmed.split(/[?#]/)[0];
  const dynamicNormalized = withoutQuery.replace(/\$\{[^}]+\}/g, "__DYNAMIC__");
  const candidates = [dynamicNormalized.replace(/\/$/, "") || "/"];
  const dynamicIndex = dynamicNormalized.indexOf("__DYNAMIC__");
  if (dynamicIndex >= 0) {
    const prefix = dynamicNormalized.slice(0, dynamicIndex).replace(/\/$/, "");
    if (prefix) candidates.push(`${prefix}/__DYNAMIC__`);
  }
  return [...new Set(candidates)];
}

function matchesDynamicCandidate(candidate) {
  const path = candidate.replace(/__DYNAMIC__/g, "smoke-value");
  return isKnownRoute(path);
}

const literalPatterns = [
  /href=["'](\/[^"'#?]*)/g,
  /href=\{["'](\/[^"'#?]*)["']\}/g,
  /router\.(?:push|replace)\(["'](\/[^"'#?]*)["']\)/g,
  /fetch\(["'](\/api\/[^"'?#]*)/g,
];
const templatePatterns = [
  /href=\{`([^`]+)`\}/g,
  /router\.(?:push|replace)\(`([^`]+)`\)/g,
  /fetch\(`([^`]+)`/g,
];

const issues = [];
for (const root of sourceRoots) {
  for (const absPath of walk(root)) {
    const file = relative(".", absPath);
    if (ignoredFiles.has(file)) continue;
    const text = readFileSync(absPath, "utf8");

    for (const pattern of literalPatterns) {
      for (const match of text.matchAll(pattern)) {
        const target = normalizeTarget(match[1]);
        if (!target) continue;
        if (!isKnownRoute(target)) issues.push({ file, target });
      }
    }

    for (const pattern of templatePatterns) {
      for (const match of text.matchAll(pattern)) {
        const candidates = templateCandidates(match[1]);
        if (candidates.length === 0) continue;
        if (!candidates.some(matchesDynamicCandidate)) {
          issues.push({ file, target: match[1].trim() });
        }
      }
    }
  }
}

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(`${issue.file}: unknown route target ${issue.target}`);
  }
  process.exit(1);
}

console.log(`route targets ok (${routes.length} manifest routes checked)`);
