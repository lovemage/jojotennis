#!/usr/bin/env node
import { readFileSync } from "node:fs";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const email = process.env.SMOKE_EMAIL ?? "test@gmail.com";
const password = process.env.SMOKE_PASSWORD ?? "test123";

const pageRoutes = [
  ["/", 200],
  ["/match", 200],
  ["/coach", 200],
  ["/coach/post", 200],
  ["/coach/register", 200],
  ["/courts", 200],
  ["/club", 307],
  ["/profile", 200],
  ["/login", 200],
  ["/auth", 200],
  ["/buddies", 200],
  ["/messages", 200],
  ["/news", 200],
  ["/ntrp", 200],
  ["/privacy", 200],
  ["/terms", 200],
  ["/reviews", 200],
  ["/court/smoke-missing", 200],
  ["/matches/smoke-missing", 200],
  ["/news/smoke-missing", 200],
  ["/reviews/smoke-missing", 200],
];

const adminRoutes = [
  "/admin",
  "/admin/matches",
  "/admin/users",
  "/admin/news",
  "/admin/email-templates",
  "/admin/coaches",
  "/admin/courts",
  "/admin/pending",
];

const unauthApiRoutes = [
  ["/api/matches", 200],
  ["/api/admin/matches", 401],
  ["/api/chat/conversations", 401],
  ["/api/chat/messages", 401],
];

function envValue(name) {
  const raw = readFileSync(".env.local", "utf8");
  const line = raw.split(/\r?\n/).find((item) => item.startsWith(`${name}=`));
  if (!line) return "";
  return line.slice(name.length + 1).replace(/^["']|["']$/g, "");
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...init,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // html route
  }
  return { response, text, json };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function signIn() {
  const apiKey = envValue("NEXT_PUBLIC_FIREBASE_API_KEY");
  assert(apiKey, "Missing NEXT_PUBLIC_FIREBASE_API_KEY in .env.local");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await response.json();
  assert(response.ok && data.idToken, `Firebase sign-in failed: ${JSON.stringify(data)}`);
  const claims = JSON.parse(Buffer.from(data.idToken.split(".")[1], "base64url").toString());
  return { token: data.idToken, uid: claims.user_id ?? claims.sub };
}

async function checkPages() {
  for (const [path, expected] of pageRoutes) {
    const { response, text } = await request(path);
    assert(
      response.status === expected,
      `Page ${path} expected ${expected}, got ${response.status}`,
    );
    assert(text.length > 0, `Page ${path} returned empty body`);
    console.log(`page ${response.status} ${path}`);
  }
}

async function checkAdminRedirects() {
  for (const path of adminRoutes) {
    const { response } = await request(path);
    assert(response.status === 307, `Admin ${path} expected 307, got ${response.status}`);
    const location = response.headers.get("location") ?? "";
    assert(location.includes("/login?next="), `Admin ${path} redirect mismatch: ${location}`);
    console.log(`admin ${response.status} ${path}`);
  }
}

async function checkUnauthApis() {
  for (const [path, expected] of unauthApiRoutes) {
    const { response, json } = await request(path);
    assert(response.status === expected, `API ${path} expected ${expected}, got ${response.status}`);
    if (path === "/api/matches") {
      assert(Array.isArray(json?.matches), "/api/matches should return matches array");
      assert(Array.isArray(json?.applications), "/api/matches should return applications array");
      assert(json.applications.length === 0, "/api/matches must not expose applications publicly");
    }
    console.log(`api ${response.status} ${path}`);
  }
}

async function checkMatchLoop() {
  const { token, uid } = await signIn();
  const auth = { Authorization: `Bearer ${token}` };
  const stamp = Date.now();
  const create = await request("/api/matches", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerUid: uid,
      ownerNickname: "Smoke Admin",
      title: `Route Smoke ${stamp}`,
      city: "台北市",
      district: "中正區",
      venue: "Smoke Court",
      date: "2026-06-10",
      startTime: "10:00",
      endTime: "11:00",
      ntrpRequired: ["2.0"],
      totalSlots: 2,
      note: "route smoke test",
      joinMode: "public",
    }),
  });
  assert(create.response.status === 200, `create match failed: ${create.response.status} ${create.text}`);
  const matchId = create.json?.id;
  assert(matchId, "create match did not return id");
  console.log(`loop create ${matchId}`);

  try {
    const publicList = await request("/api/matches");
    assert(publicList.json.applications.length === 0, "public match list leaked applications");

    const authedList = await request("/api/matches", { headers: auth });
    assert(
      authedList.json.matches.some((match) => match.matchId === matchId),
      "authed match list did not include created match",
    );

    const adminList = await request("/api/admin/matches", { headers: auth });
    assert(adminList.response.status === 200, `admin matches failed: ${adminList.response.status}`);

    const close = await request("/api/admin/matches", {
      method: "PATCH",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, status: "closed" }),
    });
    assert(close.response.status === 200, `admin close failed: ${close.response.status} ${close.text}`);

    const invalid = await request("/api/admin/matches", {
      method: "PATCH",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, status: "anything" }),
    });
    assert(invalid.response.status === 400, `invalid status expected 400, got ${invalid.response.status}`);
  } finally {
    const cleanup = await request(`/api/admin/matches?matchId=${encodeURIComponent(matchId)}`, {
      method: "DELETE",
      headers: auth,
    });
    assert(cleanup.response.status === 200, `cleanup delete failed: ${cleanup.response.status} ${cleanup.text}`);
    const after = await request("/api/matches", { headers: auth });
    assert(
      !after.json.matches.some((match) => match.matchId === matchId),
      "deleted match still appears in match list",
    );
    console.log(`loop delete ${matchId}`);
  }
}

async function main() {
  await checkPages();
  await checkAdminRedirects();
  await checkUnauthApis();
  await checkMatchLoop();
  console.log("smoke routes ok");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
