import type { Metadata } from "next";
import { AnalyticsBootstrap } from "@/app/components/AnalyticsBootstrap";
import { StorefrontExperience } from "@/app/components/StorefrontExperience";
import { getSiteUrl, siteConfig } from "@/app/config/site";

export function generateMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const pageUrl = siteUrl ? new URL("/", siteUrl).toString() : undefined;
  const imageUrl = siteUrl ? new URL("/images/products/frente-principal.webp", siteUrl).toString() : undefined;

  return {
    alternates: pageUrl ? { canonical: pageUrl } : undefined,
    openGraph: {
      url: pageUrl,
      images: imageUrl ? [{ url: imageUrl, width: 1199, height: 1312, alt: "Camiseta vermelha Somos Todos PT" }] : undefined,
    },
    twitter: imageUrl ? { images: [imageUrl] } : undefined,
    other: { "product:brand": siteConfig.name },
  };
}

export default function Home() {
  return (
    <>
      <AnalyticsBootstrap />
      <StorefrontExperience />
    </>
  );
}
