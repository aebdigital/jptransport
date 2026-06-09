import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://www.stahovanie-jptransport.sk/";
const BASE_HOST = new URL(BASE_URL).hostname.replace(/^www\./, "");
const ROOT = process.cwd();
const SOURCE_PUBLIC_DIR = path.join(ROOT, "public", "source");
const DATA_DIR = path.join(ROOT, "src", "data");
const MAX_PAGES = 500;

const pageByUrl = new Map();
const queue = [];
const queued = new Set();
const linkLabels = new Map();
const sitemapLastMod = new Map();
const assetMap = new Map();

function addPageUrl(url) {
  const normalized = normalizePageUrl(url, BASE_URL);
  if (!normalized || queued.has(normalized) || pageByUrl.has(normalized)) return;
  queued.add(normalized);
  queue.push(normalized);
}

function decodeHtml(value = "") {
  const entities = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    euro: "€",
  };

  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (_, name) => entities[name] ?? `&${name};`);
}

function escapeAttr(value = "") {
  return decodeHtml(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function stripTags(value = "") {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function getAttr(tag, name) {
  const double = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag);
  if (double) return decodeHtml(double[1]);
  const single = new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i").exec(tag);
  if (single) return decodeHtml(single[1]);
  const bare = new RegExp(`${name}\\s*=\\s*([^\\s>]+)`, "i").exec(tag);
  return bare ? decodeHtml(bare[1]) : "";
}

function normalizePageUrl(href, base) {
  if (!href || /^(mailto:|tel:|sms:|whatsapp:|javascript:|#)/i.test(href.trim())) return null;

  let url;
  try {
    url = new URL(href, base);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.hostname.replace(/^www\./, "") !== BASE_HOST) return null;

  url.hash = "";
  url.search = "";

  if (url.pathname === "/index.html") {
    url.pathname = "/";
  }

  const isPage = url.pathname === "/" || url.pathname.endsWith(".html");
  return isPage ? url.href : null;
}

function normalizeHref(href, base) {
  if (!href) return "#";
  if (/^(mailto:|tel:|sms:|whatsapp:|#)/i.test(href.trim())) return href.trim();

  let url;
  try {
    url = new URL(href, base);
  } catch {
    return href;
  }

  if (url.hostname.replace(/^www\./, "") === BASE_HOST) {
    const cleanPath = url.pathname === "/index.html" ? "/" : url.pathname;
    return `${cleanPath}${url.hash}`;
  }

  return url.href;
}

function routePathFromUrl(url) {
  const parsed = new URL(url);
  return parsed.pathname === "/index.html" ? "/" : parsed.pathname;
}

function extractMeta(html, name) {
  const patterns = [
    new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*>`, "i"),
    new RegExp(`<meta\\s+[^>]*property=["']${name}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const tag = pattern.exec(html)?.[0];
    if (tag) return getAttr(tag, "content");
  }

  return "";
}

function extractTitle(html) {
  return stripTags(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
}

function extractH1(html, fallback) {
  return stripTags(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? fallback);
}

function extractLinks(html, baseUrl) {
  const links = [];
  const linkRe = /<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRe.exec(html))) {
    const href = decodeHtml(match[1] || match[2] || match[3] || "");
    const normalizedUrl = normalizePageUrl(href, baseUrl);
    const normalizedHref = normalizedUrl ? routePathFromUrl(normalizedUrl) : normalizeHref(href, baseUrl);
    const text = stripTags(match[4]);
    if (normalizedUrl && text && !linkLabels.has(normalizedHref)) {
      linkLabels.set(normalizedHref, text);
    }
    links.push({ href, normalizedUrl, text });
  }

  return links;
}

function classifyPage(routePath) {
  if (routePath === "/") return "home";
  if (routePath === "/blog.html") return "blog";
  if (routePath.startsWith("/blog-")) return "article";
  if (routePath.startsWith("/cennik")) return "price";
  if (
    routePath.includes("europa") ||
    routePath.includes("nemecka") ||
    routePath.includes("talianska") ||
    routePath.includes("svajciarska") ||
    routePath.includes("rakuska")
  ) {
    return "europe";
  }
  if (
    [
      "/stahovanie-bytu.html",
      "/stahovanie-domu.html",
      "/stahovanie-firmy.html",
      "/odvoz-nabytku.html",
      "/autodoprava.html",
      "/vypratavanie.html",
    ].includes(routePath)
  ) {
    return "service";
  }
  if (routePath.startsWith("/stahovanie-")) return "city";
  return "generic";
}

function humanizeSlug(slug = "") {
  return slug
    .replace(/\.html$/, "")
    .replace(/^cennik-stahovanie-/, "")
    .replace(/^stahovanie-/, "")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractCity(routePath, html, kind) {
  const geoPlace = extractMeta(html, "geo.placename");
  if (geoPlace) return geoPlace;

  const title = extractTitle(html);
  if (kind === "price") {
    const match = /Sťahovanie\s+([^|]+?)\s*(?:\||,|cenník|cena)/i.exec(title);
    if (match) return match[1].trim();
  }

  if (kind === "city") {
    const match = /(?:v|pre)\s+([A-ZÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ][^<|,+–-]{2,})/i.exec(extractH1(html, title));
    if (match) return match[1].trim();
  }

  return humanizeSlug(routePath.slice(1));
}

function normalizeAssetUrl(src, baseUrl) {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return null;

  let url;
  try {
    url = new URL(src, baseUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.hash = "";
  return url.href;
}

function localAssetPath(assetUrl) {
  const url = new URL(assetUrl);
  const sameHost = url.hostname.replace(/^www\./, "") === BASE_HOST;
  const normalizedPath = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const safePath = normalizedPath || "index";
  const localPath = sameHost ? safePath : path.join("external", url.hostname, safePath);
  return `/source/${localPath.replace(/\\/g, "/")}`;
}

function collectAssetsFromHtml(html, pageUrl) {
  const tags = [
    ...html.matchAll(/<img\b[^>]*>/gi),
    ...html.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/gi),
    ...html.matchAll(/<link\b[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*>/gi),
  ];

  for (const [tag] of tags) {
    const src = getAttr(tag, "src") || getAttr(tag, "content") || getAttr(tag, "href");
    const assetUrl = normalizeAssetUrl(src, pageUrl);
    if (!assetUrl || assetMap.has(assetUrl)) continue;
    assetMap.set(assetUrl, localAssetPath(assetUrl));
  }
}

function rewriteImageTag(tag, pageUrl) {
  const src = getAttr(tag, "src");
  const alt = getAttr(tag, "alt");
  if (!src || src.trim() === "#") return "";

  const normalized = normalizeAssetUrl(src, pageUrl);
  const localSrc = normalized && assetMap.has(normalized) ? assetMap.get(normalized) : normalizeHref(src, pageUrl);
  if (!localSrc || localSrc === "#") return "";
  return `<img src="${escapeAttr(localSrc)}" alt="${escapeAttr(alt)}" loading="lazy">`;
}

function rewriteAnchorTag(tag, pageUrl) {
  const href = normalizeHref(getAttr(tag, "href"), pageUrl);
  const isExternal = /^https?:\/\//i.test(href) && new URL(href).hostname.replace(/^www\./, "") !== BASE_HOST;
  const rel = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
  return `<a href="${escapeAttr(href)}"${rel}>`;
}

function sanitizeHtml(html, pageUrl, kind) {
  let body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? html;

  body = body
    .replace(/<!--\s*FIXED SOCIAL BUTTONS[\s\S]*$/i, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<div[^>]*style=["'][^"']*display\s*:\s*none[\s\S]*?<\/div>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");

  const firstSection = body.search(/<(section|main|article)\b/i);
  if (firstSection >= 0) body = body.slice(firstSection);

  body = body.replace(/FIXED SOCIAL BUTTONS[\s\S]*$/i, "");

  if (kind === "price") {
    body = body
      .replace(/<section[^>]*aria-labelledby=["']cena-heading["'][\s\S]*?<\/section>/i, "")
      .replace(/<section[\s\S]*?Vypočítajte si orientačnú cenu sťahovania[\s\S]*?<\/section>/i, "");
  }

  if (kind === "blog") {
    body = body.replace(/<section\b[^>]*class=["'][^"']*blog-section[\s\S]*?<\/section>/i, "");
  }

  body = body.replace(/^\s*<section\b[\s\S]*?<h1\b[\s\S]*?<\/h1>[\s\S]*?<\/section>/i, "");

  body = body
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<(input|select|option|button|label|fieldset|legend)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<(input|select|option|button)\b[^>]*>/gi, "");

  const allowed = new Set([
    "section",
    "main",
    "article",
    "header",
    "div",
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "strong",
    "em",
    "b",
    "i",
    "br",
    "blockquote",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ]);
  const voidTags = new Set(["img", "br"]);

  body = body.replace(/<([a-z][\w:-]*)(?:\s[^>]*)?>/gi, (full, tagName) => {
    const tag = tagName.toLowerCase();
    if (!allowed.has(tag)) return "";
    if (tag === "img") return rewriteImageTag(full, pageUrl);
    if (tag === "a") return rewriteAnchorTag(full, pageUrl);
    if (tag === "br") return "<br>";
    return `<${tag}>`;
  });

  body = body.replace(/<\/([a-z][\w:-]*)>/gi, (full, tagName) => {
    const tag = tagName.toLowerCase();
    if (!allowed.has(tag) || voidTags.has(tag)) return "";
    if (tag === "b") return "</strong>";
    if (tag === "i") return "</em>";
    return `</${tag}>`;
  });

  body = body
    .replace(/<b>/gi, "<strong>")
    .replace(/<i>/gi, "<em>")
    .replace(/\s{2,}/g, " ")
    .replace(/>\s+</g, "><")
    .trim();

  body = body
    .replace(/<section><h2>Objednajte si sťahovanie<\/h2><\/section>/gi, "")
    .replace(/<section><h2>Naše sťahovania[\s\S]*?<\/h2><div><\/div><\/section>/gi, "")
    .replace(/<div><h3>Kontaktujte nás<\/h3>(?:<a href="#">[\s\S]*?<\/a>)+<\/div>/gi, "")
    .replace(/<a href="#">([\s\S]*?)<\/a>/gi, "$1");

  return body;
}

function summarize(html, fallback) {
  const text = stripTags(html);
  if (!text) return fallback;
  return text.length > 230 ? `${text.slice(0, 227).trim()}...` : text;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; JPTransportRebuild/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function crawl() {
  console.log("Fetching sitemap...");
  const sitemapXml = await fetchText(new URL("/sitemap.xml", BASE_URL).href);
  const locRe = /<url>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?/gi;
  let match;

  while ((match = locRe.exec(sitemapXml))) {
    const loc = decodeHtml(match[1]);
    const normalized = normalizePageUrl(loc, BASE_URL);
    if (normalized) {
      sitemapLastMod.set(routePathFromUrl(normalized), match[2] || "");
      addPageUrl(normalized);
    }
  }

  addPageUrl(BASE_URL);

  while (queue.length && pageByUrl.size < MAX_PAGES) {
    const url = queue.shift();
    queued.delete(url);

    if (pageByUrl.has(url)) continue;

    try {
      const html = await fetchText(url);
      if (/<title>\s*404/i.test(html) || /<h1>\s*404\s*<\/h1>/i.test(html)) {
        console.log(`Skipping 404 body: ${url}`);
        continue;
      }

      pageByUrl.set(url, html);
      collectAssetsFromHtml(html, url);

      for (const link of extractLinks(html, url)) {
        if (link.normalizedUrl) addPageUrl(link.normalizedUrl);
      }

      if (pageByUrl.size % 25 === 0) {
        console.log(`Crawled ${pageByUrl.size} pages...`);
      }
    } catch (error) {
      console.warn(`Skipping ${url}: ${error.message}`);
    }
  }
}

async function downloadAssets() {
  await mkdir(SOURCE_PUBLIC_DIR, { recursive: true });
  let downloaded = 0;

  for (const [assetUrl, publicPath] of assetMap.entries()) {
    const outputPath = path.join(ROOT, "public", publicPath.replace(/^\//, ""));

    try {
      const response = await fetch(assetUrl, {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; JPTransportRebuild/1.0)",
        },
      });

      if (!response.ok) {
        console.warn(`Asset skipped ${assetUrl}: ${response.status}`);
        continue;
      }

      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
      downloaded += 1;
    } catch (error) {
      console.warn(`Asset skipped ${assetUrl}: ${error.message}`);
    }
  }

  console.log(`Downloaded ${downloaded} assets.`);
}

function buildData() {
  const pages = [...pageByUrl.entries()]
    .map(([url, html]) => {
      const routePath = routePathFromUrl(url);
      const kind = classifyPage(routePath);
      const title = extractTitle(html) || "JP TRANSPORT";
      const description = extractMeta(html, "description");
      const h1 = extractH1(html, title.replace(/\s*\|.*$/, ""));
      const bodyHtml = sanitizeHtml(html, url, kind);
      const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)].map(([tag]) => {
        const src = getAttr(tag, "src");
        const normalized = normalizeAssetUrl(src, url);
        const localSrc = normalized && assetMap.has(normalized) ? assetMap.get(normalized) : normalizeHref(src, url);
        return {
          src: localSrc,
          alt: getAttr(tag, "alt"),
        };
      });

      const images = imageTags
        .filter((image) => image.src && !/simpleicons|cdn-icons|favicon/i.test(image.src))
        .filter((image, index, list) => list.findIndex((candidate) => candidate.src === image.src) === index);

      return {
        path: routePath,
        sourceUrl: url,
        kind,
        title,
        description,
        keywords: extractMeta(html, "keywords"),
        h1,
        summary: summarize(description || bodyHtml, "Profesionálne sťahovanie, vypratávanie a autodoprava od JP TRANSPORT."),
        bodyHtml,
        images,
        city: ["city", "price"].includes(kind) ? extractCity(routePath, html, kind) : "",
        lastmod: sitemapLastMod.get(routePath) || "",
      };
    })
    .sort((a, b) => {
      if (a.path === "/") return -1;
      if (b.path === "/") return 1;
      return a.path.localeCompare(b.path, "sk");
    });

  const cityLinks = pages
    .filter((page) => page.kind === "city")
    .map((page) => ({
      href: page.path,
      label: linkLabels.get(page.path) || `Sťahovanie ${page.city || humanizeSlug(page.path.slice(1))}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "sk"));

  const priceLinks = pages
    .filter((page) => page.kind === "price" && page.path !== "/cennik-stahovania.html")
    .map((page) => ({
      href: page.path,
      label: linkLabels.get(page.path) || `Cenník ${page.city || humanizeSlug(page.path.slice(1))}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "sk"));

  const blogArticles = pages
    .filter((page) => page.kind === "article")
    .map((page) => ({
      href: page.path,
      title: page.h1,
      description: page.summary,
      image: page.images[0]?.src || "/source/IMG_0714.jpg",
    }));

  return { pages, cityLinks, priceLinks, blogArticles };
}

async function writeData() {
  await mkdir(DATA_DIR, { recursive: true });
  const { pages, cityLinks, priceLinks, blogArticles } = buildData();
  const generatedAt = new Date().toISOString();

  const pagesSource = `import type { SitePage } from "@/types/site";

// Generated by scripts/scrape-site.mjs from ${BASE_URL}
export const scrapeGeneratedAt = ${JSON.stringify(generatedAt)};
export const scrapedPages = ${JSON.stringify(pages, null, 2)} satisfies SitePage[];
`;

  const navSource = `// Generated by scripts/scrape-site.mjs from ${BASE_URL}
export const cityLinks = ${JSON.stringify(cityLinks, null, 2)} as const;
export const priceLinks = ${JSON.stringify(priceLinks, null, 2)} as const;
export const blogArticleLinks = ${JSON.stringify(blogArticles, null, 2)} as const;

export const primaryLinks = [
  { href: "/", label: "Domov" },
  { href: "/stahovanie-bytu.html", label: "Sťahovanie bytu" },
  { href: "/stahovanie-domu.html", label: "Sťahovanie domu" },
  { href: "/stahovanie-firmy.html", label: "Sťahovanie firmy" },
  { href: "/cennik-stahovania.html", label: "Cenník" },
  { href: "/stahovanie-europa.html", label: "Európa" },
  { href: "/blog.html", label: "Blog" },
  { href: "/#kontakt", label: "Kontakt" }
] as const;
`;

  await writeFile(path.join(DATA_DIR, "scraped-pages.ts"), pagesSource);
  await writeFile(path.join(DATA_DIR, "navigation.ts"), navSource);

  console.log(`Generated ${pages.length} pages.`);
  console.log(`Generated ${cityLinks.length} city links, ${priceLinks.length} price links, ${blogArticles.length} blog articles.`);
}

await crawl();
await downloadAssets();
await writeData();
