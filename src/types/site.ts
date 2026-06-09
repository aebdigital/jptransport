export type PageKind = "home" | "service" | "city" | "price" | "blog" | "article" | "europe" | "generic";

export type SiteImage = {
  src: string;
  alt: string;
};

export type SitePage = {
  path: string;
  sourceUrl: string;
  kind: PageKind;
  title: string;
  description: string;
  keywords: string;
  h1: string;
  summary: string;
  bodyHtml: string;
  images: SiteImage[];
  city: string;
  lastmod: string;
};
