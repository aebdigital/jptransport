import Link from "next/link";
import { Building2, CheckCircle2, Home, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { ContactPanel } from "@/components/ContactPanel";
import { cityLinks } from "@/data/navigation";
import type { SitePage } from "@/types/site";

const services = [
  {
    id: "stahovanie-byty",
    title: "Sťahovanie bytov",
    href: "/stahovanie-bytu.html",
    icon: Home,
    text: "Menšie aj kompletné byty, balenie, manipulácia a bezpečný prevoz.",
  },
  {
    id: "stahovanie-domy",
    title: "Sťahovanie domov",
    href: "/stahovanie-domu.html",
    icon: PackageCheck,
    text: "Rodinné domy, garáže, pivnice, záhrady a väčší nábytok bez zbytočného stresu.",
  },
  {
    id: "stahovanie-firmy",
    title: "Sťahovanie firiem",
    href: "/stahovanie-firmy.html",
    icon: Building2,
    text: "Kancelárie, prevádzky, archívy a vybavenie s dôrazom na rýchly návrat do práce.",
  },
  {
    id: "stahovanie-domacnosti",
    title: "Vypratávanie a odvoz",
    href: "/vypratavanie.html",
    icon: Truck,
    text: "Vypratávanie priestorov, odvoz nábytku a praktická autodoprava podľa dohody.",
  },
];

const whyItems = [
  {
    title: "Expresné vybavenie",
    text: "Sťahujeme rýchlo a spoľahlivo bez zbytočného čakania. Všetko podľa dohody.",
  },
  {
    title: "100% spoľahlivosť",
    text: "Vaše veci sú v bezpečí. Pracujeme opatrne, presne a s dôrazom na ochranu majetku.",
  },
  {
    title: "Férové ceny",
    text: "Jasná cenová ponuka, žiadne skryté poplatky a úprimné odporúčanie najlepšieho riešenia.",
  },
  {
    title: "Celé Slovensko",
    text: "Nezáleží, kde ste. Presťahujeme vás v rámci mesta, regiónu aj naprieč Slovenskom.",
  },
];

export function HomePage({ page }: { page: SitePage }) {
  return (
    <>
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <img
          src="/hero-moving.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[58%_42%]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.84)_0%,rgba(15,23,42,0.72)_42%,rgba(30,64,175,0.34)_72%,rgba(2,6,23,0.1)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.12),rgba(2,6,23,0.46))]" />

        <div className="relative mx-auto grid min-h-[78vh] max-w-7xl items-center px-4 py-16 lg:px-6">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-md bg-white/15 px-3 py-1.5 text-sm font-black uppercase text-white ring-1 ring-white/25 backdrop-blur">Sťahovanie, preprava, vypratávanie</p>
            <h1 className="mt-5 text-5xl font-black tracking-normal sm:text-6xl lg:text-7xl">JP TRANSPORT</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90 sm:text-xl">{page.description || page.summary}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="tel:+421944404495" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-black text-blue-700 transition hover:bg-blue-50">
                Zavolať teraz
              </a>
              <Link href="/cennik-stahovania.html" className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 py-3 font-black text-white backdrop-blur transition hover:bg-white/20">
                Pozrieť cenník
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-8">
        <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-3 lg:px-6">
          {[
            ["3000+", "spokojných zákazníkov"],
            ["7+", "rokov skúseností"],
            [`${cityLinks.length}+`, "lokálnych stránok v crawle"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-lg border border-zinc-200 p-5">
              <p className="text-3xl font-black text-black">{value}</p>
              <p className="mt-1 text-sm font-semibold text-black">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-blue-50 px-4 py-14">
        <div className="mx-auto max-w-7xl lg:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase text-blue-700">Služby</p>
            <h2 className="mt-2 text-3xl font-black tracking-normal text-black sm:text-4xl">Všetko okolo presunu na jednom mieste</h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <Link id={service.id} key={service.href} href={service.href} className="group rounded-lg border border-blue-100 bg-white p-5 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 text-lg font-black text-black group-hover:text-blue-700">{service.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-black">{service.text}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-7xl lg:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase text-blue-700">Prečo JP TRANSPORT</p>
            <h2 className="mt-2 text-3xl font-black tracking-normal text-black sm:text-4xl">Prečo si vybrať JP TRANSPORT?</h2>
            <p className="mt-4 text-base leading-7 text-black">
              Lebo s nami je sťahovanie bez starostí. Sme rýchli, precízni a dochvíľni, s férovým prístupom od prvého kontaktu.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {whyItems.map((item) => (
              <div key={item.title} className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <CheckCircle2 size={22} />
                </span>
                <h3 className="mt-4 font-black text-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-black">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 rounded-lg border border-blue-100 bg-blue-50 p-5 sm:grid-cols-3">
            {[
              ["Presný termín", "Dohoda platí a tím príde pripravený."],
              ["Bezpečná manipulácia", "Nábytok a veci chránime počas presunu."],
              ["Rýchla dohoda", "Ozveme sa späť a navrhneme praktický postup."],
            ].map(([title, text]) => (
              <div key={title}>
                <h3 className="mt-4 font-black text-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-black">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-blue-600 px-4 py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-start gap-3">
            <ShieldCheck size={28} className="mt-1 shrink-0" />
            <div>
              <h2 className="text-2xl font-black tracking-normal">Sťahovanie po Slovensku aj do Európy</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6">
                Rebuild zachováva lokálne stránky, cenníky, blog aj medzinárodné trasy zo zdrojového webu.
              </p>
            </div>
          </div>
          <Link href="/stahovanie-europa.html" className="inline-flex w-fit rounded-lg bg-white px-5 py-3 font-black text-blue-700 transition hover:bg-blue-50">
            Európske sťahovanie
          </Link>
        </div>
      </section>

      <ContactPanel />
    </>
  );
}
