/**
 * Camada de proteção do checkout (complementa o firewall da Vercel):
 * - formulários de compra recusam clientes de script (curl, python…), honeypot e envio rápido demais;
 * - limites persistentes de criação de pedidos (ver server/orders.ts).
 * Robôs legítimos (Google, Meta, WhatsApp) não são afetados: eles só leem páginas.
 */

/** Clientes HTTP de script — não são navegadores e não devem enviar pedidos/consultas. */
const SCRIPT_UA = /(curl|wget|python|httpx|aiohttp|go-http-client|libwww|scrapy|java\/|okhttp|node-fetch|undici|axios|postman|insomnia|headless|phantomjs|selenium|puppeteer|playwright)/i;

export function isScriptClient(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.length < 20) return true;
  return SCRIPT_UA.test(userAgent);
}

/**
 * Sinais de robô no envio do checkout: campo isca preenchido (invisível para pessoas)
 * ou formulário enviado rápido demais depois de aberto.
 */
export function looksLikeBotSubmission(input: { hp?: string | null; elapsedMs?: number | null }, minMs = 2500): boolean {
  if (input.hp && input.hp.trim() !== "") return true;
  if (typeof input.elapsedMs === "number" && input.elapsedMs >= 0 && input.elapsedMs < minMs) return true;
  return false;
}
