import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/app/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return [];

  return [
    { url: new URL("/", siteUrl).toString(), lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
  ];
}
