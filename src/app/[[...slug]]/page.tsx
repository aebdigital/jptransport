import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GenericPage } from "@/components/GenericPage";
import { HomePage } from "@/components/HomePage";
import { scrapedPages } from "@/data/scraped-pages";
import { findPage, pathFromSegments, routeToStaticParams, siteOrigin } from "@/lib/pages";

export const dynamicParams = false;

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

export function generateStaticParams() {
  return scrapedPages.map((page) => routeToStaticParams(page.path));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const page = findPage(pathFromSegments(resolvedParams.slug));

  if (!page) {
    return {
      title: "Stránka sa nenašla | Sťahovanie 24/7",
    };
  }

  const image = "/hero-moving.webp";

  return {
    title: page.title,
    description: page.description || page.summary,
    keywords: page.keywords || undefined,
    alternates: {
      canonical: page.path,
    },
    openGraph: {
      title: page.title,
      description: page.description || page.summary,
      url: `${siteOrigin}${page.path === "/" ? "" : page.path}`,
      siteName: "Sťahovanie 24/7",
      locale: "sk_SK",
      type: "website",
      images: [
        {
          url: image,
          alt: page.h1,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description || page.summary,
      images: [image],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const page = findPage(pathFromSegments(resolvedParams.slug));

  if (!page) {
    notFound();
  }

  if (page.kind === "home") {
    return <HomePage page={page} />;
  }

  return <GenericPage page={page} />;
}
