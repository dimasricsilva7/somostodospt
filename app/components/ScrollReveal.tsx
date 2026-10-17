"use client";

import { useEffect } from "react";

/**
 * Anima a entrada dos blocos ao rolar a página (fade + slide up).
 * Só adiciona a classe via JS, então sem JS o conteúdo aparece normalmente.
 * Respeita prefers-reduced-motion.
 */
export function ScrollReveal() {
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("#conteudo > section, .catalog-card, .highlight-list__item, .process-list article, .trust-card, .review-card")
    );
    if (reduce || !("IntersectionObserver" in window)) return; // conteúdo já visível
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
    for (const el of targets) {
      // Elementos já visíveis no carregamento ficam como estão (sem flash). Só anima o que está abaixo da dobra.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.88) continue;
      el.classList.add("reveal");
      io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return null;
}
