import { product } from "./product";

export type SectionKey = "hero" | "design" | "details1" | "details2" | "closing";

/** Slots de imagem editáveis das seções da landing (índice = imagem padrão em product.media). */
export const SECTION_SLOTS: { key: SectionKey; label: string; mediaIndex: number }[] = [
  { key: "hero", label: "Topo (hero)", mediaIndex: 0 },
  { key: "design", label: "Seção “Qualidade da peça”", mediaIndex: 2 },
  { key: "details1", label: "Detalhes — imagem 1", mediaIndex: 3 },
  { key: "details2", label: "Detalhes — imagem 2", mediaIndex: 6 },
  { key: "closing", label: "Seção final", mediaIndex: 8 },
];

export function defaultSectionImage(key: SectionKey): { src: string; alt: string; aspect: "square" | "portrait" | "landscape" } {
  const slot = SECTION_SLOTS.find((s) => s.key === key)!;
  const m = product.media[slot.mediaIndex];
  return { src: m.src, alt: m.alt, aspect: m.aspect };
}
