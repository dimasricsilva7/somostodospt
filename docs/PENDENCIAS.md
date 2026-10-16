# Pendências para receber pagamentos reais

Ordenadas por prioridade. Sem os itens **bloqueantes**, o checkout não cobra de verdade.

## 🔴 Bloqueantes (sem isto não há venda real)

1. **Preço real da camiseta** — editar `app/config/product.ts`:
   - `priceInCents` (ex.: `7990` = R$ 79,90). Enquanto for `undefined`, o checkout se recusa a
     gerar PIX e a landing mostra "valor em atualização". **Nenhum valor foi inventado.**
   - Opcional: `compareAtPriceInCents` (preço "de") para mostrar desconto real.

2. **Banco de dados (Neon)** — definir na Vercel:
   - `DATABASE_URL` (pooled) e `DATABASE_URL_UNPOOLED` (direto, para migrations).
   - As tabelas são criadas pelo `prisma migrate deploy` no build da Vercel.

3. **BravoPay (produção)** — definir na Vercel (somente no servidor):
   - `BRAVOPAY_API_KEY` — chave real da conta BravoPay.
   - `BRAVOPAY_WEBHOOK_SECRET` — segredo do endpoint de webhook.
   - No painel BravoPay, cadastrar o webhook: `https://SEU-DOMINIO/api/webhooks/bravopay`
     assinando os eventos `transaction.*`.

4. **`NEXT_PUBLIC_SITE_URL`** — URL pública real (sem barra final). Usada nos links do pedido e no CAPI.

5. **`AUTH_SECRET`** — string aleatória de 32+ bytes (hash de IP/LGPD).

## 🟡 Importantes (qualidade da operação)

6. **Frete e prazo** — `app/config/commerce.ts`:
   - `shipping.mode` (`"free"` ou `"flat"` com `cents`) e `shipping.label`. Padrão: frete grátis (R$ 0).
   - `shipping.etaText`: só preencher com prazo real combinado com a transportadora.

7. **Meta Pixel + CAPI** (tráfego pago):
   - `NEXT_PUBLIC_META_PIXEL_ID` (navegador) e `META_CAPI_TOKENS` = `pixelId:token` (servidor),
     ou `META_ACCESS_TOKEN` + o pixel acima. Sem isso, o site funciona, mas não há rastreamento.
   - Eventos: `PageView`, `ViewContent`, `InitiateCheckout`, `AddPaymentInfo` e `Purchase`
     (este só após confirmação real, deduplicado por `event_id`).

8. **Tabela de medidas** — `product.sizeGuide` em `app/config/product.ts`. Só aparece com medidas reais.

9. **Disponibilidade por tamanho** — hoje todos os 8 tamanhos (PP…XXXG) ficam habilitados. Se algum
   não tiver estoque, remova-o de `product.availableSizes`.

10. **Políticas** — revisar `/privacidade`, `/termos`, `/trocas-e-devolucoes` e o canal de atendimento.

## 🟢 Opcionais

11. **Avaliações reais** — `reviews` em `app/config/commerce.ts`. Vazio por padrão (mostra sinais de
    confiança). **Não inventar depoimentos.**
12. **Barra de urgência** — `urgency.enabled` em `commerce.ts`. Só ative com promoção de prazo real
    (`endsAt`) ou estoque realmente limitado (`stockLeft`). **Sem cronômetro falso.**
13. **Google Ads/Analytics** — `NEXT_PUBLIC_GOOGLE_ADS_*` / `NEXT_PUBLIC_GA_MEASUREMENT_ID`.

## Como testar o fluxo sem dinheiro real

Com um banco acessível e `BRAVOPAY_MODE=mock` (fora de produção), o checkout gera um PIX
**fictício e não pagável** (`MOCK-PIX-SOMOSTODOSPT-…`). Isso valida criação de pedido, tamanho,
geração de código, QR e telas — sem transação financeira. A confirmação de pagamento em mock
pode ser simulada por um webhook de teste assinado com `BRAVOPAY_WEBHOOK_SECRET`.
