import type { MetadataRoute } from "next";

const siteUrl = "https://intervyou-mu.vercel.app/";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/interview",
        "/profile",
        "/resume",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}