import "server-only";
import { sha256 } from "@/app/lib/crypto";

/**
 * Meta Conversions API (server-side). O token fica exclusivamente no servidor.
 * Pixel do navegador e CAPI usam o MESMO event_id para que a Meta deduplique.
 * Purchase só é enviado após pagamento confirmado pelo gateway.
 *
 * Configuração por ambiente:
 * - META_CAPI_TOKENS = "pixelId:token,pixelId2:token2"   (pares existentes)
 * - META_CAPI_TOKENS_ADDITIONAL = "pixelId:token"          (adicionar sem editar os existentes)
 * - META_ACCESS_TOKEN + NEXT_PUBLIC_META_PIXEL_ID          (compatibilidade legada)
 * As duas configurações podem coexistir; IDs duplicados usam META_CAPI_TOKENS.
 */
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";

export type CapiEventName = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "AddPaymentInfo" | "Purchase" | "Lead";

export type CapiUser = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  externalId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  fbc?: string | null;
  fbp?: string | null;
};

export type CapiEvent = {
  eventName: CapiEventName;
  eventId: string;
  eventSourceUrl: string;
  eventTime?: number;
  user: CapiUser;
  customData?: Record<string, unknown>;
};

/** Pixels + tokens configurados no ambiente. */
export function capiTargets(): { pixelId: string; token: string }[] {
  const targets = new Map<string, { pixelId: string; token: string }>();
  const rawValues = [process.env.META_CAPI_TOKENS, process.env.META_CAPI_TOKENS_ADDITIONAL];
  for (const rawValue of rawValues) {
    const raw = rawValue?.trim();
    if (!raw) continue;

    raw
      .split(",")
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const idx = pair.indexOf(":");
        return idx > 0 ? { pixelId: pair.slice(0, idx).trim(), token: pair.slice(idx + 1).trim() } : null;
      })
      .filter((target): target is { pixelId: string; token: string } => Boolean(target?.pixelId && target?.token))
      .forEach((target) => {
        if (!targets.has(target.pixelId)) targets.set(target.pixelId, target);
      });
  }

  // Mantém compatibilidade com a configuração antiga; valores explícitos em
  // Valores explícitos de CAPI têm precedência para o mesmo pixel.
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const token = process.env.META_ACCESS_TOKEN?.trim();
  if (pixelId && token && !targets.has(pixelId)) targets.set(pixelId, { pixelId, token });

  return Array.from(targets.values());
}

export const capiEnabled = () => capiTargets().length > 0;

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export function buildUserData(u: CapiUser) {
  const data: Record<string, string | string[]> = {};
  if (u.email) data.em = [sha256(norm(u.email))];
  if (u.phone) {
    const digits = u.phone.replace(/\D/g, "");
    data.ph = [sha256(digits.startsWith("55") ? digits : `55${digits}`)];
  }
  if (u.firstName) data.fn = [sha256(norm(u.firstName))];
  if (u.lastName) data.ln = [sha256(norm(u.lastName))];
  if (u.city) data.ct = [sha256(norm(u.city).replace(/\s+/g, ""))];
  if (u.state) data.st = [sha256(norm(u.state))];
  if (u.zip) data.zp = [sha256(u.zip.replace(/\D/g, ""))];
  if (u.email || u.phone) data.country = [sha256("br")];
  if (u.externalId) data.external_id = [sha256(u.externalId)];
  if (u.ip && u.ip !== "unknown") data.client_ip_address = u.ip;
  if (u.userAgent) data.client_user_agent = u.userAgent;
  if (u.fbc) data.fbc = u.fbc;
  if (u.fbp) data.fbp = u.fbp;
  return data;
}

/** Envio best-effort: nunca lança erro nem bloqueia o fluxo de compra. */
export async function sendCapiEvent(event: CapiEvent): Promise<void> {
  const targets = capiTargets();
  if (!targets.length) return;

  const testCode = process.env.META_TEST_EVENT_CODE;
  const body = JSON.stringify({
    data: [
      {
        event_name: event.eventName,
        event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        action_source: "website",
        event_source_url: event.eventSourceUrl,
        user_data: buildUserData(event.user),
        custom_data: event.customData ?? {},
      },
    ],
    ...(testCode ? { test_event_code: testCode } : {}),
  });

  // Mesmo evento (mesmo event_id) para cada pixel, cada um com o seu token.
  await Promise.all(
    targets.map(async ({ pixelId, token }) => {
      try {
        const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          cache: "no-store",
        });
        if (!res.ok) {
          const text = (await res.text().catch(() => "")).slice(0, 300);
          console.error(JSON.stringify({ scope: "meta-capi", event: event.eventName, pixel: pixelId, status: res.status, error: text }));
        }
      } catch (err) {
        console.error(JSON.stringify({ scope: "meta-capi", event: event.eventName, pixel: pixelId, error: err instanceof Error ? err.message : "network" }));
      }
    })
  );
}

/** Reconstrói o fbc a partir do fbclid salvo quando o cookie _fbc não está disponível. */
export function fbcFromClickId(fbclid: string | null | undefined, createdAt: Date): string | undefined {
  return fbclid ? `fb.1.${createdAt.getTime()}.${fbclid}` : undefined;
}
