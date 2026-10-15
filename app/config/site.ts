export const siteConfig = {
  name: "Somos Todos PT",
  title: "Camiseta Somos Todos PT | Vista suas ideias",
  description:
    "Conheça a camiseta vermelha Somos Todos PT, com estampa marcante e checkout externo preparado para ativação.",
  locale: "pt_BR",
};

export function getSiteUrl(): URL | undefined {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    return url;
  } catch {
    return undefined;
  }
}
