export type ConsentChoice = "accepted" | "rejected" | "undecided";
export type TrackingEvent =
  | "PageView"
  | "ViewContent"
  | "SelectSize"
  | "CTAClick"
  | "InitiateCheckout";

type TrackingPayload = Record<string, string | number | boolean | undefined>;

type TrackingWindow = Window &
  typeof globalThis & {
    dataLayer?: unknown[];
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[][] };
    gtag?: (...args: unknown[]) => void;
  };

const CONSENT_KEY = "stpt-cookie-consent";
const DEDUPE_PREFIX = "stpt-event:";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function trackingWindow(): TrackingWindow | undefined {
  return isBrowser() ? (window as TrackingWindow) : undefined;
}

export function getConsentChoice(): ConsentChoice {
  if (!isBrowser()) return "undecided";
  const value = window.localStorage.getItem(CONSENT_KEY);
  return value === "accepted" || value === "rejected" ? value : "undecided";
}

export function setConsentChoice(choice: Exclude<ConsentChoice, "undecided">): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(CONSENT_KEY, choice);
  window.dispatchEvent(new Event("stpt-consent-change"));
}

function injectScript(id: string, src: string): void {
  if (!isBrowser() || document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export function initializeTrackingProviders(): void {
  if (!isBrowser() || getConsentChoice() !== "accepted") return;

  const win = trackingWindow();
  if (!win) return;

  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  if (metaPixelId && !win.fbq) {
    const fbq: NonNullable<TrackingWindow["fbq"]> = (...args: unknown[]) => {
      fbq.queue?.push(args);
    };
    fbq.queue = [];
    win.fbq = fbq;
    fbq("init", metaPixelId);
    injectScript("stpt-meta-pixel", "https://connect.facebook.net/en_US/fbevents.js");
  }

  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID?.trim();
  const googleId = gaMeasurementId || googleAdsId;

  if (googleId && !win.gtag) {
    win.dataLayer = win.dataLayer ?? [];
    win.gtag = (...args: unknown[]) => {
      win.dataLayer?.push(args);
    };
    win.gtag("js", new Date());
    if (gaMeasurementId) win.gtag("config", gaMeasurementId);
    if (googleAdsId) win.gtag("config", googleAdsId);
    injectScript(
      "stpt-google-tag",
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleId)}`,
    );
  }
}

function alreadyTracked(event: TrackingEvent, payload: TrackingPayload): boolean {
  if (!isBrowser()) return false;
  const fingerprint = `${DEDUPE_PREFIX}${event}:${window.location.pathname}:${JSON.stringify(payload)}`;
  if (window.sessionStorage.getItem(fingerprint)) return true;
  window.sessionStorage.setItem(fingerprint, "1");
  return false;
}

export function track(event: TrackingEvent, payload: TrackingPayload = {}): boolean {
  if (!isBrowser() || getConsentChoice() !== "accepted") return false;
  if (alreadyTracked(event, payload)) return false;

  initializeTrackingProviders();
  const win = trackingWindow();
  if (!win) return false;

  const cleanPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );

  win.dataLayer = win.dataLayer ?? [];
  win.dataLayer.push({ event, ...cleanPayload });
  window.dispatchEvent(new CustomEvent("stpt:track", { detail: { event, ...cleanPayload } }));

  if (event === "PageView") {
    win.fbq?.("track", "PageView");
  } else if (event === "ViewContent" || event === "InitiateCheckout") {
    win.fbq?.("track", event, cleanPayload);
  } else {
    win.fbq?.("trackCustom", event, cleanPayload);
  }

  win.gtag?.("event", event, cleanPayload);
  return true;
}
