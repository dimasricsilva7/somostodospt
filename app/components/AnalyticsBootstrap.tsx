"use client";

import { useEffect } from "react";
import { initializeTrackingProviders, track } from "@/app/lib/tracking";

export function AnalyticsBootstrap() {
  useEffect(() => {
    function activateTracking() {
      initializeTrackingProviders();
      track("PageView");
      track("ViewContent", { content_type: "product", content_name: "Camiseta Somos Todos PT" });
    }

    activateTracking();
    window.addEventListener("stpt-consent-change", activateTracking);
    return () => window.removeEventListener("stpt-consent-change", activateTracking);
  }, []);

  return null;
}
