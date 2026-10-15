# Somos Todos PT — Landing Page de Produto

Landing page **mobile-first** para a camiseta vermelha Somos Todos PT. O projeto enfatiza a apresentação visual do produto, clareza antes do checkout e configuração segura do checkout externo BravoPay.

> **Status de lançamento:** a interface está preparada, mas a operação comercial só deve ser ativada após cadastrar dados reais de preço, disponibilidade, tamanhos, medidas, políticas, contato, URL BravoPay e domínio autorizado.

## Stack

- [Next.js](https://nextjs.org/) com App Router e TypeScript
- React 19 e Tailwind CSS 4
- Lucide React para ícones
- `next/image` para imagens otimizadas
- Testes unitários com `tsx --test`

## Como executar

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
  config/product.ts        # Cadastro comercial, textos, mídia, tamanhos e FAQ
  config/site.ts           # Configuração pública da marca e URL canônica
  lib/checkout.ts          # Validação segura do checkout externo
  lib/tracking.ts          # Consentimento e eventos de marketing
  privacidade/             # Página provisória de política de privacidade
  termos/                  # Página provisória de termos de compra
  trocas-e-devolucoes/     # Página provisória de trocas/devoluções
  sitemap.ts e robots.ts   # SEO técnico
public/
  images/brand/            # Espaço para ativos da marca
  images/products/         # Fotos WebP otimizadas e documentação de origem
  manus-routes.json        # Manifesto de rotas públicas
```

## Imagens do produto

As fotos enviadas em `camisetapt.zip` foram convertidas para WebP e incorporadas à galeria:

- frente do produto;
- verso do produto;
- modelo masculino;
- modelo feminino;
- close da estampa;
- detalhe individual de manga/costura;
- imagem lifestyle externa.

O arquivo de origem contendo uma montagem com alegações como composição do tecido, durabilidade e impressão não é exibido por inteiro. Os recortes usados removem essas chamadas, pois não há confirmação comercial dessas características. Consulte [`public/images/products/README.md`](public/images/products/README.md) antes de substituir os arquivos.

Para trocar uma imagem, adicione o novo arquivo em `public/images/products/` e atualize `src`, `alt`, `label` e `aspect` no array `media` de `app/config/product.ts`. Use imagens individuais; não use colagens como foto principal do SKU.

## Cadastro do produto

`app/config/product.ts` centraliza os valores editáveis.

| Campo | Estado atual | Ação necessária |
| --- | --- | --- |
| Nome, cor e modelagem | Cadastrados com base no briefing | Revisar se necessário |
| Fotos do produto | Cadastradas | Substituir apenas por fotos aprovadas |
| Preço e preço promocional | Vazios | Informar em centavos, apenas com valores reais |
| Disponibilidade e tamanhos | Vazios | Inserir somente estoque/tamanhos confirmados |
| Tabela de medidas | Vazia | Inserir medidas reais do fabricante |
| Especificações técnicas | Parcialmente pendentes | Confirmar tecido, impressão e lavagem antes de publicar |
| Frete, prazo e políticas | Pendentes | Fornecer conteúdo operacional real |
| Atendimento e dados legais | Pendentes | Fornecer canal oficial e textos legais |

A seleção de tamanho funciona automaticamente depois que `availableSizes` receber tamanhos reais. Enquanto a lista estiver vazia, a página **não** indica que algum tamanho esteja disponível. A tabela de medidas aparece somente quando `sizeGuide` tiver dados reais.

## BravoPay — checkout externo

A página não coleta dados de pagamento, não possui carrinho fictício e não confirma pedidos. A função `getCheckoutUrl()` em `app/lib/checkout.ts` exige:

1. `NEXT_PUBLIC_BRAVOPAY_CHECKOUT_URL` preenchida;
2. URL HTTPS válida, sem usuário ou senha embutidos;
3. host exato presente em `NEXT_PUBLIC_BRAVOPAY_ALLOWED_HOSTS`.

Se alguma condição falhar, a página informa que nenhum redirecionamento foi feito. O site não acrescenta tamanho, UTMs ou dados pessoais à URL da BravoPay sem suporte documentado do provedor.

Quando o checkout estiver pronto, configure a URL e o host real. Exemplo ilustrativo, **não use em produção**:

```dotenv
NEXT_PUBLIC_BRAVOPAY_CHECKOUT_URL=https://checkout.dominio-autorizado.exemplo/pedido
NEXT_PUBLIC_BRAVOPAY_ALLOWED_HOSTS=checkout.dominio-autorizado.exemplo
```

A escolha de tamanho é mostrada ao visitante antes do redirecionamento. Ela **não é enviada automaticamente** à BravoPay. É preciso confirmar, na documentação/conta do provedor, se há suporte oficial a variantes ou parâmetros seguros.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` apenas no ambiente local. Nunca faça commit de `.env.local`.

| Variável | Propósito | Obrigatória agora? |
| --- | --- | --- |
| `NEXT_PUBLIC_BRAVOPAY_CHECKOUT_URL` | URL pública do checkout externo | Não — necessária para ativar compra |
| `NEXT_PUBLIC_BRAVOPAY_ALLOWED_HOSTS` | Hosts HTTPS autorizados, separados por vírgula | Não — necessária junto ao checkout |
| `NEXT_PUBLIC_SITE_URL` | URL HTTPS final para canonical, OG e sitemap | Não — necessária após publicação real |
| `NEXT_PUBLIC_META_PIXEL_ID` | ID público do Meta Pixel | Não |
| `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID` | ID público do Google Ads | Não |
| `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` | Rótulo público de conversão do Google Ads | Não |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | ID público do Google Analytics | Não |

Nenhuma variável `NEXT_PUBLIC_*` deve conter token, senha, chave privada ou segredo de pagamento.

## Marketing, consentimento e LGPD

- O banner de cookies começa sem opção pré-marcada.
- Ao recusar, nenhuma tag de marketing é inicializada.
- Ao aceitar, a aplicação pode carregar Meta Pixel e Google tag **somente** se os IDs forem configurados.
- Eventos previstos: `PageView`, `ViewContent`, `SelectSize`, `CTAClick` e `InitiateCheckout`.
- Eventos são deduplicados por sessão, rota e payload para evitar disparos repetidos.
- `Purchase` não é implementado: um clique no CTA não é uma compra. A mensuração de compra exige confirmação documentada da BravoPay — por exemplo, integração oficial ou webhook validado.
- Não há envio de dados pessoais para plataformas de anúncios e não há parâmetros pessoais em URLs.

## SEO e acessibilidade

A página usa HTML inicial com conteúdo, hierarquia semântica, metadata, Open Graph, Twitter Card, favicon, `robots.ts`, `sitemap.ts`, foco visível, navegação por teclado, textos alternativos e preferência por movimento reduzido.

Canonical, `og:url`, `og:image` absoluto e sitemap só são publicados após configurar `NEXT_PUBLIC_SITE_URL` com a URL HTTPS real. Isso evita URLs inventadas ou internas.

## Deploy na Vercel

O projeto deve se chamar **`somostodospt-produtos`** e apontar para `dimasricsilva7/somostodospt` na branch principal. O framework é detectado como Next.js.

1. Conecte/autorize a conta Vercel que hospedará o site.
2. Crie ou vincule o projeto com o nome exato `somostodospt-produtos`.
3. Conecte o repositório e configure a branch principal como produção.
4. Cadastre as variáveis de ambiente reais na Vercel; não cadastre segredos em variáveis públicas.
5. Faça o deploy e, após obter a URL real, defina `NEXT_PUBLIC_SITE_URL` e redeploye.
6. Ative o checkout somente após preencher URL e host BravoPay autorizados, preço e tamanhos reais.

## Informações pendentes para lançamento comercial

- URL real do produto na BravoPay e domínio de checkout autorizado;
- preço, disponibilidade, tamanhos e tabela de medidas;
- composição, impressão, lavagem e demais especificações confirmadas;
- frete, prazo de entrega, pagamento e política de troca/devolução;
- canal oficial de atendimento e dados legais da operação;
- IDs reais de Meta, Google Ads e Google Analytics;
- URL definitiva do domínio para SEO e compartilhamento.

## Segurança

- Sem endpoints administrativos, banco ou coleta de dados de pagamento.
- Validação estrita de HTTPS, host autorizado e ausência de credenciais na URL externa.
- Sem URLs de checkout inventadas e sem redirecionamentos derivados de entrada do visitante.
- Sem contadores falsos, avaliações fictícias, selos de segurança falsos ou promessas não verificadas.

## Licença e uso de imagem

Confirme internamente os direitos de uso comercial das imagens, do nome, da marca e de quaisquer retratos antes da publicação comercial.
