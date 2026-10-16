import { z } from "zod";
import { isValidCep, isValidCpf, isValidPhone, onlyDigits, UF_LIST } from "@/app/lib/validators";
import { ALL_SIZES } from "@/app/config/catalog";
import { MAX_QUANTITY } from "@/app/config/commerce";

const str = (max: number) => z.string().trim().max(max);
const optStr = (max: number) => z.string().trim().max(max).optional().nullable();

const touchSchema = z
  .object({ source: optStr(200), medium: optStr(200), campaign: optStr(200), content: optStr(200), term: optStr(200), id: optStr(64), at: z.number().optional() })
  .partial()
  .nullable()
  .optional();

export const clientContextSchema = z
  .object({
    sessionId: optStr(64),
    visitorId: optStr(64),
    fbp: optStr(200),
    fbc: optStr(500),
    adsConsent: z.boolean().optional(),
    attribution: z
      .object({
        first: touchSchema,
        last: touchSchema,
        fbclid: optStr(500),
        gclid: optStr(500),
        ttclid: optStr(500),
        landingPage: optStr(500),
        referrer: optStr(500),
      })
      .partial()
      .nullable()
      .optional(),
  })
  .partial();

export const customerSchema = z.object({
  name: str(120)
    .min(5, "Informe seu nome completo")
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, "Informe nome e sobrenome"),
  email: str(160).toLowerCase().email("E-mail inválido"),
  phone: z.string().transform(onlyDigits).refine(isValidPhone, "WhatsApp inválido"),
  // CPF é exigido pela BravoPay para gerar o PIX.
  cpf: z.string().transform(onlyDigits).refine(isValidCpf, "CPF inválido"),
});

export const addressSchema = z.object({
  cep: z.string().transform(onlyDigits).refine(isValidCep, "CEP inválido"),
  street: str(160).min(2, "Informe o endereço"),
  number: str(20).min(1, "Informe o número"),
  complement: optStr(80),
  district: str(80).min(1, "Informe o bairro"),
  city: str(80).min(2, "Informe a cidade"),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => (UF_LIST as readonly string[]).includes(v), "UF inválida"),
});

const ALLOWED_SIZES = ALL_SIZES as readonly string[];

export const checkoutSchema = z.object({
  checkoutToken: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  /** Anti-robô: campo isca (sempre vazio para pessoas) e tempo desde que o formulário abriu */
  hp: z.string().max(200).optional(),
  elapsedMs: z.number().int().min(0).max(864_000_000).optional(),
  /** Modelo escolhido (slug do catálogo). O servidor revalida produto, preço e disponibilidade. */
  productSlug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  /** Tamanho da camiseta escolhido — precisa estar entre os tamanhos habilitados. */
  size: z.string().trim().toUpperCase().refine((v) => ALLOWED_SIZES.includes(v), "Escolha um tamanho válido"),
  quantity: z.number().int().min(1).max(MAX_QUANTITY).default(1),
  customer: customerSchema,
  address: addressSchema,
  marketingConsent: z.boolean().default(false),
  /** event_id do AddPaymentInfo gerado no navegador (deduplicação com o CAPI). */
  paymentEventId: optStr(80),
  context: clientContextSchema.optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
