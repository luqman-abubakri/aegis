import type { MetadataRoute } from "next";

const siteUrl = "https://aegis-psi-three.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/sign-in`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/sign-up`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}