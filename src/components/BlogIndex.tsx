"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

type Article = {
  href: string;
  title: string;
  description: string;
  image: string;
};

export function BlogIndex({ articles }: { articles: readonly Article[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("sk");

  const filteredArticles = useMemo(() => {
    if (!normalizedQuery) return articles;
    return articles.filter((article) => `${article.title} ${article.description}`.toLocaleLowerCase("sk").includes(normalizedQuery));
  }, [articles, normalizedQuery]);

  return (
    <section className="bg-white px-4 py-14">
      <div className="mx-auto max-w-7xl lg:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-yellow-600">Blog</p>
            <h2 className="mt-2 text-3xl font-black tracking-normal text-black">Rady k sťahovaniu</h2>
          </div>
          <label className="relative block w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-teal-700" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Hľadať v článkoch"
              className="w-full rounded-md border border-teal-200 py-3 pl-10 pr-3 text-black outline-none ring-teal-300 focus:ring-2"
            />
          </label>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {filteredArticles.map((article) => (
            <Link key={article.href} href={article.href} className="group overflow-hidden rounded-lg border border-teal-100 bg-white transition hover:-translate-y-1 hover:border-yellow-300 hover:shadow-lg">
              <img src={article.image} alt="" width={420} height={192} className="h-48 w-full object-cover" loading="lazy" />
              <div className="p-5">
                <h3 className="text-lg font-black text-black group-hover:text-teal-700">{article.title}</h3>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-black">{article.description}</p>
                <span className="mt-5 inline-flex text-sm font-black text-yellow-600">Čítať viac</span>
              </div>
            </Link>
          ))}
        </div>

        {filteredArticles.length === 0 ? <p className="mt-8 rounded-lg bg-teal-50 p-5 text-sm text-black">Nenašli sa žiadne články pre zadaný výraz.</p> : null}
      </div>
    </section>
  );
}
