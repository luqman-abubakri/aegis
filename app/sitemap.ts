import type { MetadataRoute } from "next";

const siteUrl = "";

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