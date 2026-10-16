"use client";

import { useEffect } from "react";
import { initializeTrackingProviders, track, trackingIds } from "@/app/lib/tracking";

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

export function AnalyticsBootstrap() {
  useEffect(() => {
    function activateTracking() {
      initializeTrackingProviders();
      track("PageView");
      track("ViewContent", { content_type: "product", content_name: "Camiseta Somos Todos PT" });
    }

    activateTracking();
    window.addEventListener("stpt-consent-change", activateTracking);

    // Heartbeat do "online ao vivo" (anônimo: id de sessão + página)
    ping();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") ping();
    }, 25_000);

    return () => {
      window.removeEventListener("stpt-consent-change", activateTracking);
      clearInterval(id);
    };
  }, []);

  return null;
}
