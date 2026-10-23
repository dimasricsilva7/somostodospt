import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Otimização paga da Vercel (Hobby) estourou a cota e passou a retornar 402,
    // quebrando TODAS as imagens. Servimos direto (sem /_next/image); os arquivos
    // já são .webp e os uploads vão crus — também elimina a latência do otimizador.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
