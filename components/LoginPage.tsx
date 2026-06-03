"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useApp } from "@/context/AppContext";
import { loginWithLineCustomToken } from "@/lib/authService";

function detectLineBrowser(userAgent: string) {
  return /Line\//i.test(userAgent);
}

function detectSocialProvider(uid?: string, providerId?: string) {
  if (uid?.startsWith("line_")) return "line";
  if (providerId?.includes("google")) return "google";
  return "google";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    fbUser,
    user,
    login,
    register,
    loginWithGoogle,
    refreshUser,
    accountDisabledMessage,
    clearAccountDisabledMessage,
  } = useApp();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [socialEmail, setSocialEmail] = useState("");
  const [successName, setSuccessName] = useState("");
  const [error, setError] = useState("");
  const [lineBrowserChecked, setLineBrowserChecked] = useState(false);
  const [isLineBrowser, setIsLineBrowser] = useState(false);
  const [requiresEmail, setRequiresEmail] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const nextPath = searchParams.get("next") || "/";
  const socialProvider = useMemo(
    () => user?.provider ?? detectSocialProvider(fbUser?.uid, fbUser?.providerData[0]?.providerId),
    [fbUser?.providerData, fbUser?.uid, user?.provider],
  );

  useEffect(() => {
    const detected = detectLineBrowser(window.navigator.userAgent);
    setIsLineBrowser(detected);
    setLineBrowserChecked(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("emailVerified") === "1") {
      setSuccessName("Email 驗證完成，歡迎回來。");
    }
    const callbackError = searchParams.get("error");
    if (callbackError) setError(callbackError);
  }, [searchParams]);

  useEffect(() => {
    const token = searchParams.get("lineToken");
    if (!token) return;

    loginWithLineCustomToken(token)
      .then(async (signedInUser) => {
        await refreshUser();
        if (searchParams.get("requiresEmail") === "1" || !signedInUser.email) {
          setRequiresEmail(true);
          return;
        }
        router.push(nextPath);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "LINE 登入失敗"));
  }, [nextPath, refreshUser, router, searchParams]);

  useEffect(() => {
    if (!fbUser || !user) return;
    if ((user.provider === "line" || user.provider === "google") && !user.email) {
      setRequiresEmail(true);
    }
  }, [fbUser, user]);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessName("");

    if (!email.includes("@")) {
      setError("請輸入有效的 Email。");
      return;
    }

    if (!password) {
      setError("請輸入密碼。");
      return;
    }

    if (tab === "login") {
      const success = await login(email, password);
      if (!success) {
        setError("Email 或密碼錯誤，請確認後再試。");
        return;
      }
      router.push(nextPath);
      return;
    }

    if (!nickname.trim()) {
      setError("請輸入暱稱。");
      return;
    }

    if (password.length < 8) {
      setError("密碼至少需要 8 個字元");
      return;
    }

    if (password !== confirmPassword) {
      setError("兩次密碼輸入不一致");
      return;
    }

    const success = await register({ email, password, nickname });
    if (!success) {
      setError("此 Email 已經註冊，請改用登入。");
      return;
    }

    setSuccessName(`註冊成功，歡迎加入揪揪網球，${nickname}。`);
  }

  async function openGoogleNotice() {
    setError("");
    const success = await loginWithGoogle();
    if (!success) {
      setShowGoogleModal(true);
      return;
    }

    const currentUser = auth?.currentUser;
    if (currentUser && !currentUser.email) {
      setRequiresEmail(true);
      return;
    }
    router.push(nextPath);
  }

  async function submitSocialEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setVerificationSent(false);

    const currentUser = auth?.currentUser;
    if (!currentUser) {
      setError("請先完成社群登入。");
      return;
    }

    if (!socialEmail.includes("@")) {
      setError("請輸入有效的 Email。");
      return;
    }

    try {
      const idToken = await currentUser.getIdToken(true);
      const response = await fetch("/api/auth/email-verification/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ email: socialEmail, provider: socialProvider }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Email 驗證信寄送失敗");
      setVerificationSent(true);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email 驗證信寄送失敗");
    }
  }

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <div className="rounded-2xl bg-pine p-6 text-white shadow-lg">
        <p className="text-sm font-semibold text-gold">揪揪網球 JoJo Tennis</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">會員登入</h1>
        <p className="mt-4 leading-7 text-parchment">找球友・找球場・找教練，從這裡開始</p>
      </div>

      {lineBrowserChecked && isLineBrowser ? (
        <div className="mt-5 rounded-2xl border border-[#06C755]/30 bg-[#06C755]/10 p-4 text-sm leading-6 text-pine">
          系統偵測你正在 LINE 內建瀏覽器中開啟。請使用 LINE 登入，完成後會自動回到揪揪網球。
        </div>
      ) : null}

      {requiresEmail ? (
        <form onSubmit={submitSocialEmail} className="mt-6 space-y-4 rounded-2xl border border-parchment bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-pine">補上 Email</h2>
          <p className="text-sm leading-6 text-muted">
            {socialProvider === "line" ? "LINE" : "Google"} 帳號目前沒有 Email。請輸入 Email，我們會寄出驗證信。
          </p>
          <input
            required
            type="email"
            value={socialEmail}
            onChange={(event) => setSocialEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
          />
          {error ? <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">{error}</p> : null}
          {verificationSent ? (
            <p className="rounded-2xl bg-ivory p-4 text-sm font-bold text-pine">
              驗證信已寄出，請到信箱點擊驗證連結。
            </p>
          ) : null}
          <button type="submit" className="w-full rounded-full bg-clay px-5 py-3 text-sm font-bold text-white">
            寄送驗證信
          </button>
        </form>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={`rounded-full px-4 py-3 text-sm font-bold ${tab === "login" ? "bg-clay text-white" : "bg-parchment text-ink"}`}
            >
              登入
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              className={`rounded-full px-4 py-3 text-sm font-bold ${tab === "register" ? "bg-clay text-white" : "bg-parchment text-ink"}`}
            >
              註冊
            </button>
          </div>

          <form onSubmit={submitAuth} className="mt-6 space-y-4 rounded-2xl border border-parchment bg-white p-5 shadow-sm">
            {tab === "register" ? (
              <input
                required
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="例如：Sabrina、阿強"
                className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
              />
            ) : null}
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
            />
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="密碼"
              className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
            />
            {tab === "register" ? (
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="確認密碼"
                className="w-full rounded-2xl border border-parchment bg-ivory px-4 py-3 text-sm outline-none focus:border-clay"
              />
            ) : null}

            {accountDisabledMessage ? (
              <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                <p>{accountDisabledMessage}</p>
                <button type="button" onClick={clearAccountDisabledMessage} className="mt-2 text-xs font-bold text-red-600 underline">
                  關閉
                </button>
              </div>
            ) : null}
            {error ? <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">{error}</p> : null}
            {successName ? <p className="rounded-2xl bg-ivory p-4 text-sm font-bold text-pine">{successName}</p> : null}

            <button type="submit" className="w-full rounded-full bg-clay px-5 py-3 text-sm font-bold text-white">
              {tab === "login" ? "登入" : "建立帳號"}
            </button>

            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-parchment" />
              或
              <span className="h-px flex-1 bg-parchment" />
            </div>

            <a href="/api/auth/line/login" className="block h-10 w-full overflow-hidden rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/auth/line-login-base.png" alt="Log in with LINE" className="h-10 w-full rounded object-contain" />
            </a>

            <button type="button" onClick={openGoogleNotice} className="block h-10 w-full overflow-hidden rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/auth/google-continue-light.svg" alt="Continue with Google" className="h-10 w-full rounded object-contain" />
            </button>

            <p className="text-center text-sm text-muted">
              {tab === "login" ? "還沒有帳號？" : "已有帳號？"}{" "}
              <button
                type="button"
                onClick={() => setTab(tab === "login" ? "register" : "login")}
                className="font-semibold text-clay underline"
              >
                {tab === "login" ? "註冊" : "登入"}
              </button>
            </p>
          </form>
        </>
      )}

      {showGoogleModal ? (
        <div className="fixed inset-0 z-50 flex items-center bg-ink/50 p-4">
          <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
            <h2 className="text-xl font-bold text-pine">Google 登入暫時無法使用</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              目前 Google 登入連線失敗，請稍後再試，或先使用 Email 與密碼登入。
            </p>
            <button type="button" onClick={() => setShowGoogleModal(false)} className="mt-5 w-full rounded-full bg-clay px-5 py-3 text-sm font-bold text-white">
              我知道了
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
