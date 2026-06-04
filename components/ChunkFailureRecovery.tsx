"use client";

import { useEffect } from "react";

const CHUNK_RETRY_MARKER = "jojo-chunk-reload-at";
const CHUNK_RETRY_GUARD_MS = 30_000;

function isChunkFailure(reason: unknown, target?: EventTarget | null) {
  const message = typeof reason === "string" ? reason : reason instanceof Error ? reason.message : String(reason ?? "");
  if (message.includes("Loading chunk") || message.includes("ChunkLoadError")) return true;
  if ((target as Element | null)?.tagName === "SCRIPT") return true;
  return message.includes("Loading CSS chunk") || message.includes("Failed to fetch dynamically imported module");
}

async function clearChunkCachesAndUnregisterServiceWorker() {
  try {
    if (typeof caches !== "undefined") {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  } catch {
    // ignore
  }

  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  } catch {
    // ignore
  }
}

export default function ChunkFailureRecovery() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onError = (event: ErrorEvent) => {
      if (!isChunkFailure(event.message, event.target)) return;
      const now = Date.now();
      const lastReload = Number(window.localStorage.getItem(CHUNK_RETRY_MARKER) || "0");
      if (now - lastReload < CHUNK_RETRY_GUARD_MS) return;
      window.localStorage.setItem(CHUNK_RETRY_MARKER, String(now));
      void clearChunkCachesAndUnregisterServiceWorker().finally(() => {
        window.location.replace(window.location.href);
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (!isChunkFailure(reason)) return;
      const message = reason instanceof Error ? reason.message : String(reason ?? "");
      const err: ErrorEvent = new ErrorEvent("error", {
        message,
        error: reason instanceof Error ? reason : undefined,
      });
      onError(err);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
