"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useUiStore } from "@/stores/useUiStore";
import { getAttendanceStats } from "@/lib/reviewService";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinaryUrl";
import { useScrollHide } from "@/hooks/useScrollHide";
import { updateUserProfile, NICKNAME_CHANGE_LIMIT } from "@/lib/userService";
import {
  subscribeMyCoach,
  setCoachPublished,
  type MyCoachState,
} from "@/lib/coachService";

type CloudinarySignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  tags: string;
};

async function convertAvatarToWebp(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const size = Math.min(bitmap.width, bitmap.height);
  const sx = Math.floor((bitmap.width - size) / 2);
  const sy = Math.floor((bitmap.height - size) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("頭像轉換失敗");
  context.drawImage(bitmap, sx, sy, size, size, 0, 0, 512, 512);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) throw new Error("WebP 產生失敗");
  return new File([blob], "avatar.webp", { type: "image/webp" });
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M5.85 17.1h12.3a.75.75 0 0 0 .53-1.28l-.82-.82V10a5.87 5.87 0 0 0-4.36-5.67V3.75a1.5 1.5 0 0 0-3 0v.58A5.87 5.87 0 0 0 6.14 10v5l-.82.82a.75.75 0 0 0 .53 1.28ZM9.75 18.25a2.25 2.25 0 0 0 4.5 0z" />
    </svg>
  );
}

export default function HeaderStatus() {
  const { user, logout, updateProfile, refreshUser } = useApp();
  const unreadCount = useNotificationStore((s) => s.unreadTotal);
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [attendanceRate, setAttendanceRate] = useState(0.75);
  const [uploading, setUploading] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [myCoach, setMyCoach] = useState<MyCoachState | null>(null);
  const [coachToggleBusy, setCoachToggleBusy] = useState(false);
  const [coachToggleError, setCoachToggleError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const hidden = useScrollHide();
  const announcementHeight = useUiStore((s) => s.announcementHeight);

  const nicknameChangesUsed = user?.nicknameChangesUsed ?? 0;
  const nicknameChangesRemaining = Math.max(NICKNAME_CHANGE_LIMIT - nicknameChangesUsed, 0);
  const nicknameLocked = nicknameChangesRemaining <= 0;

  useEffect(() => {
    setNickname(user?.nickname ?? "");
  }, [user?.nickname]);

  useEffect(() => {
    if (!user?.uid) return;
    let active = true;
    getAttendanceStats(user.uid)
      .then((stats) => {
        if (active) setAttendanceRate(stats.attendanceRate);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    setMyCoach(null);
    setCoachToggleBusy(false);
    setCoachToggleError(null);
    if (!user?.uid) return;
    const unsub = subscribeMyCoach(user.uid, setMyCoach);
    return () => unsub();
  }, [user?.uid]);

  async function toggleCoachPublished() {
    if (!myCoach || coachToggleBusy) return;
    setCoachToggleBusy(true);
    setCoachToggleError(null);
    try {
      await setCoachPublished(myCoach.id, !myCoach.isPublished);
    } catch (error) {
      setCoachToggleError(
        error instanceof Error ? error.message : "切換失敗，請稍後再試",
      );
    } finally {
      setCoachToggleBusy(false);
    }
  }

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  async function uploadAvatar(file: File | undefined) {
    if (!file || !user) return;
    setUploading(true);
    try {
      const webpFile = await convertAvatarToWebp(file);
      const signResponse = await fetch("/api/cloudinary/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: `users/${user.uid}/avatar`, tags: "avatar,jojo-tennis" }),
      });
      if (!signResponse.ok) throw new Error("Cloudinary 簽章失敗");
      const signature = (await signResponse.json()) as CloudinarySignature;
      const formData = new FormData();
      formData.append("file", webpFile);
      formData.append("api_key", signature.apiKey);
      formData.append("timestamp", String(signature.timestamp));
      formData.append("signature", signature.signature);
      formData.append("folder", signature.folder);
      formData.append("tags", signature.tags);
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      if (!uploadResponse.ok) throw new Error("Cloudinary 上傳失敗");
      const uploaded = (await uploadResponse.json()) as { public_id: string; secure_url?: string };
      updateProfile({
        avatarUrl:
          getOptimizedCloudinaryUrl(uploaded.public_id, { width: 240, height: 240, crop: "fill", format: "webp" }) ||
          uploaded.secure_url ||
          "",
      });
    } finally {
      setUploading(false);
    }
  }

  async function saveNickname() {
    if (!user) return;
    const trimmed = nickname.trim();
    if (!trimmed || trimmed === user.nickname) return;
    if (nicknameLocked) {
      setNickname(user.nickname);
      setNicknameError("已用完三次暱稱更改機會，請聯繫管理員");
      return;
    }
    try {
      await updateUserProfile(user.uid, { nickname: trimmed });
      updateProfile({ nickname: trimmed, avatarInitial: trimmed[0] || user.avatarInitial });
      await refreshUser();
      setNicknameError(null);
    } catch (error) {
      setNickname(user.nickname);
      setNicknameError(error instanceof Error ? error.message : "更新失敗");
    }
  }

  function openAvatarPicker() {
    setAvatarModalOpen(false);
    fileInputRef.current?.click();
  }

  return (
    <header
      className={`sticky z-50 border-b border-pine/10 bg-ivory/88 px-4 py-2 backdrop-blur-xl transition-transform duration-300 will-change-transform ${
        hidden && !open ? "-translate-y-full" : "translate-y-0"
      }`}
      style={{ top: announcementHeight }}
    >
      <div className="mx-auto flex h-[52px] max-w-md items-center justify-between gap-3">
        <Link href="/" className="flex h-[52px] items-center" aria-label="JoJo Tennis 首頁">
          <img
            src="/icons/logo.png"
            alt="JoJo Tennis"
            className="h-[45px] w-auto max-w-[11rem] object-contain"
          />
        </Link>
        {user ? (
          <div ref={panelRef} className="relative flex items-center gap-2">
            <Link href="/messages" aria-label="查看訊息" className="relative grid h-9 w-9 place-items-center rounded-full border border-pine/10 bg-white text-pine">
              <BellIcon />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-clay px-1 text-center text-[11px] font-bold leading-5 text-white">
                  {unreadCount}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-pine/10 bg-pine text-sm font-black text-white"
              aria-label="開啟個人選單"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                user.avatarInitial
              )}
            </button>
            {open ? (
              <div className="absolute right-0 top-12 w-72 rounded-[1.5rem] border border-pine/10 bg-white p-4 shadow-[0_24px_70px_rgba(30,61,47,0.22)]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAvatarModalOpen(true)}
                    className="relative grid h-14 w-14 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-pine text-lg font-black text-white"
                    aria-label="更換頭像"
                  >
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : user.avatarInitial}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      void uploadAvatar(file);
                    }}
                    className="sr-only"
                  />
                  <div className="min-w-0 flex-1">
                    <input
                      value={nickname}
                      onChange={(event) => setNickname(event.target.value)}
                      onBlur={() => void saveNickname()}
                      readOnly={nicknameLocked}
                      className={`w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none focus:border-clay ${
                        nicknameLocked
                          ? "border-pine/5 bg-parchment/60 text-muted"
                          : "border-pine/10 bg-ivory text-pine"
                      }`}
                    />
                    <p className="mt-1 text-xs text-muted">
                      {uploading
                        ? "頭像上傳中..."
                        : nicknameLocked
                        ? "暱稱更改機會已用完"
                        : `剩餘 ${nicknameChangesRemaining} 次更改機會`}
                    </p>
                    {nicknameError ? (
                      <p className="mt-1 text-xs font-bold text-clay">{nicknameError}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-bold text-pine">
                    <span>參加率</span>
                    <span>{Math.round(attendanceRate * 100)}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-parchment">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${Math.round(attendanceRate * 100)}%` }} />
                  </div>
                </div>
                {myCoach ? (
                  <div className="mt-4 rounded-2xl border border-pine/10 bg-ivory p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-pine">🎓 教練</p>
                        <p className="text-[11px] text-muted">
                          {myCoach.isPublished
                            ? "公開於找教練列表"
                            : "已關閉公開檔案"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggleCoachPublished()}
                        disabled={coachToggleBusy}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
                          myCoach.isPublished ? "bg-clay" : "bg-pine/20"
                        }`}
                        aria-label="切換公開教練檔案"
                        aria-pressed={myCoach.isPublished}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            myCoach.isPublished ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    {coachToggleError ? (
                      <p className="mt-2 text-[11px] font-bold text-clay">
                        {coachToggleError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="mt-4 w-full rounded-full bg-pine px-4 py-3 text-sm font-black text-white"
                >
                  登出
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/auth" className="rounded-full border border-pine px-3 py-1.5 text-xs font-bold text-pine">
              登入
            </Link>
            <Link href="/auth" className="rounded-full bg-clay px-3 py-1.5 text-xs font-bold text-white">
              免費註冊
            </Link>
          </div>
        )}
      </div>
      {avatarModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-[1.5rem] bg-white p-6 shadow-[0_24px_70px_rgba(30,61,47,0.3)]">
            <h2 className="text-lg font-black text-pine">上傳大頭照</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              建議上傳 1:1 正方形圖片，最大 5 MB。系統會自動裁切置中。
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                className="flex-1 rounded-full border border-pine/20 px-4 py-3 text-sm font-bold text-pine"
              >
                取消
              </button>
              <button
                type="button"
                onClick={openAvatarPicker}
                className="flex-1 rounded-full bg-clay px-4 py-3 text-sm font-bold text-white"
              >
                選擇圖片
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
