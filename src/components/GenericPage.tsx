import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeEuro, MapPin, ShieldCheck, Truck } from "lucide-react";
import { BlogIndex } from "@/components/BlogIndex";
import { ContactPanel } from "@/components/ContactPanel";
import { PriceCalculator } from "@/components/PriceCalculator";
import { ScrapedContent } from "@/components/ScrapedContent";
import { blogArticleLinks } from "@/data/navigation";
import type { SitePage } from "@/types/site";

function kindLabel(kind: SitePage["kind"]) {
  switch (kind) {
    case "price":
      return "Cenník";
    case "blog":
      return "Blog";
    case "article":
      return "Článok";
    case "city":
      return "Lokálne sťahovanie";
    case "europe":
      return "Sťahovanie Európa";
    case "service":
      return "Služba";
    default:
      return "Sťahovanie 24/7";
  }
}

export function GenericPage({ page }: { page: SitePage }) {
  const isArticle = page.kind === "article";

  return (
    <>
      <section className="relative overflow-hidden bg-slate-950 px-4 py-16 text-white sm:py-20">
        <Image
          src="/hero-moving.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={72}
          className="absolute inset-0 h-full w-full object-cover object-[58%_42%]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.88)_0%,rgba(15,23,42,0.74)_46%,rgba(13,148,136,0.36)_76%,rgba(2,6,23,0.16)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.1),rgba(2,6,23,0.52))]" />

        <div className="relative mx-auto max-w-7xl lg:px-6">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-md bg-teal-500/25 px-3 py-1.5 text-sm font-black uppercase text-white ring-1 ring-teal-200/60 backdrop-blur">
              {page.kind === "price" ? <BadgeEuro size={16} /> : page.kind === "city" ? <MapPin size={16} /> : <Truck size={16} />}
              {kindLabel(page.kind)}
            </p>
            <h1 className="mt-5 text-4xl font-black tracking-normal sm:text-5xl lg:text-6xl">{page.h1}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/90 sm:text-lg">{page.description || page.summary}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="tel:+421944404495" className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-5 py-3 font-black text-black transition hover:bg-yellow-300">
                Zavolať
              </a>
              <Link href="/#kontakt" className="inline-flex items-center gap-2 rounded-lg border border-teal-200/50 bg-teal-500/20 px-5 py-3 font-black text-white backdrop-blur transition hover:bg-teal-500/30">
                Nezáväzná ponuka
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {page.kind === "price" ? <PriceCalculator /> : null}
      {page.kind === "blog" ? <BlogIndex articles={blogArticleLinks} /> : null}

      {isArticle && page.images[0] ? (
        <section className="bg-white px-4 pt-12">
          <div className="mx-auto max-w-5xl">
            <img src={page.images[0].src} alt={page.images[0].alt || page.h1} width={1024} height={460} className="max-h-[460px] w-full rounded-lg object-cover" loading="lazy" />
          </div>
        </section>
      ) : null}

      <ScrapedContent html={page.bodyHtml} />

      {page.kind !== "blog" ? (
        <section className="bg-teal-50 px-4 py-12">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div className="flex items-start gap-3">
              <ShieldCheck size={28} className="mt-1 shrink-0 text-teal-700" />
              <div>
                <h2 className="text-2xl font-black tracking-normal text-black">Potrebujete vyriešiť termín alebo cenu?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-black">Ozvite sa priamo a pripravíme rýchlu orientačnú ponuku podľa trasy, objemu a prístupu.</p>
              </div>
            </div>
            <Link href="/#kontakt" className="inline-flex w-fit rounded-lg bg-yellow-400 px-5 py-3 font-black text-black transition hover:bg-yellow-300">
              Kontaktovať Sťahovanie 24/7
            </Link>
          </div>
        </section>
      ) : null}

      <ContactPanel />
    </>
  );
}
