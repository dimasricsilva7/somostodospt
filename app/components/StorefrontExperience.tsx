"use client";

import { ArrowRight, Info, ShieldCheck, ShoppingBag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { product, formatPrice } from "@/app/config/product";
import { priceReady } from "@/app/config/commerce";
import { newEventId, track } from "@/app/lib/tracking";
import { BrandMark } from "./BrandMark";
import { CookieConsent } from "./CookieConsent";
import { Faq } from "./Faq";
import { ProductGallery } from "./ProductGallery";
import { ProductMedia } from "./ProductMedia";
import { Reviews } from "./Reviews";
import { SizeSelector } from "./SizeSelector";
import { UrgencyBar } from "./UrgencyBar";

function scrollToSizeSelector() {
  document.getElementById("tamanho")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function StorefrontExperience() {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const currentPrice = formatPrice(product.priceInCents);
  const originalPrice = formatPrice(product.compareAtPriceInCents);
  const isCommerceReady = priceReady() && product.availableSizes.length > 0;

  function selectSize(size: string) {
    setSelectedSize(size);
    setNotice(undefined);
    track("SelectSize", { size });
  }

  function beginCheckout(source: string) {
    track("CTAClick", { source });

    if (!isCommerceReady) {
      setNotice("A compra será ativada assim que o preço for publicado pelo responsável pela loja.");
      return;
    }
    if (product.requiresSize && !selectedSize) {
      setNotice("Escolha um tamanho antes de continuar.");
      scrollToSizeSelector();
      return;
    }

    setNotice(undefined);
    track("InitiateCheckout", { content_name: product.name, size: selectedSize ?? "unica", currency: product.currency }, { eventId: newEventId() });
    const params = new URLSearchParams();
    if (selectedSize) params.set("tam", selectedSize);
    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <UrgencyBar />
      <header className="site-header">
        <div className="container site-header__inner">
          <a href="#produto" aria-label="Somos Todos PT — ir para o produto"><BrandMark compact /></a>
          <nav aria-label="Navegação principal" className="site-nav">
            <a href="#produto">Produto</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>
          <button type="button" className="button button--header" onClick={() => beginCheckout("cabecalho")}>
            <ShoppingBag size={16} aria-hidden="true" />
            <span>Comprar</span>
          </button>
        </div>
      </header>

      <main id="conteudo">
        <section id="produto" className="hero-section">
          <div className="hero-section__wash" aria-hidden="true" />
          <div className="container hero-section__layout">
            <div className="hero-section__copy">
              <p className="eyebrow eyebrow--light">SOMOS TODOS PT · CAMISETA</p>
              <h1>Vista suas ideias.<br />Expresse aquilo em que você acredita.</h1>
              <p className="hero-section__lead">
                Uma camiseta vermelha com estampa marcante em homenagem a Lula, criada para quem quer expressar sua identidade por meio do que veste.
              </p>
              <p className="hero-section__statement">Pagamento por PIX, com confirmação automática e entrega para todo o Brasil.</p>
              <div className="hero-section__price" aria-live="polite">
                {currentPrice ? (
                  <>
                    {originalPrice && <span className="price--compare">{originalPrice}</span>}
                    <strong>{currentPrice}</strong>
                  </>
                ) : (
                  <span>Valor em atualização pelo responsável pela loja</span>
                )}
              </div>
              <button type="button" className="button button--light button--large" onClick={() => beginCheckout("hero")}>
                QUERO A MINHA CAMISETA <ArrowRight size={19} aria-hidden="true" />
              </button>
              <p className="hero-section__fineprint">Escolha o tamanho, confirme seus dados e pague com PIX em um checkout seguro aqui no site.</p>
            </div>
            <div className="hero-section__visual">
              <span className="hero-section__star" aria-hidden="true">✦</span>
              <ProductMedia asset={product.media[0]} priority sizes="(max-width: 900px) 100vw, 50vw" />
              <div className="hero-section__label">Edição visual<br />Somos Todos PT</div>
            </div>
          </div>
        </section>

        {!isCommerceReady && (
          <section className="readiness-strip" aria-label="Status da configuração comercial">
            <div className="container readiness-strip__inner">
              <Info size={19} aria-hidden="true" />
              <p>Preço e disponibilidade estão em confirmação pelo responsável pela loja. A compra será ativada em seguida.</p>
            </div>
          </section>
        )}

        <ProductGallery media={product.media} />

        <section className="design-section">
          <div className="container design-section__layout">
            <div className="design-section__photo">
              <ProductMedia asset={product.media[4]} sizes="(max-width: 900px) 100vw, 42vw" />
            </div>
            <div className="design-section__copy">
              <p className="eyebrow">A COMPOSIÇÃO</p>
              <h2>Uma estampa que não passa despercebida.</h2>
              <p>
                Vermelho intenso, tipografia marcante e uma composição gráfica que coloca a mensagem no centro do visual. Uma camiseta criada para quem prefere vestir sua identidade de forma autêntica.
              </p>
              <div className="highlight-list">
                {product.designHighlights.map((highlight, index) => (
                  <article className="highlight-list__item" key={highlight.title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><h3>{highlight.title}</h3><p>{highlight.text}</p></div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="details-section">
          <div className="container">
            <div className="section-heading">
              <p className="eyebrow">DETALHES VISUAIS</p>
              <h2>Detalhes que fazem parte do visual.</h2>
            <p>Gola, mangas, costuras e estampa apresentados pelas fotos do produto; as imagens de campanha são ilustrativas.</p>
            </div>
            <div className="details-section__grid">
              <ProductMedia asset={product.media[5]} sizes="(max-width: 900px) 100vw, 50vw" />
              <ProductMedia asset={product.media[4]} sizes="(max-width: 900px) 100vw, 50vw" />
              <div className="spec-card">
                <p className="eyebrow">ESPECIFICAÇÕES</p>
                <dl>
                  {product.confirmedSpecs.map((spec) => (
                    <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>
                  ))}
                  {product.pendingSpecLabels.map((label) => (
                    <div key={label} className="spec-card__pending"><dt>{label}</dt><dd>Aguardando confirmação</dd></div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        <section id="tamanho" className="selection-section">
          <div className="container selection-section__layout">
            <SizeSelector
              sizes={product.availableSizes}
              selectedSize={selectedSize}
              onSelect={selectSize}
              hasSizeGuide={product.sizeGuide.length > 0}
              onOpenGuide={() => setShowSizeGuide(true)}
            />
            <aside className="selection-section__note">
              <ShieldCheck size={23} aria-hidden="true" />
              <div>
                <strong>O tamanho vai com o seu pedido</strong>
                <p>O tamanho escolhido aqui acompanha o pedido do início ao fim. Você ainda pode confirmá-lo ou trocá-lo no checkout antes de pagar.</p>
              </div>
            </aside>
          </div>
        </section>

        <section id="oferta" className="offer-section">
          <div className="container offer-card">
            <div className="offer-card__media"><ProductMedia asset={product.media[0]} sizes="(max-width: 900px) 100vw, 280px" /></div>
            <div className="offer-card__content">
              <p className="eyebrow">SUA ESCOLHA</p>
              <h2>{product.name}</h2>
              <p className="offer-card__price">{currentPrice ?? "Preço em atualização"}</p>
              <dl className="offer-card__summary">
                <div><dt>Tamanho</dt><dd>{selectedSize ?? "Escolha acima"}</dd></div>
                <div><dt>Pagamento</dt><dd>PIX</dd></div>
              </dl>
              <button type="button" className="button button--large" onClick={() => beginCheckout("oferta")}>
                COMPRAR AGORA <ArrowRight size={19} aria-hidden="true" />
              </button>
              <p className="offer-card__notice">Checkout seguro no próprio site. Pagamento por PIX.</p>
            </div>
          </div>
        </section>

        <section className="process-section" aria-labelledby="processo-titulo">
          <div className="container">
            <div className="section-heading section-heading--centered">
              <p className="eyebrow">COMPRA COM CLAREZA</p>
              <h2 id="processo-titulo">O que acontece a seguir.</h2>
            </div>
            <div className="process-list">
              <article><span>01</span><h3>Escolha o tamanho</h3><p>O tamanho selecionado acompanha o seu pedido até o pagamento.</p></article>
              <article><span>02</span><h3>Pague com PIX</h3><p>Geramos o QR Code e o código copia e cola na hora, com valor exato.</p></article>
              <article><span>03</span><h3>Confirmação automática</h3><p>Assim que o pagamento é confirmado, seu pedido é atualizado automaticamente.</p></article>
            </div>
          </div>
        </section>

        <Reviews />

        <Faq items={product.faq} />

        <section className="closing-section">
          <div className="container closing-section__layout">
            <div>
              <p className="eyebrow eyebrow--light">SOMOS TODOS PT</p>
              <h2>Seu estilo também comunica aquilo em que você acredita.</h2>
              <p>Conheça a camiseta Somos Todos PT e escolha o tamanho ideal para você.</p>
              <button type="button" className="button button--light button--large" onClick={() => beginCheckout("cta_final")}>
                QUERO COMPRAR AGORA <ArrowRight size={19} aria-hidden="true" />
              </button>
            </div>
            <ProductMedia asset={product.media[6]} sizes="(max-width: 900px) 100vw, 42vw" />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container site-footer__grid">
          <div><BrandMark inverse /><p>Camiseta Somos Todos PT com checkout próprio e pagamento por PIX.</p></div>
          <div><h2>Institucional</h2><a href="/privacidade">Política de privacidade</a><a href="/termos">Termos de compra</a><a href="/trocas-e-devolucoes">Trocas e devoluções</a></div>
          <div><h2>Atendimento</h2><p>Canal de atendimento aguardando configuração pelo responsável.</p><button type="button" className="text-link text-link--light" onClick={() => window.dispatchEvent(new Event("stpt-open-preferences"))}>Preferências de cookies</button></div>
        </div>
        <div className="container site-footer__bottom"><span>© {new Date().getFullYear()} Somos Todos PT.</span><span>Informações legais e comerciais pendentes de cadastro.</span></div>
      </footer>

      {isCommerceReady && (
        <div className="sticky-cta">
          <div className="sticky-cta__info">
            <strong>{currentPrice}</strong>
            <span>{selectedSize ? `Tamanho ${selectedSize}` : "Escolha o tamanho"}</span>
          </div>
          <button type="button" className="button" onClick={() => beginCheckout("barra_fixa")}>
            COMPRAR <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      )}

      {notice && (
        <div className="notice-toast" role="status">
          <Info size={19} aria-hidden="true" /><p>{notice}</p><button type="button" aria-label="Fechar aviso" onClick={() => setNotice(undefined)}><X size={17} /></button>
        </div>
      )}

      {showSizeGuide && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="tabela-medidas-titulo">
          <div className="modal-card">
            <button type="button" className="modal-card__close" aria-label="Fechar tabela de medidas" onClick={() => setShowSizeGuide(false)}><X size={19} /></button>
            <p className="eyebrow">TAMANHOS</p><h2 id="tabela-medidas-titulo">Tabela de medidas</h2>
            {product.sizeGuide.length === 0 ? (
              <p>As medidas reais do fabricante ainda não foram fornecidas. Esta tabela será publicada quando houver dados confirmados.</p>
            ) : (
              <table><thead><tr><th>Tamanho</th><th>Largura</th><th>Comprimento</th></tr></thead><tbody>{product.sizeGuide.map((row) => <tr key={row.size}><td>{row.size}</td><td>{row.widthCm} cm</td><td>{row.lengthCm} cm</td></tr>)}</tbody></table>
            )}
          </div>
        </div>
      )}

      <CookieConsent />
    </>
  );
}
