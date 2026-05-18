"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveUser } from "@/lib/auth";
import { addSessionMockUser, getMockUsers } from "@/lib/mockUsers";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successName, setSuccessName] = useState("");
  const [error, setError] = useState("");

  function redirectHomeLater() {
    window.setTimeout(() => router.push("/"), 2000);
  }

  function submitAuth(event: React.FormEvent<HTMLFormElement>) {
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
      const user = getMockUsers().find(
        (mockUser) => mockUser.email === email && mockUser.password === password,
      );

      if (!user) {
        setError("Email 或密碼錯誤，請確認後再試。");
        return;
      }

      saveUser({ email: user.email, nickname: user.nickname });
      setSuccessName(`✅ 登入成功！歡迎回來，${user.nickname}`);
      redirectHomeLater();
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

    addSessionMockUser({ email, password, nickname });
    saveUser({ email, nickname });
    setSuccessName(`✅ 註冊成功！歡迎加入揪揪網球，${nickname}！`);
    redirectHomeLater();
  }

  function googleAuth() {
    const displayName = nickname || "你";

    saveUser({ email: "google-user@jojo.tw", nickname: displayName });
    setSuccessName(
      tab === "login"
        ? `✅ 登入成功！歡迎回來，${displayName}`
        : `✅ 註冊成功！歡迎加入揪揪網球，${displayName}！`,
    );
    redirectHomeLater();
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
          onClick={googleAuth}
          className="w-full rounded-full border border-parchment bg-white px-5 py-3 text-sm font-bold text-pine"
        >
          G {tab === "login" ? "使用 Google 登入" : "使用 Google 快速註冊"}
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

        {successName ? (
          <p className="rounded-2xl bg-ivory p-4 text-center text-sm font-bold text-pine">
            {successName}
          </p>
        ) : null}
      </form>
    </section>
  );
}
