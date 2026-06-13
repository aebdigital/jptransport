import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OLD_ORIGIN = "https://www.stahovanie-jptransport.sk";
const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, "reports");
const CACHE_FILE = path.join(REPORTS_DIR, "jptransport-live-pages.json");
const LOCAL_DATA_FILE = path.join(ROOT, "src", "data", "scraped-pages.ts");

const args = new Set(process.argv.slice(2));
const outArg = valueAfter("--out") || path.join(REPORTS_DIR, "duplicate-content-audit.json");
const markdownArg = valueAfter("--markdown") || outArg.replace(/\.json$/i, ".md");
const refresh = args.has("--refresh");

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : "";
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

function stripHtml(html = "") {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<form[\s\S]*?<\/form>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWords(text = "") {
  return stripHtml(text)
    .toLocaleLowerCase("sk")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

function shingles(words, size = 5) {
  if (words.length < size) return new Set(words);
  const set = new Set();
  for (let index = 0; index <= words.length - size; index += 1) {
    set.add(words.slice(index, index + size).join(" "));
  }
  return set;
}

function scoreSets(a, b) {
  if (!a.size || !b.size) return { jaccard: 0, containment: 0, overlap: 0 };
  let overlap = 0;
  const [smaller, larger] = a.size < b.size ? [a, b] : [b, a];
  for (const item of smaller) {
    if (larger.has(item)) overlap += 1;
  }
  return {
    jaccard: overlap / (a.size + b.size - overlap),
    containment: overlap / Math.min(a.size, b.size),
    overlap,
  };
}

function riskFor(score) {
  if (score.jaccard >= 0.25 || score.containment >= 0.45) return "high";
  if (score.jaccard >= 0.14 || score.containment >= 0.3) return "medium";
  return "low";
}

function round(value) {
  return Number(value.toFixed(4));
}

function routePathFromUrl(url) {
  const parsed = new URL(url);
  return parsed.pathname === "/index.html" ? "/" : parsed.pathname;
}

function normalizePageUrl(href) {
  let url;
  try {
    url = new URL(href, OLD_ORIGIN);
  } catch {
    return "";
  }
  if (!["http:", "https:"].includes(url.protocol)) return "";
  if (url.hostname.replace(/^www\./, "") !== new URL(OLD_ORIGIN).hostname.replace(/^www\./, "")) return "";
  url.hash = "";
  url.search = "";
  if (url.pathname === "/index.html") url.pathname = "/";
  if (url.pathname !== "/" && !url.pathname.endsWith(".html")) return "";
  return url.href;
}

function extractTitle(html) {
  return stripHtml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
}

function extractMeta(html, name) {
  const tag =
    new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*>`, "i").exec(html)?.[0] ||
    new RegExp(`<meta\\s+[^>]*property=["']${name}["'][^>]*>`, "i").exec(html)?.[0] ||
    "";
  return decodeHtml(/content\s*=\s*"([^"]*)"/i.exec(tag)?.[1] || /content\s*=\s*'([^']*)'/i.exec(tag)?.[1] || "");
}

function extractH1(html, fallback) {
  return stripHtml(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? fallback);
}

function contentTextFromHtml(html) {
  const body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? html;
  return stripHtml(body);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; Stahovanie24DuplicateAudit/1.0)",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function crawlOldPages() {
  const sitemap = await fetchText(`${OLD_ORIGIN}/sitemap.xml`);
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)]
    .map((match) => normalizePageUrl(decodeHtml(match[1])))
    .filter(Boolean);

  const uniqueUrls = [...new Set([OLD_ORIGIN, ...urls])];
  const pages = await mapLimit(uniqueUrls, 8, async (url) => {
    try {
      const html = await fetchText(url);
      return {
        path: routePathFromUrl(url),
        url,
        title: extractTitle(html),
        description: extractMeta(html, "description"),
        h1: extractH1(html, extractTitle(html)),
        text: contentTextFromHtml(html),
      };
    } catch (error) {
      return { path: routePathFromUrl(url), url, error: error.message, title: "", description: "", h1: "", text: "" };
    }
  });

  return pages.filter((page) => page.text && !page.error).sort((a, b) => a.path.localeCompare(b.path, "sk"));
}

async function getOldPages() {
  await mkdir(REPORTS_DIR, { recursive: true });
  if (!refresh) {
    try {
      return JSON.parse(await readFile(CACHE_FILE, "utf8"));
    } catch {
      // Crawl below.
    }
  }
  const pages = await crawlOldPages();
  await writeFile(CACHE_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), origin: OLD_ORIGIN, pages }, null, 2));
  return { generatedAt: new Date().toISOString(), origin: OLD_ORIGIN, pages };
}

async function getLocalPages() {
  const source = await readFile(LOCAL_DATA_FILE, "utf8");
  const match = source.match(/export const scrapedPages = ([\s\S]*?) satisfies SitePage\[];/);
  if (!match) throw new Error("Could not parse scrapedPages from src/data/scraped-pages.ts");
  const pages = JSON.parse(match[1]);
  return pages.map((page) => ({
    path: page.path,
    kind: page.kind,
    title: page.title,
    description: page.description,
    h1: page.h1,
    city: page.city,
    text: `${page.title}. ${page.description}. ${page.h1}. ${page.summary}. ${page.bodyHtml}`,
  }));
}

function prepare(page) {
  const words = normalizeWords(page.text);
  return { ...page, words, shingleSet: shingles(words, 5), wordCount: words.length };
}

function comparePrepared(left, right) {
  const score = scoreSets(left.shingleSet, right.shingleSet);
  return {
    jaccard: round(score.jaccard),
    containment: round(score.containment),
    overlap: score.overlap,
    risk: riskFor(score),
  };
}

function sortByRiskAndScore(a, b) {
  const order = { high: 0, medium: 1, low: 2 };
  return order[a.risk] - order[b.risk] || b.jaccard - a.jaccard || b.containment - a.containment;
}

function summarizeMatches(matches) {
  return {
    total: matches.length,
    high: matches.filter((match) => match.risk === "high").length,
    medium: matches.filter((match) => match.risk === "medium").length,
    low: matches.filter((match) => match.risk === "low").length,
    maxJaccard: round(Math.max(0, ...matches.map((match) => match.jaccard))),
    maxContainment: round(Math.max(0, ...matches.map((match) => match.containment))),
  };
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Duplicate Content Audit");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Old site pages crawled: ${report.oldSite.pageCount}`);
  lines.push(`Local pages checked: ${report.local.pageCount}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Old vs new best-page matches: ${report.summary.oldVsNew.high} high, ${report.summary.oldVsNew.medium} medium, ${report.summary.oldVsNew.low} low.`);
  lines.push(`- New city page internal matches: ${report.summary.internalCity.high} high, ${report.summary.internalCity.medium} medium, ${report.summary.internalCity.low} low.`);
  lines.push(`- New cenník page internal matches: ${report.summary.internalPrice.high} high, ${report.summary.internalPrice.medium} medium, ${report.summary.internalPrice.low} low.`);
  lines.push("");
  lines.push("## Highest Old vs New Matches");
  lines.push("");
  for (const match of report.top.oldVsNew) {
    lines.push(`- ${match.localPath} vs ${match.oldPath}: ${match.risk}, jaccard ${match.jaccard}, containment ${match.containment}`);
  }
  lines.push("");
  lines.push("## Highest Internal City Matches");
  lines.push("");
  for (const match of report.top.internalCity) {
    lines.push(`- ${match.pathA} vs ${match.pathB}: ${match.risk}, jaccard ${match.jaccard}, containment ${match.containment}`);
  }
  lines.push("");
  lines.push("## Highest Internal Cenník Matches");
  lines.push("");
  for (const match of report.top.internalPrice) {
    lines.push(`- ${match.pathA} vs ${match.pathB}: ${match.risk}, jaccard ${match.jaccard}, containment ${match.containment}`);
  }
  lines.push("");
  lines.push("Note: this is a practical shingle-similarity audit, not Google's exact algorithm. High scores mean the pages still share many identical word sequences.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

const oldCache = await getOldPages();
const localPages = (await getLocalPages()).map(prepare);
const oldPages = oldCache.pages.map(prepare);

const oldByPath = new Map(oldPages.map((page) => [page.path, page]));

const oldVsNew = localPages.map((localPage) => {
  let best = null;
  for (const oldPage of oldPages) {
    const score = comparePrepared(localPage, oldPage);
    const candidate = {
      localPath: localPage.path,
      localKind: localPage.kind,
      oldPath: oldPage.path,
      samePath: localPage.path === oldPage.path,
      localWords: localPage.wordCount,
      oldWords: oldPage.wordCount,
      ...score,
    };
    if (!best || sortByRiskAndScore(candidate, best) < 0) best = candidate;
  }

  const sameOldPage = oldByPath.get(localPage.path);
  const samePath = sameOldPage ? comparePrepared(localPage, sameOldPage) : null;

  return {
    ...best,
    samePathScore: samePath,
  };
});

function internalPairs(kind) {
  const pages = localPages.filter((page) => page.kind === kind);
  const matches = [];
  for (let a = 0; a < pages.length; a += 1) {
    for (let b = a + 1; b < pages.length; b += 1) {
      matches.push({
        pathA: pages[a].path,
        pathB: pages[b].path,
        kind,
        wordsA: pages[a].wordCount,
        wordsB: pages[b].wordCount,
        ...comparePrepared(pages[a], pages[b]),
      });
    }
  }
  return matches;
}

const internalCity = internalPairs("city");
const internalPrice = internalPairs("price");

oldVsNew.sort(sortByRiskAndScore);
internalCity.sort(sortByRiskAndScore);
internalPrice.sort(sortByRiskAndScore);

const report = {
  generatedAt: new Date().toISOString(),
  metric: "5-word shingle jaccard and containment after stripping header/nav/footer/form/script/style HTML.",
  thresholds: {
    high: "jaccard >= 0.25 or containment >= 0.45",
    medium: "jaccard >= 0.14 or containment >= 0.30",
  },
  oldSite: {
    origin: oldCache.origin,
    cacheGeneratedAt: oldCache.generatedAt,
    pageCount: oldPages.length,
  },
  local: {
    pageCount: localPages.length,
    cityCount: localPages.filter((page) => page.kind === "city").length,
    priceCount: localPages.filter((page) => page.kind === "price").length,
  },
  summary: {
    oldVsNew: summarizeMatches(oldVsNew),
    internalCity: summarizeMatches(internalCity),
    internalPrice: summarizeMatches(internalPrice),
  },
  top: {
    oldVsNew: oldVsNew.slice(0, 25),
    internalCity: internalCity.slice(0, 25),
    internalPrice: internalPrice.slice(0, 25),
  },
  all: {
    oldVsNew,
    internalCity,
    internalPrice,
  },
};

await mkdir(path.dirname(outArg), { recursive: true });
await writeFile(outArg, JSON.stringify(report, null, 2));
await writeFile(markdownArg, buildMarkdown(report));

console.log(`Old pages: ${oldPages.length}`);
console.log(`Local pages: ${localPages.length}`);
console.log(`Old vs new high risk: ${report.summary.oldVsNew.high}`);
console.log(`Internal city high risk: ${report.summary.internalCity.high}`);
console.log(`Internal cennik high risk: ${report.summary.internalPrice.high}`);
console.log(`Report: ${outArg}`);
