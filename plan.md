# Plano de implementação — Somos Todos PT

## Escopo confirmado

Construir uma landing page pública, mobile-first e focada em conversão para a camiseta **Somos Todos PT**, usando Next.js com App Router, TypeScript, Tailwind CSS, componentes reutilizáveis, Lucide e `next/image`. A página será estática e compatível com Vercel; não haverá servidor, banco de dados, carrinho, coleta de pagamento ou integração de pagamento própria.

As imagens originais do produto vieram de `camisetapt.zip`; uma nova remessa `PT.zip` acrescentou cinco imagens ilustrativas de embalagem, modelos e multidão. As novas imagens foram convertidas para WebP sem recortes que removam conteúdo e são identificadas como ilustrativas quando a cena puder sugerir embalagem ou contexto real. A composição do tecido (90% algodão e 10% poliéster), a impressão por sublimação e os cuidados de lavagem foram fornecidos pelo responsável e podem ser publicados.

Os tamanhos informados para exibição são PP, P, M, G, GG, XG, XXG e XXXG. A composição, o método de impressão e os cuidados de lavagem também foram informados. A tabela de medidas, preço, estoque, frete, prazo, atendimento, políticas e dados legais ainda não foram fornecidos e não serão inventados. O link externo recebido será verificado antes de autorizar redirecionamento de compradores ou espelhar seu preço/promessas no site.

## Arquitetura

| Área | Decisão |
| --- | --- |
| Framework | Next.js (App Router) + React + TypeScript |
| Estilo | Tailwind CSS e estilos globais de marca |
| Interatividade | Client Components apenas para galeria, tamanhos, FAQ, consentimento, CTAs e tracking |
| Conteúdo | Configuração tipada em `app/config/product.ts` |
| Checkout | `app/lib/checkout.ts`, lendo somente variáveis públicas, validando HTTPS e domínio permitido |
| Marketing | `app/lib/tracking.ts` e cliente de consentimento sem `Purchase` simulado |
| SEO | Metadata estática; canonical/URLs sociais apenas quando `NEXT_PUBLIC_SITE_URL` real existir; `sitemap.ts` e `robots.ts` |
| Mídia | `public/images/products/` e `public/images/brand/`, com guia de substituição |
| Publicação | Repositório gerenciado da Manus como origem canônica e projeto Vercel `somostodospt-produtos` conectado ao GitHub; sincronizar alterações com a branch de produção |

## Fluxo de compra

1. O visitante pode selecionar um dos tamanhos fornecidos: PP, P, M, G, GG, XG, XXG ou XXXG.
2. Um CTA mostra a seleção no resumo da oferta.
3. A função `getCheckoutUrl()` aceita somente URL HTTPS e host explicitamente autorizado por `NEXT_PUBLIC_EXTERNAL_CHECKOUT_ALLOWED_HOSTS`; o domínio fornecido `pagseguropix.org` permanece desativado até o responsável confirmar que é o destino correto e autorizado.
4. Na ausência de link, allowlist ou tamanho exigido, a página apresenta uma mensagem clara e não redireciona.
5. Com checkout configurado, o visitante vê que deverá confirmar o tamanho no checkout externo; o redirecionamento só é feito em um clique final e protegido contra duplicação.
6. `InitiateCheckout` ocorre somente nesse clique final. `Purchase` não é implementado sem confirmação confiável do provedor.

## Direção de design

### Alternativas consideradas

- **E-commerce editorial de manifesto** — narrativa visual e tipografia expressiva, probabilidade 0,07.
- **Catálogo institucional minimalista** — conteúdo modular e discreto, probabilidade 0,04.
- **Streetwear de pôster serigráfico** — contrastes brutos e composição gráfica de campanha, probabilidade 0,06.

### Escolha: e-commerce editorial de manifesto

- **Movimento:** editorial contemporâneo com referências de pôster serigráfico e comunicação de campanha, sem imitar uma organização oficial.
- **Princípios:** impacto imediato; leitura rápida no celular; transparência comercial; identidade sem ruído decorativo.
- **Filosofia de cor:** vermelho `#D90018` como força e assinatura, preto para contraste tipográfico, branco para respiro e cinza claro para conteúdo técnico neutro.
- **Paradigma de layout:** sequência vertical de “faixas” editoriais, alternando blocos vermelhos, claros e escuros; no desktop, hero assimétrico de mídia + argumento comercial.
- **Elementos de assinatura:** estrela geométrica discreta; filetes em verde/amarelo somente como acentos do design; etiquetas de “cadastro pendente” visíveis apenas em áreas ainda sem informações fornecidas.
- **Interação:** estados de seleção claros, acordeões acessíveis e CTAs que explicam o próximo passo real; nada decorativo sem função.
- **Animação:** transições curtas de opacidade e deslocamento, com redução/remoção sob `prefers-reduced-motion`.
- **Tipografia:** família de display condensada do sistema para headlines e tipografia de sistema legível para textos e controles, evitando carregamentos externos desnecessários.
- **Essência da marca:** camiseta de mensagem para quem quer expressar identidade através do que veste. Personalidade: direta, vibrante, consciente.
- **Voz:** frases breves, afirmativas e transparentes. Exemplos: “Vista suas ideias.” e “Seu tamanho será confirmado no checkout.”
- **Wordmark e marca:** monograma de estrela dentro de selo circular acompanhado de “SOMOS TODOS PT” em caixa alta e tipografia condensada.
- **Cor-assinatura:** Vermelho Manifesto `#D90018`.

## Estrutura de pastas

```text
app/
  components/       Componentes de seção e controles interativos
  config/           Cadastro central do produto e textos editáveis
  lib/              Checkout, tracking e utilitários
  globals.css       Tokens e estilos globais
  layout.tsx        Metadata base
  page.tsx          Composição da página
  robots.ts         Robots público
  sitemap.ts        Sitemap público
public/
  images/brand/     Marca e favicon
  images/products/  Fotos reais otimizadas
  manus-routes.json Manifesto de rotas públicas
```

## Dependências e material pendente

- As dependências serão limitadas a Next.js, React, Tailwind e Lucide.
- O link recebido `https://pagseguropix.org/c/camiseta-somos-todos-pt` não será ativado até confirmar o vínculo/autorização do host: a documentação oficial PagBank dá como exemplo de pagamento `https://pagamento.pagbank.com.br/...`, enquanto a página fornecida está em um domínio separado e solicita dados pessoais.
- O projeto Vercel `somostodospt-produtos` foi criado na conta autenticada, conectado ao GitHub e publicado em produção; o domínio padrão real foi usado para canonical, Open Graph e sitemap.
- O projeto WebDev mantém um repositório gerenciado pela Manus e o deploy Vercel está conectado ao repositório GitHub indicado; alterações publicadas devem ser sincronizadas com a branch de produção sem trocar o repositório canônico.
