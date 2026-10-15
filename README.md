# Somos Todos PT — Landing Page de Produto

Landing page mobile-first para a camiseta Somos Todos PT. A página apresenta o produto, as opções de tamanho fornecidas, suas especificações confirmadas e uma galeria com imagens originais do responsável. O checkout externo exige HTTPS e uma allowlist explícita de domínio; o link informado nesta atualização permanece **desativado até confirmação do responsável**.

## Stack e execução

- Next.js App Router, React 19, TypeScript e Tailwind CSS 4
- Lucide React e `next/image`
- Testes unitários com `tsx --test`

```bash
pnpm install
pnpm dev
```

Acesse `http://localhost:3000`. Para validar uma versão de produção:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

## Estrutura

```text
app/
  components/              # Seções e interações da página
  config/product.ts        # Dados do produto, especificações, tamanhos, mídia e FAQ
  config/site.ts           # Configuração pública da marca e URL canônica
  lib/checkout.ts          # Validação segura do checkout externo
  lib/tracking.ts          # Consentimento e eventos de marketing
  privacidade/             # Página provisória de política de privacidade
  termos/                  # Página provisória de termos de compra
  trocas-e-devolucoes/     # Página provisória de trocas/devoluções
  sitemap.ts e robots.ts   # SEO técnico
public/
  images/brand/            # Espaço para ativos da marca
  images/products/         # Fotos e imagens WebP otimizadas
  manus-routes.json        # Manifesto de rotas públicas
```

## Cadastro atual do produto

`app/config/product.ts` é a fonte central editável.

- **Tamanhos exibidos:** PP, P, M, G, GG, XG, XXG e XXXG.
- **Composição:** 90% algodão e 10% poliéster.
- **Impressão:** sublimação.
- **Cuidados informados:** não lavar na máquina nem a seco; não usar cloro, cândida ou outros alvejantes.
- **Ainda pendentes:** preço e estoque por tamanho, tabela de medidas, frete, prazo, atendimento, políticas comerciais e dados legais.

A tabela de medidas só aparece após receber as medidas reais do fabricante. A escolha de tamanho é exibida antes do checkout, mas não é transmitida automaticamente ao serviço externo.

## Imagens do produto

As sete imagens da primeira remessa `camisetapt.zip` e cinco novas artes de `PT.zip` foram convertidas para WebP, preservando proporção e mantendo os originais fora do diretório público. As novas artes de embalagem, modelos e cenas de campanha são marcadas como **ilustrativas**; não comprovam embalagem incluída, evento real, estoque ou uma condição comercial.

A galeria é configurada no array `media` de `app/config/product.ts`. Consulte [`public/images/products/README.md`](public/images/products/README.md) antes de substituir arquivos.

## Checkout externo

A função `getCheckoutUrl()` em `app/lib/checkout.ts` só aceita uma URL configurada com HTTPS, sem credenciais embutidas, e um hostname exato explicitamente listado. As variáveis são:

```dotenv
NEXT_PUBLIC_EXTERNAL_CHECKOUT_URL=
NEXT_PUBLIC_EXTERNAL_CHECKOUT_ALLOWED_HOSTS=
```

Se a URL, o HTTPS ou a allowlist forem inválidos/ausentes, a página informa que nenhum redirecionamento será feito. Nenhum dado pessoal é anexado à URL. A página não coleta pagamentos nem envia evento `Purchase` sem uma confirmação confiável do provedor.

O endereço recebido foi `https://pagseguropix.org/c/camiseta-somos-todos-pt`. Ele não foi configurado: a documentação oficial do [Checkout e Link de Pagamento PagBank](https://developer.pagbank.com.br/docs/checkout) exemplifica a URL de pagamento no domínio `pagamento.pagbank.com.br`, enquanto o link enviado usa outro domínio e sua página pede e-mail, nome, telefone e CPF, além de mostrar preço e condições que ainda não foram confirmados pela loja. Isso não comprova fraude nem comprova autorização. Antes de permitir redirecionamento de clientes, o responsável deve confirmar que controla e autoriza o destino e conferir as condições apresentadas. O preço permanece oculto na landing page até confirmação.

Quando o destino autorizado estiver confirmado, configure a URL integral e o host exato correspondente na allowlist. Não inclua segredos em variáveis `NEXT_PUBLIC_*`.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` apenas no ambiente local. Nunca faça commit de `.env.local`.

| Variável | Propósito | Obrigatória agora? |
| --- | --- | --- |
| `NEXT_PUBLIC_EXTERNAL_CHECKOUT_URL` | URL pública do checkout externo confirmado | Não — necessária para ativar o redirecionamento |
| `NEXT_PUBLIC_EXTERNAL_CHECKOUT_ALLOWED_HOSTS` | Hosts HTTPS autorizados, separados por vírgula | Não — necessária junto com a URL |
| `NEXT_PUBLIC_SITE_URL` | URL HTTPS do site para canonical, OG e sitemap | Já configurada na produção |
| `NEXT_PUBLIC_META_PIXEL_ID` | ID público do Meta Pixel | Não |
| `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID` | ID público do Google Ads | Não |
| `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` | Rótulo público de conversão do Google Ads | Não |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | ID público do Google Analytics | Não |

Nenhuma variável pública deve conter token, senha, chave privada ou segredo de pagamento.

## Marketing, consentimento e LGPD

- O banner de cookies começa sem opção pré-marcada.
- Ao recusar, nenhuma tag de marketing é inicializada.
- Ao aceitar, a aplicação pode carregar Meta Pixel e Google tag somente se os IDs estiverem configurados.
- Eventos previstos: `PageView`, `ViewContent`, `SelectSize`, `CTAClick` e `InitiateCheckout`, com deduplicação.
- `Purchase` não é implementado: um clique não confirma uma compra.
- Não há envio de dados pessoais às plataformas de anúncio nem parâmetros pessoais em URLs.

## SEO e deploy

A página publica metadata, Open Graph, Twitter Card, favicon, `robots.ts`, `sitemap.ts`, foco visível, navegação por teclado, textos alternativos e preferência por movimento reduzido. Canonical e sitemap usam a URL real de produção `https://somostodospt-produtos.vercel.app`.

O projeto Vercel `somostodospt-produtos` está conectado ao GitHub `dimasricsilva7/somostodospt` na branch principal. O deploy automático publica mudanças aceitas em `main`.

## Pendências comerciais

- Confirmar preço e disponibilidade/estoque de cada tamanho.
- Fornecer tabela de medidas real.
- Confirmar URL e domínio autorizados do checkout, revisar preço e demais condições mostradas nele e confirmar como selecionar o tamanho.
- Fornecer frete, prazo, política de troca/devolução, atendimento e dados legais.
- Configurar, se desejado, IDs reais de Meta, Google Ads e Google Analytics.
- Confirmar os direitos de uso comercial das imagens, do nome, da marca e de quaisquer retratos.

## Segurança

- Sem painel administrativo, banco ou formulário de pagamento próprio.
- HTTPS, hostname exato permitido e ausência de credenciais na URL do checkout.
- Sem URL de checkout fictícia, carrinho falso, falsa confirmação de pedido ou compra simulada.
- Sem contadores falsos, avaliações fictícias, selos de segurança falsos ou promessas não verificadas.
