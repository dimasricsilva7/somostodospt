# Somos Todos PT — Loja com checkout próprio (PIX)

Loja de produto único (camiseta **Somos Todos PT**) com landing page de conversão e
**checkout próprio integrado à BravoPay (PIX)**. O tamanho escolhido acompanha o pedido
do início ao fim, o pagamento é confirmado pelo gateway via webhook e o status é sempre
lido do servidor — nunca do navegador.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · pnpm
- Prisma + PostgreSQL (Neon)
- BravoPay (PIX) · Meta Pixel + Conversions API · `qrcode`
- Testes com `node --test` + `tsx`

```bash
pnpm install
pnpm db:generate
pnpm dev            # http://localhost:3000
```

Validação completa:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Fluxo de compra

1. Landing (`/`) → cliente escolhe o tamanho e clica em comprar.
2. Checkout próprio (`/checkout?tam=M`) → confirma/troca o tamanho, quantidade, dados e endereço.
3. `POST /api/checkout` valida tudo no servidor, **recalcula o total** e cria o pedido.
4. O backend cria a cobrança PIX real na BravoPay (`POST /transactions`) e guarda o `copia e cola`.
5. Cliente vai para `/pedido/<numero>?t=<token>` → vê **QR Code + copia e cola + valor + expiração**.
6. A página consulta `GET /api/orders/status` (que confirma no gateway) a cada poucos segundos.
7. Quando a BravoPay confirma (webhook `POST /api/webhooks/bravopay`, assinatura HMAC), o pedido vira `PAID`.
8. Só então o evento **Purchase** (Pixel + CAPI, deduplicado por `event_id`) é disparado.

O tamanho fica gravado no pedido (`Order.size`) e no snapshot — persiste até a confirmação.

## Estrutura

```text
app/
  components/              # Landing, urgência, avaliações, galeria, consentimento
  checkout/                # Checkout próprio (página + formulário)
  pedido/[numero]/         # Página do pedido: QR PIX, status em tempo real
  api/checkout/            # Cria o pedido + PIX
  api/orders/status/       # Consulta/renova o PIX (lê status real do gateway)
  api/webhooks/bravopay/   # Webhook assinado da BravoPay (idempotente)
  config/product.ts        # Produto, mídia, specs, FAQ
  config/commerce.ts       # Preço (pendência), frete, urgência, avaliações
  lib/payments/            # Integração BravoPay (contrato reaproveitado do CLEARFINGER)
  lib/meta/capi.ts         # Meta Conversions API (servidor)
  lib/validation.ts        # Schemas Zod do checkout
  server/orders.ts         # Núcleo: criar pedido, gerar/renovar PIX, aplicar status, Purchase
  server/webhooks.ts       # Processamento idempotente do webhook
prisma/schema.prisma       # Customer, Order, Payment, PaymentEvent, WebhookEvent
```

## Segurança

- Chave da BravoPay e tokens do CAPI **somente no servidor** (nunca em `NEXT_PUBLIC_*`).
- Webhook valida assinatura HMAC-SHA256 (`t=…,v1=…`) com anti-replay; sem assinatura válida → 401.
- Idempotência: `checkoutToken` (pedido), `Idempotency-Key` (cobrança), `eventId` único (webhook).
- Status de pagamento sempre do backend/gateway; o "Já paguei" do cliente nunca confirma nada.
- Total recalculado no servidor; honeypot, bloqueio de user-agent de script, limites por IP/e-mail.
- Pedido acessível só com `accessToken` secreto no link.

## Variáveis de ambiente

Veja `.env.example`. Nenhum segredo em `NEXT_PUBLIC_*`.

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | Sim | Postgres (Neon): pooled / direto (migrations) |
| `NEXT_PUBLIC_SITE_URL` | Sim | URL pública (canonical, OG, links do pedido, CAPI) |
| `AUTH_SECRET` | Sim | Hash de IP (LGPD) |
| `BRAVOPAY_API_KEY` | Sim (prod) | Criar cobranças PIX reais |
| `BRAVOPAY_WEBHOOK_SECRET` | Sim (prod) | Validar o webhook |
| `BRAVOPAY_MODE=mock` | Não | PIX fictício para testar o fluxo (bloqueado em produção) |
| `BRAVOPAY_PRODUCT_ID` | Não | Atribuição no painel BravoPay |
| `NEXT_PUBLIC_META_PIXEL_ID` | Não | Meta Pixel (navegador) |
| `META_CAPI_TOKENS` ou `META_ACCESS_TOKEN` | Não | Meta Conversions API (servidor) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` / `NEXT_PUBLIC_GOOGLE_ADS_*` | Não | Google (opcional) |

## Pendências para vender de verdade

Veja **[docs/PENDENCIAS.md](docs/PENDENCIAS.md)**. Em resumo: publicar o **preço real** em
`app/config/product.ts`, configurar `DATABASE_URL`, `BRAVOPAY_API_KEY` e `BRAVOPAY_WEBHOOK_SECRET`
na Vercel, cadastrar o webhook no painel BravoPay e preencher frete/prazo/políticas reais.
