"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp, type Match } from "@/context/AppContext";
import {
  cancelMatch,
  leaveFromMatch,
  removeFromMatch,
  respondToApplication,
  transferMatchOwnership,
} from "@/lib/matchService";
import { giveHeart } from "@/lib/heartService";
import { isWithin24Hours } from "@/lib/timeUtils";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import type { MatchApplication } from "@/lib/schema";

const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE === "true";

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>();
  const matchId = params.id;
  const { user, matches, applyMatch } = useApp();
  const [applications, setApplications] = useState<MatchApplication[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [transferUid, setTransferUid] = useState("");

  const match = matches.find((item) => item.id === matchId);

  useEffect(() => {
    if (!USE_FIREBASE || !matchId) return;
    return onSnapshot(
      query(
        collection(db, "match_applications"),
        where("matchId", "==", matchId),
        where("isDeleted", "==", false),
      ),
      (snap) => {
        setApplications(
          snap.docs.map((d) => ({ appId: d.id, ...d.data() }) as MatchApplication),
        );
      },
    );
  }, [matchId]);

  const myApp = useMemo(
    () => applications.find((app) => app.applicantUid === user?.uid && !app.isDeleted),
    [applications, user?.uid],
  );

  if (!match) {
    return (
      <section className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-muted">找不到這場球局。</p>
        <Link href="/match" className="mt-4 inline-block font-semibold text-clay">
          回到揪球列表
        </Link>
      </section>
    );
  }

  const isOwner = user?.uid === match.ownerUid;
  const within24 = isWithin24Hours(match.date, match.startTime);
  const isFull = match.filledSlots >= match.totalSlots;
  const isCancelled = Boolean(match.isDeleted);
  const transferable = applications.filter(
    (app) => app.status === "accepted" && !app.isDeleted && app.applicantUid !== user?.uid,
  );
  const acceptedMembers = match.applicants.filter((a) => a.status === "accepted");
  const pendingApplicants = match.applicants.filter((a) => a.status === "pending");
  const showHearts = match.status === "closed" && !isCancelled;

  async function runAction(action: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-6 py-10">
      <Link href="/match" className="text-sm font-semibold text-clay">
        ← 返回揪球
      </Link>

      <div className="mt-4 rounded-[1.5rem] border border-parchment bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold text-clay">
          {match.city} · {match.ntrpRequired.join("/") || "不限"}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-pine">{match.title}</h1>
        <p className="mt-3 text-sm text-muted">
          {match.date} {match.weekday} {match.startTime}–{match.endTime}
        </p>
        <p className="mt-1 text-sm text-muted">{match.venue}</p>
        <p className="mt-1 text-sm text-muted">
          主揪 {match.ownerNickname} · 還差 {Math.max(match.totalSlots - match.filledSlots, 0)} 人
        </p>
        {match.note ? <p className="mt-4 text-sm leading-6 text-pine">{match.note}</p> : null}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <ActionButtons
        user={user}
        match={match}
        isOwner={isOwner}
        isCancelled={isCancelled}
        isFull={isFull}
        within24={within24}
        myApp={myApp}
        busy={busy}
        transferable={transferable}
        transferUid={transferUid}
        setTransferUid={setTransferUid}
        applyMatch={applyMatch}
        runAction={runAction}
      />

      {isOwner && pendingApplicants.length > 0 ? (
        <div>
          <h2 className="mt-8 text-lg font-bold text-pine">待審申請</h2>
          {pendingApplicants.map((applicant) => {
            const app = applications.find((a) => a.applicantUid === applicant.uid);
            if (!app?.appId) return null;
            return (
              <div
                key={applicant.uid}
                className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-clay px-4 py-3 text-sm"
              >
                <span>{applicant.nickname}</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      runAction(() =>
                        respondToApplication(app.appId, match.id, true, applicant.uid, applicant.nickname),
                      )
                    }
                    className="font-semibold text-clay"
                  >
                    接受
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      runAction(() =>
                        respondToApplication(app.appId, match.id, false, applicant.uid, applicant.nickname),
                      )
                    }
                    className="font-semibold text-muted"
                  >
                    婉拒
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="text-lg font-bold text-pine">參與者</h2>
        <ul className="mt-3 space-y-2">
          <li className="rounded-xl border border-parchment px-4 py-3 text-sm">
            {match.ownerNickname}（主揪）
          </li>
          {acceptedMembers.map((member) => (
            <li
              key={member.uid}
              className="flex items-center justify-between gap-2 rounded-xl border border-parchment px-4 py-3 text-sm"
            >
              <span>{member.nickname}</span>
              <div className="flex shrink-0 gap-2">
                {isOwner ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      runAction(() =>
                        removeFromMatch(match.id, member.uid, member.nickname, match.title),
                      )
                    }
                    className="text-xs font-semibold text-red-600"
                  >
                    移除
                  </button>
                ) : null}
                {showHearts && user && user.uid !== member.uid ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      runAction(async () => {
                        const result = await giveHeart(match.id, user.uid, member.uid);
                        if (!result.ok) throw new Error(result.msg);
                      })
                    }
                    className="text-xs font-semibold text-clay"
                  >
                    給予肯定 ❤️
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href={`/messages?conversation=match_${match.id}`}
        className="mt-6 block rounded-full border border-pine px-5 py-3 text-center text-sm font-bold text-pine"
      >
        進入球局聊天室
      </Link>
    </section>
  );
}

function ActionButtons({
  user,
  match,
  isOwner,
  isCancelled,
  isFull,
  within24,
  myApp,
  busy,
  transferable,
  transferUid,
  setTransferUid,
  applyMatch,
  runAction,
}: {
  user: ReturnType<typeof useApp>["user"];
  match: Match;
  isOwner: boolean;
  isCancelled: boolean;
  isFull: boolean;
  within24: boolean;
  myApp?: MatchApplication;
  busy: boolean;
  transferable: MatchApplication[];
  transferUid: string;
  setTransferUid: (value: string) => void;
  applyMatch: (matchId: string) => void;
  runAction: (action: () => Promise<void>) => Promise<void>;
}) {
  if (!user) {
    return (
      <p className="mt-6 text-sm text-muted">
        <Link href="/auth" className="font-semibold text-clay">
          登入
        </Link>{" "}
        後才能申請加入或管理球局。
      </p>
    );
  }

  if (isCancelled) {
    return <p className="mt-6 text-sm text-muted">球局已取消</p>;
  }

  if (isOwner) {
    return (
      <div className="mt-6 space-y-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => runAction(() => cancelMatch(match.id, user.uid, match.title))}
          className="w-full rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          取消活動
        </button>
        {transferable.length > 0 ? (
          <div className="rounded-xl border border-parchment p-4">
            <p className="text-sm font-semibold text-pine">轉移主辦權</p>
            <select
              value={transferUid}
              onChange={(event) => setTransferUid(event.target.value)}
              className="mt-2 w-full rounded-lg border border-parchment px-3 py-2 text-sm"
            >
              <option value="">選擇球友</option>
              {transferable.map((app) => (
                <option key={app.applicantUid} value={app.applicantUid}>
                  {app.applicantNickname}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !transferUid}
              onClick={() => {
                const target = transferable.find((app) => app.applicantUid === transferUid);
                if (!target) return;
                void runAction(() =>
                  transferMatchOwnership(match.id, user.uid, target.applicantUid, target.applicantNickname),
                );
              }}
              className="mt-3 w-full rounded-full border border-pine px-5 py-2 text-sm font-bold text-pine disabled:opacity-50"
            >
              確認轉移
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (!myApp && !isFull) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => applyMatch(match.id)}
        className="mt-6 w-full rounded-full bg-gold px-5 py-3 text-sm font-bold text-pine disabled:opacity-50"
      >
        我要加入
      </button>
    );
  }

  if (myApp?.status === "pending") {
    return (
      <button
        type="button"
        disabled
        className="mt-6 w-full rounded-full bg-parchment px-5 py-3 text-sm font-bold text-muted"
      >
        已申請，等待確認
      </button>
    );
  }

  if (myApp?.status === "removed") {
    return <p className="mt-6 text-sm text-muted">已被移除</p>;
  }

  if (isFull && myApp?.status !== "accepted") {
    return (
      <button
        type="button"
        disabled
        className="mt-6 w-full rounded-full bg-parchment px-5 py-3 text-sm font-bold text-muted"
      >
        球局已額滿
      </button>
    );
  }

  if (myApp?.status === "accepted") {
    return (
      <div>
        <button
          type="button"
          disabled={busy || within24}
          onClick={() =>
            runAction(() => leaveFromMatch(match.id, user.uid, user.nickname, match.title))
          }
          className="mt-6 w-full rounded-full border border-pine px-5 py-3 text-sm font-bold text-pine disabled:opacity-50"
        >
          退出球局
        </button>
        {within24 ? (
          <p className="mt-2 text-center text-xs text-muted">
            距開打不足 24 小時，如需退出請聯繫主揪。
          </p>
        ) : null}
      </div>
    );
  }

  return null;
}
