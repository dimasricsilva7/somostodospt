# Entregáveis — Somos Todos PT

- [x] **Fundação, organização e documentação do projeto — concluído**
  - Aplicação Next.js com App Router, TypeScript, Tailwind CSS, componentes reutilizáveis, Lucide e `next/image`.
  - Estrutura em `app/components`, `app/config`, `app/lib`, `public/images/products` e `public/images/brand`.
  - `.gitignore`, `.env.example`, `README.md`, manifesto `manus-routes.json` e guia de substituição das imagens.
  - Nenhum `.env.local`, token, senha ou chave privada versionado.

- [x] **Experiência de produto mobile-first e acessível — implementado**
  - Header, hero, galeria interativa, apresentação do design, detalhes, seleção de tamanho, oferta, informações da compra, FAQ, CTA final e footer.
  - Layout validado em desktop e viewport mobile de 390 px; CSS cobre 320, 375, 390, 430, 768 px e desktop, com foco visível, controles de toque, sem overflow horizontal e respeito a movimento reduzido.
  - As sete imagens da primeira remessa e cinco novas artes da remessa `PT.zip` foram incorporadas/otimizadas; embalagem e cenas de campanha recebem identificação de imagem ilustrativa.
  - Não há preço, desconto, frete, prazo, política, atendimento, avaliação, depoimento, selo, contagem ou urgência inventados.

- [x] **Cadastro comercial e seleção de tamanho — dados informados aplicados**
  - Cadastro central em `app/config/product.ts` para nome, preço, promoção, disponibilidade, tamanhos, tabela de medidas, especificações, mídia, FAQ e conteúdo operacional.
  - Exibir as opções PP, P, M, G, GG, XG, XXG e XXXG.
  - Tabela de medidas aparece somente após receber medidas reais do fabricante.
  - A página explica que a escolha de tamanho não é transferida automaticamente ao checkout externo sem suporte confirmado.
  - Exibir composição 90% algodão e 10% poliéster; impressão por sublimação; informar que não deve lavar na máquina nem a seco e não deve usar cloro, cândida ou outros alvejantes.
  - **Pendente do responsável:** preço e disponibilidade/estoque por tamanho, tabela de medidas, frete, prazo e políticas reais.

- [ ] **Checkout externo seguro e transparente — link recebido aguarda confirmação**
  - O link recebido é `https://pagseguropix.org/c/camiseta-somos-todos-pt`; não redirecionar compradores para ele até que o responsável confirme que controla/autorizou esse destino e valide as condições exibidas.
  - `getCheckoutUrl()` exige URL configurada, HTTPS, ausência de credenciais e host exato na allowlist `NEXT_PUBLIC_EXTERNAL_CHECKOUT_ALLOWED_HOSTS`.
  - URL ausente, inválida, insegura ou não autorizada gera mensagem clara; não há URL fictícia, redirecionamento arbitrário, coleta de pagamento ou carrinho falso.
  - Com checkout configurado, o visitante confirma o tamanho antes de seguir; cliques repetidos são bloqueados durante o redirecionamento.
  - A documentação oficial PagBank exemplifica links de pagamento no domínio `pagamento.pagbank.com.br`; o link fornecido usa domínio separado e coleta e-mail, nome, telefone e CPF. O responsável deve confirmar que é o checkout correto e revisar preço e afirmações comerciais exibidas nele.
  - **Pendente do responsável:** confirmação do domínio/checkout, preço para mostrar no site, disponibilidade, condições da oferta e confirmação sobre como selecionar o tamanho no checkout.

- [x] **Tracking, consentimento, SEO e segurança — implementado**
  - PageView, ViewContent, SelectSize, CTAClick e InitiateCheckout com consentimento e deduplicação; `Purchase` não é disparado nem simulado.
  - Meta Pixel, Google Ads e GA são opcionais por variáveis de ambiente; sem IDs, a aplicação continua funcionando.
  - Metadata, Open Graph, favicon, `robots.ts`, `sitemap.ts`, alt text, HTML semântico e canonical condicional à URL real.
  - Minimização de dados, sem segredos no cliente e sem dados pessoais inseridos em URLs.
  - **Pendente do responsável:** consentimento operacional/jurídico final e IDs reais de mídia.

- [x] **Validação automatizada — concluída**
  - `pnpm lint` passou sem erros.
  - `pnpm typecheck` passou.
  - `pnpm test` passou com 7 testes de checkout.
  - `pnpm build` passou com rotas estáticas `/`, `/privacidade`, `/termos`, `/trocas-e-devolucoes`, `robots.txt` e `sitemap.xml`.
  - HTTP local validou status 200 para a página, manifesto de rotas, robots, sitemap e imagens otimizadas.
  - Renderizações mobile (390 px) e desktop (1440 px) foram inspecionadas; não foi detectado overflow horizontal.

- [x] **GitHub e Vercel — concluído**
  - Commit `72fbd32de1155e8989d44d28e4af0cc50bae706d` enviado para `dimasricsilva7/somostodospt` na branch principal `main`.
  - Projeto Vercel `somostodospt-produtos` criado e conectado ao repositório GitHub.
  - Deploy de produção `dpl_F3cwfNLVqZwtADRMMZkytdygtLGH` em estado `READY`.
  - URL pública validada: `https://somostodospt-produtos.vercel.app`.
  - `NEXT_PUBLIC_SITE_URL` configurada na Vercel e redeploy validado com canonical, Open Graph, sitemap, robots, manifesto de rotas e imagem do produto.
