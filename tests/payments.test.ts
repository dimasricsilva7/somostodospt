import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPixBody,
  processWebhook,
  signWebhookPayload,
  statusFromEvent,
  verifyWebhookSignature,
  type BravopayWebhookEvent,
} from "../app/lib/payments/bravopay";
import { canTransition } from "../app/lib/order-status";

// ───────────── Corpo da cobrança PIX ─────────────

test("buildPixBody monta o corpo no contrato da BravoPay", () => {
  const body = buildPixBody({
    amountCents: 7990,
    idempotencyKey: "k",
    externalReference: "PT12345-2026",
    description: "Camiseta",
    customer: { name: "Ana Souza", email: "ana@exemplo.com", cpf: "390.533.447-05", phone: "(11) 98888-7777" },
  });
  assert.equal(body.amount_cents, 7990);
  assert.equal(body.method, "pix");
  assert.equal(body.external_reference, "PT12345-2026");
  assert.equal(body.customer.cpf, "39053344705");
  assert.equal(body.customer.phone, "11988887777");
  assert.equal(body.expires_in, 3600);
});

// ───────────── Assinatura do webhook ─────────────

const secret = "webhook-secret";
const rawBody = JSON.stringify({ id: "evt_1", type: "transaction.paid", created: 1, data: { id: "tx_1", status: "PAID", amount_cents: 7990 } });

test("assinatura válida é aceita (round trip)", () => {
  const ts = Math.floor(Date.now() / 1000);
  const sig = signWebhookPayload(rawBody, secret, ts);
  assert.equal(verifyWebhookSignature(rawBody, sig, secret), true);
});

test("payload adulterado é rejeitado", () => {
  const ts = Math.floor(Date.now() / 1000);
  const sig = signWebhookPayload(rawBody, secret, ts);
  assert.equal(verifyWebhookSignature(rawBody + " ", sig, secret), false);
});

test("segredo errado é rejeitado", () => {
  const ts = Math.floor(Date.now() / 1000);
  const sig = signWebhookPayload(rawBody, secret, ts);
  assert.equal(verifyWebhookSignature(rawBody, sig, "outro-segredo"), false);
});

test("timestamp antigo (replay) é rejeitado", () => {
  const old = Math.floor(Date.now() / 1000) - 10000;
  const sig = signWebhookPayload(rawBody, secret, old);
  assert.equal(verifyWebhookSignature(rawBody, sig, secret), false);
});

test("sem assinatura ou sem segredo é rejeitado", () => {
  assert.equal(verifyWebhookSignature(rawBody, null, secret), false);
  assert.equal(verifyWebhookSignature(rawBody, "t=1,v1=abc", undefined), false);
});

test("processWebhook rejeita assinatura inválida sem lançar", () => {
  const headers = new Headers({ "bravopay-signature": "t=1,v1=deadbeef" });
  const result = processWebhook(rawBody, headers);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "invalid_signature");
});

// ───────────── Status efetivo do evento ─────────────

test("o tipo do evento prevalece sobre data.status", () => {
  const paid = { id: "e", type: "transaction.paid", created: 1, data: { id: "t", status: "PENDING", amount_cents: 1 } } as BravopayWebhookEvent;
  assert.equal(statusFromEvent(paid), "PAID");
  const expired = { id: "e", type: "transaction.expired", created: 1, data: { id: "t", status: "PENDING", amount_cents: 1 } } as BravopayWebhookEvent;
  assert.equal(statusFromEvent(expired), "EXPIRED");
});

// ───────────── Transições de status ─────────────

test("transições de status do pedido", () => {
  assert.equal(canTransition("PENDING", "PAID"), true);
  assert.equal(canTransition("PIX_GENERATED", "PAID"), true);
  assert.equal(canTransition("PAID", "PENDING"), false);
  assert.equal(canTransition("PAID", "PAID"), false);
  assert.equal(canTransition("EXPIRED", "PENDING"), true);
  assert.equal(canTransition("CANCELLED", "PAID"), false);
});
