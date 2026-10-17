"use client";

import { ArrowRight, ShoppingBag } from "lucide-react";
import { product } from "@/app/config/product";
import type { CatalogProduct } from "@/app/config/catalog";
import type { SiteTexts } from "@/app/types/content";
import { AnnounceBar } from "./AnnounceBar";
import { BrandMark } from "./BrandMark";
import { CatalogCard } from "./CatalogCard";
import { CookieConsent } from "./CookieConsent";
import { DeliveryModal } from "./DeliveryModal";
import { Faq } from "./Faq";
import { ProductMedia } from "./ProductMedia";
import { Reviews } from "./Reviews";
import { UrgencyBar } from "./UrgencyBar";

function scrollToCollection() {
  document.getElementById("colecao")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function StorefrontExperience({ products, texts }: { products: CatalogProduct[]; texts: SiteTexts }) {
  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <AnnounceBar />
      <UrgencyBar />
      <header className="site-header">
        <div className="container site-header__inner">
          <a href="#produto" aria-label="Somos Todos PT — ir para o início"><BrandMark compact /></a>
          <nav aria-label="Navegação principal" className="site-nav">
            <a href="#colecao">Coleção</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>
          <button type="button" className="button button--header" onClick={scrollToCollection}>
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
              <p className="eyebrow eyebrow--light">{texts.heroEyebrow}</p>
              <h1>{texts.heroTitle}</h1>
              <p className="hero-section__lead">{texts.heroLead}</p>
              <p className="hero-section__statement">{texts.heroStatement}</p>
              <button type="button" className="button button--light button--large" onClick={scrollToCollection}>
                VER A COLEÇÃO <ArrowRight size={19} aria-hidden="true" />
              </button>
              <p className="hero-section__fineprint">Checkout seguro no próprio site. Seu tamanho acompanha o pedido do início ao fim.</p>
            </div>
            <div className="hero-section__visual">
              <span className="hero-section__star" aria-hidden="true">✦</span>
              <ProductMedia asset={product.media[0]} priority sizes="(max-width: 900px) 100vw, 50vw" />
              <div className="hero-section__label">Coleção<br />Somos Todos PT</div>
            </div>
          </div>
        </section>

        <section id="colecao" className="collection-section">
          <div className="container">
            <div className="section-heading section-heading--centered">
              <p className="eyebrow">OS MODELOS</p>
              <h2>{texts.collectionTitle}</h2>
              <p>{texts.collectionSubtitle}</p>
            </div>
            <div className="collection-grid">
              {products.map((p) => (
                <CatalogCard key={p.slug} product={p} />
              ))}
            </div>
          </div>
        </section>

        <section className="design-section">
          <div className="container design-section__layout">
            <div className="design-section__photo">
              <ProductMedia asset={product.media[4]} sizes="(max-width: 900px) 100vw, 42vw" />
            </div>
            <div className="design-section__copy">
              <p className="eyebrow">QUALIDADE DA PEÇA</p>
              <h2>Estampa marcante, caimento pra vestir todo dia.</h2>
              <p>
                Tecido confortável, cores vivas e impressão por sublimação. A mesma qualidade de peça em todos os modelos da coleção — muda a estampa, não o cuidado.
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
              <p className="eyebrow">ESPECIFICAÇÕES</p>
              <h2>Detalhes da camiseta.</h2>
              <p>Informações confirmadas sobre a peça. As fotos de campanha são ilustrativas.</p>
            </div>
            <div className="details-section__grid">
              <ProductMedia asset={product.media[5]} sizes="(max-width: 900px) 100vw, 50vw" />
              <ProductMedia asset={product.media[1]} sizes="(max-width: 900px) 100vw, 50vw" />
              <div className="spec-card">
                <p className="eyebrow">FICHA TÉCNICA</p>
                <dl>
                  {product.confirmedSpecs.map((spec) => (
                    <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>
                  ))}
                </dl>
              </div>
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
              <article><span>01</span><h3>Escolha modelo e tamanho</h3><p>A escolha fica destacada no card e acompanha o seu pedido.</p></article>
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
              <p>Escolha o seu modelo na coleção e finalize com PIX em poucos cliques.</p>
              <button type="button" className="button button--light button--large" onClick={scrollToCollection}>
                VER A COLEÇÃO <ArrowRight size={19} aria-hidden="true" />
              </button>
            </div>
            <ProductMedia asset={product.media[6]} sizes="(max-width: 900px) 100vw, 42vw" />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container site-footer__grid">
          <div><BrandMark inverse /><p>Coleção de camisetas Somos Todos PT com checkout próprio e pagamento por PIX.</p></div>
          <div><h2>Institucional</h2><a href="/privacidade">Política de privacidade</a><a href="/termos">Termos de compra</a><a href="/trocas-e-devolucoes">Trocas e devoluções</a></div>
          <div><h2>Atendimento</h2><p>Canal de atendimento aguardando configuração pelo responsável.</p><button type="button" className="text-link text-link--light" onClick={() => window.dispatchEvent(new Event("stpt-open-preferences"))}>Preferências de cookies</button></div>
        </div>
        <div className="container site-footer__bottom"><span>© {new Date().getFullYear()} Somos Todos PT.</span><span>Informações legais e comerciais pendentes de cadastro.</span></div>
      </footer>

      <DeliveryModal />
      <CookieConsent />
    </>
  );
}
