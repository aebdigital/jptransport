import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { cityLinks, priceLinks, primaryLinks } from "@/data/navigation";

export function Footer() {
  return (
    <footer className="border-t border-blue-100 bg-white text-black">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div>
          <img src="/logo.png" alt="JP TRANSPORT" className="mb-4 h-14 w-auto object-contain" />
          <p className="max-w-sm text-sm leading-6 text-black">
            Byty, domy, firmy, sklady aj väčšie presuny riešime načas, férovo a s dôrazom na bezpečnú manipuláciu.
          </p>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-black uppercase text-black">Kontakt</h2>
          <ul className="space-y-3 text-sm text-black">
            <li className="flex gap-2">
              <MapPin size={17} className="mt-0.5 shrink-0 text-blue-700" />
              Dohňany, 020 51
            </li>
            <li className="flex gap-2">
              <Phone size={17} className="mt-0.5 shrink-0 text-blue-700" />
              <a href="tel:+421944404495" className="hover:text-blue-700">
                +421 944 404 495
              </a>
            </li>
            <li className="flex gap-2">
              <Mail size={17} className="mt-0.5 shrink-0 text-blue-700" />
              <a href="mailto:patrik.janicek358@gmail.com" className="break-all hover:text-blue-700">
                patrik.janicek358@gmail.com
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-black uppercase text-black">Navigácia</h2>
          <ul className="grid gap-2 text-sm text-black">
            {primaryLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-blue-700">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-black uppercase text-black">Rýchle odkazy</h2>
          <div className="flex flex-wrap gap-2">
            {[...cityLinks.slice(0, 10), ...priceLinks.slice(0, 6)].map((link) => (
              <Link key={link.href} href={link.href} className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs text-black transition hover:border-blue-300 hover:text-blue-700">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-blue-100 px-4 py-5 text-center text-xs text-black">
        © JP Transport s.r.o. Všetky práva vyhradené.
      </div>
    </footer>
  );
}
