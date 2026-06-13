import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ochrana osobných údajov | Sťahovanie 24/7",
  description: "Informácie o spracúvaní osobných údajov, kontaktnom formulári, cookies a právach dotknutých osôb na webe Sťahovanie 24/7.",
  alternates: {
    canonical: "/ochrana-osobnych-udajov",
  },
};

const sections = [
  {
    title: "1. Prevádzkovateľ",
    body: [
      "Prevádzkovateľom webovej stránky je Sťahovanie 24/7. Kontaktné údaje pre otázky k spracúvaniu osobných údajov sú uvedené na stránke a vo formulári: telefón +421 944 404 495, email patrik.janicek358@gmail.com.",
      "Ak sa po spustení webu doplnia presné fakturačné údaje prevádzkovateľa, odporúčame ich uviesť aj na tejto stránke.",
    ],
  },
  {
    title: "2. Aké údaje spracúvame",
    body: [
      "Pri odoslaní kontaktného formulára spracúvame meno, email, telefón, vybranú službu a text správy. Tieto údaje používame na vybavenie dopytu, prípravu cenovej ponuky a spätnú komunikáciu.",
      "Pri bežnom používaní webu môžu byť spracúvané aj technické údaje potrebné na bezpečné a spoľahlivé fungovanie stránky, napríklad základné serverové logy.",
    ],
  },
  {
    title: "3. Účel a právny základ",
    body: [
      "Údaje z kontaktného formulára spracúvame na základe predzmluvnej komunikácie alebo oprávneného záujmu odpovedať na zaslaný dopyt.",
      "Nevyhnutné cookies a technické údaje spracúvame z dôvodu zabezpečenia funkčnosti webu. Voliteľné analytické alebo marketingové cookies používame iba po udelení súhlasu.",
    ],
  },
  {
    title: "4. Doba uchovávania",
    body: [
      "Údaje z dopytov uchovávame len po dobu potrebnú na vybavenie komunikácie, prípadne po dobu vyžadovanú účtovnými alebo právnymi predpismi, ak z dopytu vznikne objednávka.",
      "Súhlas s voliteľnými cookies je uložený v prehliadači a môžete ho kedykoľvek zmeniť cez odkaz Cookies v pätičke stránky.",
    ],
  },
  {
    title: "5. Príjemcovia a sprostredkovatelia",
    body: [
      "Na prevádzku webu a odosielanie formulárov môžu byť použité služby hostingu, Netlify Functions a SMTP2GO. Tieto služby spracúvajú údaje iba v rozsahu potrebnom na doručenie správy a prevádzku webu.",
      "Osobné údaje nepredávame tretím stranám.",
    ],
  },
  {
    title: "6. Cookies",
    body: [
      "Web používa nevyhnutné cookies alebo lokálne uložené nastavenia potrebné na zapamätanie voľby cookies a základné fungovanie stránky.",
      "Analytické a marketingové cookies sú voliteľné. Nastavenia môžete kedykoľvek otvoriť kliknutím na odkaz Cookies v pätičke stránky.",
    ],
  },
  {
    title: "7. Vaše práva",
    body: [
      "Máte právo požiadať o prístup k osobným údajom, opravu, vymazanie, obmedzenie spracúvania, prenosnosť údajov alebo namietať proti spracúvaniu, ak sú na to splnené zákonné podmienky.",
      "Ak sa domnievate, že spracúvanie údajov nie je v poriadku, môžete sa obrátiť aj na Úrad na ochranu osobných údajov Slovenskej republiky.",
    ],
  },
  {
    title: "8. Kontakt",
    body: [
      "Otázky k ochrane osobných údajov môžete posielať emailom alebo cez kontaktné údaje uvedené na tejto webovej stránke.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <section className="bg-teal-50 px-4 py-16 text-black">
        <div className="mx-auto max-w-5xl lg:px-6">
          <p className="text-sm font-black uppercase text-teal-700">Právne informácie</p>
          <h1 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Ochrana osobných údajov</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-black">
            Táto stránka vysvetľuje, aké údaje spracúvame pri používaní webu Sťahovanie 24/7, odoslaní kontaktného formulára a nastavení cookies.
          </p>
        </div>
      </section>

      <section className="bg-white px-4 py-14 text-black">
        <div className="mx-auto grid max-w-5xl gap-7 lg:px-6">
          {sections.map((section) => (
            <article key={section.title} className="rounded-lg border border-teal-100 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-black tracking-normal text-black">{section.title}</h2>
              <div className="mt-4 grid gap-3 text-sm leading-7 text-black">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-5 text-sm leading-7 text-black">
            <p>
              Poznámka: pred ostrým spustením odporúčame doplniť presné obchodné/fakturačné údaje prevádzkovateľa. Obsah tejto stránky je pripravený ako praktický webový základ, nie ako individuálne právne stanovisko.
            </p>
          </div>

          <Link href="/#kontakt" className="inline-flex w-fit rounded-lg bg-teal-600 px-5 py-3 font-black text-white transition hover:bg-teal-700">
            Kontaktovať Sťahovanie 24/7
          </Link>
        </div>
      </section>
    </>
  );
}
