#!/usr/bin/env node
import { spawn } from "node:child_process";

const chrome = process.env.CHROME_BIN ?? "/usr/bin/google-chrome";
const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");

const routes = [
  "/",
  "/match",
  "/coach",
  "/coach/post",
  "/coach/register",
  "/courts",
  "/profile",
  "/login",
  "/messages",
  "/news",
  "/ntrp",
  "/privacy",
  "/terms",
  "/reviews",
  "/court/smoke-missing",
  "/matches/smoke-missing",
  "/news/smoke-missing",
  "/reviews/smoke-missing",
  "/admin/matches",
];

function dumpDom(route) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      chrome,
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--virtual-time-budget=3500",
        "--dump-dom",
        `${baseUrl}${route}`,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Chrome failed for ${route} (${code}): ${stderr.slice(0, 400)}`));
        return;
      }
      resolve({ route, stdout, stderr });
    });
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const route of routes) {
  const { stdout } = await dumpDom(route);
  assert(stdout.length > 0, `${route} produced empty DOM`);
  assert(!stdout.includes('__next_error__'), `${route} rendered Next error shell`);
  assert(!stdout.includes("Application error"), `${route} rendered application error`);
  assert(!stdout.includes("Unhandled Runtime Error"), `${route} rendered runtime error`);
  if (route === "/admin/matches") {
    assert(stdout.includes("/login") || stdout.includes("登入"), "/admin/matches should render login redirect");
  }
  console.log(`browser ok ${route}`);
}

console.log("browser smoke routes ok");
