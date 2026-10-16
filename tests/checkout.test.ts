import assert from "node:assert/strict";
import test from "node:test";
import { computeTotals, discountPct, formatOrderNumber, MIN_PIX_CENTS } from "../app/lib/pricing";
import { isValidCep, isValidCpf, isValidPhone, maskCpf, maskPhone, onlyDigits } from "../app/lib/validators";
import { checkoutSchema } from "../app/lib/validation";

// ───────────── Preço / totais ─────────────

test("computeTotals soma subtotal, frete e total", () => {
  const t = computeTotals([{ unitPriceCents: 7990, quantity: 2 }], 0);
  assert.equal(t.subtotalCents, 15980);
  assert.equal(t.shippingCents, 0);
  assert.equal(t.totalCents, 15980);
});

test("computeTotals aplica frete e limita desconto ao subtotal", () => {
  const t = computeTotals([{ unitPriceCents: 5000, quantity: 1 }], 1500, 99999);
  assert.equal(t.discountCents, 5000);
  assert.equal(t.totalCents, 1500); // 5000 - 5000 + 1500
});

test("discountPct só existe com preço antigo maior", () => {
  assert.equal(discountPct(7990, 9990), 20);
  assert.equal(discountPct(7990, 7990), null);
  assert.equal(discountPct(7990, null), null);
});

test("formatOrderNumber segue o padrão PTxxxxx-ano", () => {
  assert.match(formatOrderNumber(2026, 27684), /^PT\d{5}-2026$/);
});

test("valor mínimo do PIX é R$ 5,00", () => {
  assert.equal(MIN_PIX_CENTS, 500);
});

// ───────────── Validadores ─────────────

test("CPF válido e inválido", () => {
  assert.equal(isValidCpf("390.533.447-05"), true);
  assert.equal(isValidCpf("111.111.111-11"), false);
  assert.equal(isValidCpf("123"), false);
});

test("telefone celular e CEP", () => {
  assert.equal(isValidPhone("(11) 98888-7777"), true);
  assert.equal(isValidPhone("1198"), false);
  assert.equal(isValidCep("01001-000"), true);
  assert.equal(isValidCep("123"), false);
});

test("máscaras não deixam lixo", () => {
  assert.equal(onlyDigits("(11) 9.8888-7777"), "11988887777");
  assert.equal(maskCpf("39053344705"), "390.533.447-05");
  assert.equal(maskPhone("11988887777"), "(11) 98888-7777");
});

// ───────────── Schema do checkout ─────────────

const basePayload = {
  checkoutToken: "a1b2c3d4e5f6a7b8",
  size: "M",
  quantity: 2,
  customer: { name: "Maria Silva", email: "MARIA@Exemplo.com", phone: "(11) 98888-7777", cpf: "390.533.447-05" },
  address: { cep: "01001-000", street: "Rua X", number: "10", district: "Centro", city: "São Paulo", state: "sp" },
  marketingConsent: true,
};

test("checkout válido normaliza e-mail, UF, telefone e CPF", () => {
  const parsed = checkoutSchema.safeParse(basePayload);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.customer.email, "maria@exemplo.com");
    assert.equal(parsed.data.customer.phone, "11988887777");
    assert.equal(parsed.data.customer.cpf, "39053344705");
    assert.equal(parsed.data.address.state, "SP");
    assert.equal(parsed.data.size, "M");
  }
});

test("checkout rejeita tamanho fora da lista", () => {
  const parsed = checkoutSchema.safeParse({ ...basePayload, size: "ZZ" });
  assert.equal(parsed.success, false);
});

test("checkout rejeita CPF inválido", () => {
  const parsed = checkoutSchema.safeParse({ ...basePayload, customer: { ...basePayload.customer, cpf: "111.111.111-11" } });
  assert.equal(parsed.success, false);
});

test("checkout rejeita UF inexistente", () => {
  const parsed = checkoutSchema.safeParse({ ...basePayload, address: { ...basePayload.address, state: "ZZ" } });
  assert.equal(parsed.success, false);
});
