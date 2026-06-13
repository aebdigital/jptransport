"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, MapPin, Menu, Phone, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cityLinks, primaryLinks } from "@/data/navigation";

export function Header() {
  const [open, setOpen] = useState(false);
  const [citiesOpen, setCitiesOpen] = useState(false);

  const featuredCities = useMemo(() => cityLinks.slice(0, 12), []);

  return (
    <header className="sticky top-0 z-50 border-b border-teal-100 bg-white/95 text-black shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <Link href="/" className="flex min-w-0 items-center" aria-label="Sťahovanie 24/7 domov">
          <Image src="/logo2.png" alt="Sťahovanie 24/7" width={212} height={60} priority className="h-12 w-auto shrink-0 object-contain sm:h-14" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Hlavná navigácia">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 text-sm font-semibold text-black transition hover:bg-teal-50 hover:text-teal-700">
              {link.label}
            </Link>
          ))}

          <div className="relative">
            <button
              type="button"
              onClick={() => setCitiesOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-black transition hover:bg-teal-50 hover:text-teal-700"
              aria-expanded={citiesOpen}
            >
              <MapPin size={16} />
              Mestá
              <ChevronDown size={16} className={citiesOpen ? "rotate-180 transition" : "transition"} />
            </button>

            {citiesOpen ? (
              <div className="absolute right-0 mt-3 grid max-h-[70vh] w-[min(88vw,760px)] grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-teal-100 bg-white p-3 shadow-2xl sm:grid-cols-2 lg:grid-cols-3">
                {cityLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setCitiesOpen(false)}
                    className="rounded-md px-3 py-2 text-sm text-black transition hover:bg-teal-50 hover:text-teal-700"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <a href="tel:+421944404495" className="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-3 py-2 text-sm font-black text-black transition hover:bg-yellow-300">
            <Phone size={16} />
            +421 944 404 495
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-teal-200 text-black lg:hidden"
          aria-label={open ? "Zavrieť menu" : "Otvoriť menu"}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-teal-100 bg-white px-4 pb-5 pt-2 lg:hidden">
          <nav className="grid gap-1" aria-label="Mobilná navigácia">
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold text-black hover:bg-teal-50 hover:text-teal-700">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 border-t border-teal-100 pt-4">
            <p className="mb-2 px-3 text-xs font-black uppercase text-yellow-600">Najčastejšie mestá</p>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {featuredCities.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-black hover:bg-teal-50 hover:text-teal-700">
                  {link.label}
                </Link>
              ))}
            </div>
            <Link href="/stahovanie-bratislava.html" onClick={() => setOpen(false)} className="mt-3 inline-flex rounded-md bg-yellow-400 px-3 py-2 text-sm font-black text-black">
              Zobraziť lokálne služby
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
