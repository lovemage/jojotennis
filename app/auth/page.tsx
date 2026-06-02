"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { loginWithLineCustomToken } from "@/lib/authService";

export default function AuthPage() {
  const router = useRouter();
  const { login, register, loginWithGoogle, accountDisabledMessage, clearAccountDisabledMessage } = useApp();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successName, setSuccessName] = useState("");
  const [error, setError] = useState("");
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [registrationSuccessName, setRegistrationSuccessName] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("lineToken");
    if (!token) return;
    loginWithLineCustomToken(token)
      .then(() => router.push("/"))
      .catch((err) => setError(err instanceof Error ? err.message : "LINE 登入失敗"));
  }, [router]);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessName("");
    setRegistrationSuccessName("");

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

      setSuccessName("✅ 歡迎回來！");
      router.push("/");
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

    setSuccessName(`✅ 註冊成功！歡迎加入揪揪網球，${nickname}！`);
    setRegistrationSuccessName(nickname);
  }

  async function openGoogleNotice() {
    const success = await loginWithGoogle();

    if (success) {
      router.push("/");
      return;
    }

    setShowGoogleModal(true);
  }

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <div className="rounded-[2rem] bg-pine p-6 text-white shadow-lg">
        <p className="text-sm font-semibold text-gold">揪揪網球 JoJo Tennis</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">加入揪揪網球</h1>
        <p className="mt-4 leading-7 text-parchment">
          找球友・找球場・找教練，從這裡開始
        </p>
      </div>

      {registrationSuccessName ? (
        <div className="mt-6 rounded-[1.5rem] border border-parchment bg-white p-6 text-center shadow-sm">
          <p className="text-5xl">✅</p>
          <h2 className="mt-4 text-2xl font-bold text-pine">帳號建立成功！</h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted">
            {`你已成功加入揪揪網球。

📧 Email 驗證功能即將推出
正式版本將寄送驗證信至你的信箱，
確保帳號安全。目前測試版本可直接使用所有功能。`}
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-5 w-full rounded-full bg-clay px-5 py-3 text-sm font-bold text-white"
          >
            開始使用 →
          </button>
        </div>
      ) : (
        <>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setTab("login")}
          className={`rounded-full px-4 py-3 text-sm font-bold ${
            tab === "login" ? "bg-clay text-white" : "bg-parchment text-ink"
          }`}
        >
          登入
        </button>
        <button
          type="button"
          onClick={() => setTab("register")}
          className={`rounded-full px-4 py-3 text-sm font-bold ${
            tab === "register" ? "bg-clay text-white" : "bg-parchment text-ink"
          }`}
        >
          註冊
        </button>
      </div>

      <form
        onSubmit={submitAuth}
        className="mt-6 space-y-4 rounded-[1.5rem] border border-parchment bg-white p-5 shadow-sm"
      >
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
            <button
              type="button"
              onClick={clearAccountDisabledMessage}
              className="mt-2 text-xs font-bold text-red-600 underline"
            >
              關閉
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-full bg-clay px-5 py-3 text-sm font-bold text-white"
        >
          {tab === "login" ? "登入" : "建立帳號"}
        </button>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-parchment" />
          或
          <span className="h-px flex-1 bg-parchment" />
        </div>

        <button
          type="button"
          onClick={openGoogleNotice}
          className="w-full rounded-full border border-parchment bg-white px-5 py-3 text-sm font-bold text-pine"
        >
          {tab === "login" ? "使用 Google 登入" : "使用 Google 快速註冊"}
        </button>

        <a
          href="/api/auth/line/login"
          className="flex w-full items-center justify-center rounded-full bg-[#06C755] px-5 py-3 text-sm font-bold text-white"
        >
          使用 LINE 登入
        </a>

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

        {successName ? (
          <p className="rounded-2xl bg-ivory p-4 text-center text-sm font-bold text-pine">
            {successName}
          </p>
        ) : null}
      </form>
        </>
      )}

      {showGoogleModal ? (
        <div className="fixed inset-0 z-50 flex items-center bg-ink/50 p-4">
          <div className="mx-auto w-full max-w-md rounded-[1.5rem] bg-white p-5 shadow-lg">
            <h2 className="text-xl font-bold text-pine">Google 登入暫時無法使用</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">
              {`目前 Google 登入連線失敗，請稍後再試，或先使用 Email 與密碼登入。`}
            </p>
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="mt-5 w-full rounded-full bg-clay px-5 py-3 text-sm font-bold text-white"
            >
              我知道了
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
