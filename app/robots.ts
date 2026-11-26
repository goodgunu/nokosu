import type { MetadataRoute } from "next";

const SITE_URL = "https://fleet-maple-mto3zo3.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // API とログインの戻り先は検索に出さない
      disallow: ["/api/", "/sso-callback"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
