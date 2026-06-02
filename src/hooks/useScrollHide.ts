"use client";

import { useEffect, useState } from "react";

export function useScrollHide(options?: { threshold?: number; topOffset?: number }) {
  const threshold = options?.threshold ?? 8;
  const topOffset = options?.topOffset ?? 80;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastY;

      if (Math.abs(diff) >= threshold) {
        if (currentY > topOffset && diff > 0) {
          setHidden(true);
        } else if (diff < 0) {
          setHidden(false);
        }
        lastY = currentY;
      } else if (currentY <= topOffset) {
        setHidden(false);
        lastY = currentY;
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, topOffset]);

  return hidden;
}
