export type ConsentChoice = "accepted" | "rejected" | "undecided";
export type TrackingEvent =
  | "PageView"
  | "ViewContent"
  | "SelectSize"
  | "CTAClick"
  | "AddToCart"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase";

type TrackingPayload = Record<string, string | number | boolean | undefined>;

type TrackingWindow = Window &
  typeof globalThis & {
    dataLayer?: unknown[];
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[][]; loaded?: boolean; version?: string; callMethod?: (...a: unknown[]) => void };
    _fbq?: unknown;
    gtag?: (...args: unknown[]) => void;
  };

const CONSENT_KEY = "stpt-cookie-consent";
const DEDUPE_PREFIX = "stpt-event:";
const VISITOR_KEY = "stpt-vid";
const SESSION_KEY = "stpt-sid";
const ATTR_FIRST_KEY = "stpt-attr-first";

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

/**
 * Modelo opt-out: rastreia por padrão (inclusive "undecided"), só NÃO rastreia
 * se a pessoa recusou explicitamente. Necessário para o tráfego pago registrar
 * conversões no Meta. O banner continua permitindo recusar.
 */
export function trackingAllowed(): boolean {
  return getConsentChoice() !== "rejected";
}

export function setConsentChoice(choice: Exclude<ConsentChoice, "undecided">): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(CONSENT_KEY, choice);
  window.dispatchEvent(new Event("stpt-consent-change"));
}

export function newEventId(): string {
  if (isBrowser() && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function persistentId(key: string): string {
  if (!isBrowser()) return "";
  try {
    let id = window.localStorage.getItem(key);
    if (!id) {
      id = newEventId();
      window.localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "";
  }
}

function sessionId(): string {
  if (!isBrowser()) return "";
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = newEventId();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function readCookie(name: string): string | undefined {
  if (!isBrowser()) return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

type Touch = { source?: string; medium?: string; campaign?: string; content?: string; term?: string; id?: string; at?: number };

function currentTouch(): Touch {
  if (!isBrowser()) return {};
  const p = new URLSearchParams(window.location.search);
  const t: Touch = {
    source: p.get("utm_source") || undefined,
    medium: p.get("utm_medium") || undefined,
    campaign: p.get("utm_campaign") || undefined,
    content: p.get("utm_content") || undefined,
    term: p.get("utm_term") || undefined,
    id: p.get("utm_id") || undefined,
    at: Date.now(),
  };
  return t;
}

/** IDs anônimos de sessão/visitante (heartbeat do "online ao vivo"). */
export function trackingIds(): { sessionId: string; visitorId: string } {
  return { sessionId: sessionId(), visitorId: persistentId(VISITOR_KEY) };
}

/** Contexto enviado ao servidor no checkout (atribuição + ids da Meta). */
export function buildClientContext(adsConsent: boolean) {
  if (!isBrowser()) return undefined;
  const p = new URLSearchParams(window.location.search);
  const last = currentTouch();
  let first: Touch = last;
  try {
    const saved = window.localStorage.getItem(ATTR_FIRST_KEY);
    if (saved) first = JSON.parse(saved) as Touch;
    else if (last.source || last.campaign) window.localStorage.setItem(ATTR_FIRST_KEY, JSON.stringify(last));
  } catch {
    /* ignore */
  }
  return {
    sessionId: sessionId(),
    visitorId: persistentId(VISITOR_KEY),
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
    adsConsent,
    attribution: {
      first,
      last,
      fbclid: p.get("fbclid") || undefined,
      gclid: p.get("gclid") || undefined,
      ttclid: p.get("ttclid") || undefined,
      landingPage: window.location.pathname + window.location.search,
      referrer: document.referrer || undefined,
    },
  };
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
  if (!isBrowser() || !trackingAllowed()) return;

  const win = trackingWindow();
  if (!win) return;

  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  if (metaPixelId && !win.fbq) {
    // Snippet oficial do Meta Pixel (fila até o fbevents.js carregar).
    const fbq: NonNullable<TrackingWindow["fbq"]> = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue?.push(args);
    };
    if (!win._fbq) win._fbq = fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    win.fbq = fbq;
    injectScript("stpt-meta-pixel", "https://connect.facebook.net/en_US/fbevents.js");
    win.fbq("init", metaPixelId);
    // O PageView é disparado por quem chama track("PageView"), para evitar duplicação.
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
    injectScript("stpt-google-tag", `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleId)}`);
  }
}

function alreadyTracked(key: string): boolean {
  if (!isBrowser()) return false;
  const fingerprint = `${DEDUPE_PREFIX}${key}`;
  try {
    if (window.sessionStorage.getItem(fingerprint)) return true;
    window.sessionStorage.setItem(fingerprint, "1");
  } catch {
    return false;
  }
  return false;
}

/**
 * Dispara um evento. `eventId` deduplica com o CAPI (servidor). `once` evita repetição
 * por sessão. Purchase NUNCA é disparado por clique — só na página do pedido pago,
 * com o event_id do servidor.
 */
export function track(event: TrackingEvent, payload: TrackingPayload = {}, opts: { eventId?: string; once?: boolean } = {}): boolean {
  if (!isBrowser() || !trackingAllowed()) return false;
  if (opts.once && alreadyTracked(`${event}:${opts.eventId ?? window.location.pathname}`)) return false;

  initializeTrackingProviders();
  const win = trackingWindow();
  if (!win) return false;

  const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

  win.dataLayer = win.dataLayer ?? [];
  win.dataLayer.push({ event, ...cleanPayload });

  const fbOptions = opts.eventId ? { eventID: opts.eventId } : undefined;
  const standard: TrackingEvent[] = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "AddPaymentInfo", "Purchase"];
  if (standard.includes(event)) {
    win.fbq?.("track", event, cleanPayload, fbOptions);
  } else {
    win.fbq?.("trackCustom", event, cleanPayload);
  }

  win.gtag?.("event", event, cleanPayload);
  return true;
}
