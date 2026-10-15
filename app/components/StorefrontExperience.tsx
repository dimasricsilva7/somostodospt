"use client";

import {
  ArrowRight,
  Check,
  ExternalLink,
  Info,
  ShieldCheck,
  ShoppingBag,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { product, formatPrice } from "@/app/config/product";
import { getCheckoutUrl } from "@/app/lib/checkout";
import { track } from "@/app/lib/tracking";
import { BrandMark } from "./BrandMark";
import { CookieConsent } from "./CookieConsent";
import { Faq } from "./Faq";
import { ProductGallery } from "./ProductGallery";
import { ProductMedia } from "./ProductMedia";
import { SizeSelector } from "./SizeSelector";

function scrollToSizeSelector() {
  document.getElementById("tamanho")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function StorefrontExperience() {
  const [selectedSize, setSelectedSize] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const currentPrice = formatPrice(product.priceInCents);
  const originalPrice = formatPrice(product.compareAtPriceInCents);
  const checkout = useMemo(() => getCheckoutUrl(), []);
  const isCommerceReady = Boolean(
    currentPrice &&
      product.availableSizes.length > 0 &&
      checkout.status === "ready",
  );

  function selectSize(size: string) {
    setSelectedSize(size);
    setNotice(undefined);
    track("SelectSize", { size });
  }

  function beginCheckout(source: string) {
    track("CTAClick", { source });

    if (product.requiresSize && product.availableSizes.length === 0) {
      setNotice("Os tamanhos ainda não foram confirmados para venda. Nenhum checkout foi iniciado.");
      scrollToSizeSelector();
      return;
    }

    if (product.requiresSize && !selectedSize) {
      setNotice("Escolha um tamanho antes de seguir para o checkout.");
      scrollToSizeSelector();
      return;
    }

    const validatedCheckout = getCheckoutUrl();
    if (validatedCheckout.status !== "ready") {
      setNotice(validatedCheckout.message);
      return;
    }

    setNotice(undefined);
    setShowCheckoutConfirm(true);
  }

  function confirmCheckout() {
    const validatedCheckout = getCheckoutUrl();
    if (validatedCheckout.status !== "ready" || isRedirecting) {
      if (validatedCheckout.status !== "ready") setNotice(validatedCheckout.message);
      setShowCheckoutConfirm(false);
      return;
    }

    setIsRedirecting(true);
    track("InitiateCheckout", { selected_size: selectedSize ?? "not_required" });
    window.location.assign(validatedCheckout.url);
  }

  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
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
              <p className="hero-section__statement">Uma peça que transforma uma camiseta em uma declaração de identidade.</p>
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
              <p className="hero-section__fineprint">Escolha seu tamanho e confira os dados e as condições no checkout externo antes de concluir o pedido.</p>
            </div>
            <div className="hero-section__visual">
              <span className="hero-section__star" aria-hidden="true">✦</span>
              <ProductMedia asset={product.media[0]} priority sizes="(max-width: 900px) 100vw, 50vw" />
              <div className="hero-section__label">Edição visual<br />Somos Todos PT</div>
            </div>
          </div>
        </section>

        <section className="readiness-strip" aria-label="Status da configuração comercial">
          <div className="container readiness-strip__inner">
            <Info size={19} aria-hidden="true" />
            <p>
              {isCommerceReady
                ? "Cadastro comercial configurado. Confira as condições no checkout externo."
                : "Preço, disponibilidade, medidas, frete e condições do checkout ainda estão em confirmação."}
            </p>
          </div>
        </section>

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

        <section className="selection-section">
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
                <strong>Confirmação no checkout</strong>
                <p>A escolha feita aqui aparece no resumo antes do redirecionamento. Confirme o mesmo tamanho no checkout; esta seleção não é transmitida automaticamente.</p>
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
                <div><dt>Frete e entrega</dt><dd>Aguardando configuração</dd></div>
              </dl>
              <button type="button" className="button button--large" onClick={() => beginCheckout("oferta")}>
                COMPRAR AGORA <ArrowRight size={19} aria-hidden="true" />
              </button>
              <p className="offer-card__notice">Nenhum pagamento é processado nesta página.</p>
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
              <article><span>01</span><h3>Escolha informada</h3><p>O tamanho selecionado aparece no seu resumo antes do checkout.</p></article>
              <article><span>02</span><h3>Checkout externo</h3><p>Confira o endereço, o tamanho e as condições antes de informar seus dados e concluir o pedido.</p></article>
              <article><span>03</span><h3>Condições reais</h3><p>Pagamento, frete, prazo e políticas serão mostrados somente quando disponíveis.</p></article>
            </div>
          </div>
        </section>

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
          <div><BrandMark inverse /><p>Uma página de produto preparada para receber somente informações comerciais confirmadas.</p></div>
          <div><h2>Institucional</h2><a href="/privacidade">Política de privacidade</a><a href="/termos">Termos de compra</a><a href="/trocas-e-devolucoes">Trocas e devoluções</a></div>
          <div><h2>Atendimento</h2><p>Canal de atendimento aguardando configuração pelo responsável.</p><button type="button" className="text-link text-link--light" onClick={() => window.dispatchEvent(new Event("stpt-open-preferences"))}>Preferências de cookies</button></div>
        </div>
        <div className="container site-footer__bottom"><span>© {new Date().getFullYear()} Somos Todos PT.</span><span>Informações legais e comerciais pendentes de cadastro.</span></div>
      </footer>

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

      {showCheckoutConfirm && checkout.status === "ready" && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="checkout-confirm-title">
          <div className="modal-card modal-card--checkout">
            <button type="button" className="modal-card__close" aria-label="Cancelar ida ao checkout" onClick={() => setShowCheckoutConfirm(false)}><X size={19} /></button>
            <ExternalLink size={26} aria-hidden="true" /><p className="eyebrow">CHECKOUT EXTERNO</p><h2 id="checkout-confirm-title">Confirme antes de seguir.</h2>
            <p>Você será direcionado ao checkout externo autorizado. Nenhum dado pessoal será incluído na URL.</p>
            {product.requiresSize && <p className="checkout-size"><Check size={18} aria-hidden="true" /> Tamanho selecionado: <strong>{selectedSize}</strong></p>}
            <p className="form-note">Confirme o mesmo tamanho no checkout se essa opção estiver disponível. Esta seleção não é transferida automaticamente sem suporte oficial de variantes.</p>
            <button type="button" className="button button--large" disabled={isRedirecting} onClick={confirmCheckout}>{isRedirecting ? "REDIRECIONANDO…" : "IR AO CHECKOUT"}<ArrowRight size={19} aria-hidden="true" /></button>
          </div>
        </div>
      )}

      <CookieConsent />
    </>
  );
}
