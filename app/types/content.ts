export type SiteTexts = {
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  heroStatement: string;
  collectionTitle: string;
  collectionSubtitle: string;
  /** Nome que aparece como recebedor do PIX (adquirente). Editável no admin. */
  paymentProcessorName: string;
  /** Texto da barra de anúncio do topo (entrega full, 2 camisetas 20% off, frete). Vazio = oculta. */
  announcementText: string;
  /** Texto da barra de urgência (últimos dias). Vazio = oculta. */
  urgencyMessage: string;
};

/** Imagem resolvida de uma seção da landing (override do admin ou padrão do código). */
export type SectionImage = { src: string; alt: string; aspect: "square" | "portrait" | "landscape" };

/** Imagens das seções da landing, por chave. */
export type SectionImages = Record<import("@/app/config/sections").SectionKey, SectionImage>;
