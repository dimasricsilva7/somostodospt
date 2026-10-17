"use client";

import { useEffect } from "react";
import { trackingIds } from "@/app/lib/tracking";

/** Heartbeat anônimo do "online ao vivo" — informa a página atual a cada 25s. */
export function Heartbeat() {
  useEffect(() => {
    function ping() {
      try {
        const { sessionId, visitorId } = trackingIds();
        if (!sessionId || !visitorId) return;
        fetch("/api/track/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({ sessionId, visitorId, path: window.location.pathname, referrer: document.referrer || undefined }),
        }).catch(() => {});
      } catch {
        /* ignore */
      }
    }
    ping();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") ping();
    }, 25_000);
    return () => clearInterval(id);
  }, []);

  return null;
}
