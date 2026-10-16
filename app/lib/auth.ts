import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * Autenticação do admin — simples e sem tabela de sessão: senha única por ambiente
 * e cookie de sessão assinado (HMAC-SHA256 com AUTH_SECRET).
 *
 * Configure UMA das opções:
 * - ADMIN_PASSWORD_HASH = sha256(senha) em hex  (recomendado)
 * - ADMIN_PASSWORD      = senha em texto          (alternativa)
 * Sem nenhuma delas, o admin fica desativado (login impossível).
 */
const COOKIE = "stpt_admin";
const MAX_AGE_SEC = 60 * 60 * 12; // 12h

export function adminEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD);
}

function constEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): boolean {
  if (!input) return false;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) return constEq(crypto.createHash("sha256").update(input).digest("hex"), hash.toLowerCase());
  const plain = process.env.ADMIN_PASSWORD;
  if (plain) return constEq(input, plain);
  return false;
}

function secret(): string {
  return process.env.AUTH_SECRET || "somostodospt-dev";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  if (!constEq(sig, sign(payload))) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && exp * 1000 > Date.now();
}

export async function setAdminCookie() {
  const jar = await cookies();
  jar.set(COOKIE, createSessionToken(), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MAX_AGE_SEC });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function isAuthed(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(COOKIE)?.value);
}

export const ADMIN_COOKIE = COOKIE;
