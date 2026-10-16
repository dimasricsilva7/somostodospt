import { ShieldCheck, Star } from "lucide-react";
import { reviews, trustSignals } from "@/app/config/commerce";

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="stars" aria-label={`${r} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={15} aria-hidden="true" fill={i < r ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

/**
 * Avaliações reais (config `reviews`). Enquanto não houver avaliações verdadeiras,
 * mostramos apenas sinais de confiança comprováveis — nunca depoimentos inventados.
 */
export function Reviews() {
  if (reviews.length === 0) {
    return (
      <section className="trust-section" aria-labelledby="confianca-titulo">
        <div className="container">
          <div className="section-heading section-heading--centered">
            <p className="eyebrow">COMPRA COM CONFIANÇA</p>
            <h2 id="confianca-titulo">Como funciona a sua compra.</h2>
          </div>
          <div className="trust-grid">
            {trustSignals.map((s) => (
              <article key={s.title} className="trust-card">
                <ShieldCheck size={22} aria-hidden="true" />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="reviews-section" aria-labelledby="avaliacoes-titulo">
      <div className="container">
        <div className="section-heading section-heading--centered">
          <p className="eyebrow">AVALIAÇÕES</p>
          <h2 id="avaliacoes-titulo">Quem comprou, aprovou.</h2>
        </div>
        <div className="reviews-grid">
          {reviews.map((r, i) => (
            <article key={`${r.name}-${i}`} className="review-card">
              <Stars rating={r.rating} />
              <p className="review-card__text">{r.text}</p>
              <p className="review-card__author">
                <strong>{r.name}</strong>
                {r.city ? <span> · {r.city}</span> : null}
                {r.verified ? <span className="review-card__badge">Compra verificada</span> : null}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
