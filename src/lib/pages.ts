import { scrapedPages } from "@/data/scraped-pages";
import type { SitePage } from "@/types/site";

export const siteOrigin = "https://stahovanie-24.sk";

export function pathFromSegments(slug?: string[]) {
  const joined = slug?.join("/") ?? "";
  return joined ? `/${joined}` : "/";
}

export function findPage(path: string): SitePage | undefined {
  return scrapedPages.find((page) => page.path === path);
}

export function getImageForPage(page: SitePage) {
  return page.images.find((image) => image.src.includes("gallery/"))?.src || page.images[0]?.src || "/hero-moving.webp";
}

export function getHomePage() {
  return scrapedPages.find((page) => page.path === "/");
}

export function routeToStaticParams(path: string) {
  if (path === "/") return { slug: [] as string[] };
  return { slug: path.replace(/^\//, "").split("/") };
}
