"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ProductMedia as ProductMediaType } from "@/app/config/product";
import { ProductMedia } from "./ProductMedia";

type ProductGalleryProps = {
  media: readonly ProductMediaType[];
};

export function ProductGallery({ media }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const selected = media[selectedIndex];

  const selectIndex = useCallback((index: number) => {
    setSelectedIndex((index + media.length) % media.length);
  }, [media.length]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isExpanded) return;
      if (event.key === "Escape") setIsExpanded(false);
      if (event.key === "ArrowLeft") selectIndex(selectedIndex - 1);
      if (event.key === "ArrowRight") selectIndex(selectedIndex + 1);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, selectedIndex, selectIndex]);

  return (
    <section className="gallery" aria-labelledby="galeria-titulo">
      <div className="section-heading section-heading--split">
        <div>
          <p className="eyebrow">VISUAL DO PRODUTO</p>
          <h2 id="galeria-titulo">Uma peça, vários ângulos.</h2>
        </div>
        <p className="section-heading__support">Toque nas miniaturas para explorar cada detalhe.</p>
      </div>

      <div className="gallery__layout">
        <div className="gallery__viewer">
          <ProductMedia asset={selected} priority={selectedIndex === 0} sizes="(max-width: 900px) 100vw, 58vw" />
          <div className="gallery__viewer-bar">
            <span aria-live="polite">{selected.label}</span>
            <button
              type="button"
              className="icon-button"
              aria-label={`Ampliar ${selected.label}`}
              onClick={() => setIsExpanded(true)}
            >
              <Expand size={18} />
            </button>
          </div>
          <button
            type="button"
            className="gallery__arrow gallery__arrow--previous"
            aria-label="Mostrar imagem anterior"
            onClick={() => selectIndex(selectedIndex - 1)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="gallery__arrow gallery__arrow--next"
            aria-label="Mostrar próxima imagem"
            onClick={() => selectIndex(selectedIndex + 1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="gallery__thumbs" aria-label="Miniaturas da galeria">
          {media.map((asset, index) => (
            <button
              key={asset.id}
              type="button"
              className={`gallery__thumb ${index === selectedIndex ? "is-selected" : ""}`}
              aria-label={`Ver ${asset.label}`}
              aria-pressed={index === selectedIndex}
              onClick={() => setSelectedIndex(index)}
            >
              <ProductMedia asset={asset} sizes="110px" />
              <span>{asset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {isExpanded && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Imagem ampliada: ${selected.label}`}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setIsExpanded(false);
          }}
        >
          <div className="lightbox__content">
            <div className="lightbox__topbar">
              <span>{selected.label}</span>
              <button type="button" className="icon-button icon-button--light" onClick={() => setIsExpanded(false)} aria-label="Fechar imagem ampliada">
                <X size={20} />
              </button>
            </div>
            <ProductMedia asset={selected} priority sizes="90vw" className="lightbox__media" />
          </div>
        </div>
      )}
    </section>
  );
}
