import assert from "node:assert/strict";
import test from "node:test";
import { getCheckoutUrl } from "../app/lib/checkout";

test("retorna estado claro quando não há URL de checkout", () => {
  const result = getCheckoutUrl({ allowedHosts: "checkout.exemplo.com" });
  assert.equal(result.status, "missing_url");
});

test("recusa URL inválida", () => {
  const result = getCheckoutUrl({
    checkoutUrl: "não-é-uma-url",
    allowedHosts: "checkout.exemplo.com",
  });
  assert.equal(result.status, "invalid_url");
});

test("recusa checkout sem HTTPS", () => {
  const result = getCheckoutUrl({
    checkoutUrl: "http://checkout.exemplo.com/pedido",
    allowedHosts: "checkout.exemplo.com",
  });
  assert.equal(result.status, "insecure_url");
});

test("recusa URL que contém credenciais", () => {
  const result = getCheckoutUrl({
    checkoutUrl: "https://usuario:senha@checkout.exemplo.com/pedido",
    allowedHosts: "checkout.exemplo.com",
  });
  assert.equal(result.status, "credentials_not_allowed");
});

test("exige lista explícita de hosts autorizados", () => {
  const result = getCheckoutUrl({ checkoutUrl: "https://checkout.exemplo.com/pedido" });
  assert.equal(result.status, "missing_allowed_hosts");
});

test("recusa host fora da lista permitida", () => {
  const result = getCheckoutUrl({
    checkoutUrl: "https://destino-desconhecido.com/pedido",
    allowedHosts: "checkout.exemplo.com",
  });
  assert.equal(result.status, "unauthorized_host");
});

test("aceita apenas URL HTTPS em host permitido e preserva a URL configurada", () => {
  const result = getCheckoutUrl({
    checkoutUrl: "https://checkout.exemplo.com/pedido?origem=campanha",
    allowedHosts: "outro.exemplo.com, checkout.exemplo.com",
  });

  assert.deepEqual(result, {
    status: "ready",
    host: "checkout.exemplo.com",
    url: "https://checkout.exemplo.com/pedido?origem=campanha",
  });
});
