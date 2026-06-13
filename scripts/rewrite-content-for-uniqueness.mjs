import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PAGES_FILE = path.join(ROOT, "src", "data", "scraped-pages.ts");
const NAV_FILE = path.join(ROOT, "src", "data", "navigation.ts");

function parseArray(source, exportName) {
  const match = source.match(new RegExp(`export const ${exportName} = ([\\s\\S]*?) (?:satisfies SitePage\\[]|as const);`));
  if (!match) throw new Error(`Could not parse ${exportName}`);
  return JSON.parse(match[1]);
}

function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripTags(value = "") {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function hashString(value = "") {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function pick(items, seed, offset = 0) {
  return items[(seed + offset * 17) % items.length];
}

function pickMany(items, key, count, offset = 0) {
  return [...items]
    .map((item, index) => ({ item, rank: hashString(`${key}:${offset}:${index}:${item}`) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, count)
    .map((entry) => entry.item);
}

function joinList(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} a ${items.at(-1)}`;
}

function sentence(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(vars[key] ?? ""));
}

function paragraph(template, vars) {
  return `<p>${sentence(template, vars)}</p>`;
}

function list(items, vars) {
  return `<ul>${items.map((item) => `<li>${sentence(item, vars)}</li>`).join("")}</ul>`;
}

function section(heading, body, vars) {
  return `<section><h2>${sentence(heading, vars)}</h2>${body.join("")}</section>`;
}

function cardGrid(cards, vars) {
  return `<div>${cards
    .map((card) => `<div><h3>${sentence(card.title, vars)}</h3><p>${sentence(card.text, vars)}</p></div>`)
    .join("")}</div>`;
}

const pageSource = await readFile(PAGES_FILE, "utf8");
const navSource = await readFile(NAV_FILE, "utf8");
const pages = parseArray(pageSource, "scrapedPages");
const cityLinks = parseArray(navSource, "cityLinks");
const priceLinks = parseArray(navSource, "priceLinks");
const blogArticleLinks = parseArray(navSource, "blogArticleLinks");

const cityByPath = new Map(cityLinks.map((link) => [link.href, link.label.replace(/^Sťahovanie\s+/i, "").trim()]));
const priceByPath = new Map(priceLinks.map((link) => [link.href, link.label.replace(/^Cenník(?:\s+sťahovania)?\s+/i, "").trim()]));

function slugToTitle(pathname) {
  return pathname
    .replace(/^\//, "")
    .replace(/\.html$/, "")
    .replace(/^cennik-stahovanie-/, "")
    .replace(/^stahovanie-/, "")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase("sk") + word.slice(1))
    .join(" ");
}

function cityForPage(page) {
  if (page.kind === "city") return cityByPath.get(page.path) || slugToTitle(page.path);
  if (page.kind === "price") {
    if (page.path === "/cennik-stahovania.html") return "";
    const cityRoute = page.path.replace(/^\/cennik-stahovanie-/, "/stahovanie-");
    return cityByPath.get(cityRoute) || priceByPath.get(page.path) || slugToTitle(page.path);
  }
  return page.city || "";
}

const orderedCities = pages
  .filter((page) => page.kind === "city")
  .map((page) => ({ path: page.path, city: cityForPage(page) }))
  .sort((a, b) => a.city.localeCompare(b.city, "sk"));

function nearbyCities(page, count = 3) {
  const index = orderedCities.findIndex((item) => item.path === page.path || item.path === page.path.replace(/^\/cennik-stahovanie-/, "/stahovanie-"));
  if (index < 0) return orderedCities.slice(0, count).map((item) => item.city);
  const result = [];
  for (let step = 1; result.length < count && step < orderedCities.length; step += 1) {
    const before = orderedCities[(index - step + orderedCities.length) % orderedCities.length]?.city;
    const after = orderedCities[(index + step) % orderedCities.length]?.city;
    for (const city of [before, after]) {
      if (city && !result.includes(city)) result.push(city);
      if (result.length >= count) break;
    }
  }
  return result;
}

const cityIntroA = [
  "Presun v lokalite {{city}} pripravujeme ako samostatnú trasu, nie ako kopírovaný balík služieb. Najskôr si ujasníme adresy, prístup, objem vecí a časové okno, aby bol deň sťahovania pokojný a predvídateľný.",
  "Sťahovanie v meste {{city}} riešime od prvého telefonátu prakticky: čo sa nesie, odkiaľ kam, či je výťah, kde môže stáť dodávka a ktoré kusy potrebujú osobitnú ochranu.",
  "Pre zákazníkov v okolí {{city}} skladáme plán podľa reálnej situácie na mieste. Inak sa pripravuje garzónka, inak rodinný dom a inak kancelária s technikou a archívmi.",
  "Každé sťahovanie v meste {{city}} má svoje drobnosti: schody, parkovanie, úzke chodby, termín odovzdania bytu alebo citlivý nábytok. Preto postup nastavujeme až po krátkej konzultácii.",
  "Ak potrebujete presun v lokalite {{city}}, cieľ je jednoduchý: veci majú prísť celé, v dohodnutom čase a bez nervózneho hľadania riešení v poslednej minúte.",
  "Pri práci v meste {{city}} dávame dôraz na poradie nakládky, ochranu povrchov a rozumný počet ľudí. Vďaka tomu sa neplatí za chaos, ale za konkrétnu pomoc.",
  "Sťahovanie {{city}} neberieme ako anonymnú položku v cenníku. Zaujíma nás poschodie, výťah, vzdialenosť ku vchodu, typ nábytku aj to, čo má byť pripravené ako prvé.",
  "Domácnosti aj menšie firmy v lokalite {{city}} často potrebujú rýchlu, ale presnú dohodu. Preto dávame jasný postup ešte pred tým, ako tím príde na adresu.",
  "Presun v meste {{city}} pripravujeme tak, aby do seba zapadli balenie, výnos, prevoz aj vyloženie. Menej improvizácie znamená menej zdržania.",
  "Pri sťahovaní v meste {{city}} sa pýtame na praktické veci, ktoré rozhodujú o výsledku: nosenie po schodoch, parkovanie pri vchode, objem krabíc a krehké vybavenie.",
];

const cityIntroB = [
  "Do ponuky preto vstupuje viac než samotná vzdialenosť. Počítame manipuláciu, počet pracovníkov, ochranný materiál, prípadnú demontáž a čas potrebný na bezpečné uloženie vecí v aute.",
  "Pred termínom vieme odporučiť, čo zbaliť skôr, ktoré kusy nechať dostupné a kedy sa oplatí pridať ďalších pracovníkov, aby sa sťahovanie zbytočne nenaťahovalo.",
  "Ak sa presúvate medzi mestami ako {{nearby}}, navrhneme poradie zastávok a približný časový rámec tak, aby sa minimalizovali prázdne kilometre.",
  "Pri väčších presunoch rozdelíme prácu na prípravu, nakládku, transport a uloženie. Každý krok má svoj účel a vďaka tomu sa lepšie drží termín aj rozpočet.",
  "Pri menších zákazkách pomáha najmä rýchla komunikácia a presný zoznam vecí. Vďaka tomu sa dá vybrať vhodné auto, počet ľudí a férová orientačná cena.",
  "Vopred riešime aj citlivé položky, napríklad sklo, spotrebiče, väčšie skrine, kancelársku techniku alebo nábytok, ktorý treba rozobrať pred výnosom.",
  "Ak je v dome slabší prístup alebo chýba výťah, navrhneme postup, ktorý šetrí steny, podlahy aj samotný nábytok.",
  "Pri firemných presunoch myslíme na plynulosť prevádzky: označenie krabíc, poradie miestností a vyloženie tak, aby tím mohol rýchlo pokračovať v práci.",
  "Dohoda je vždy konkrétna. Namiesto všeobecných sľubov dostanete informáciu, čo pripraviť, čo zabezpečí posádka a čo môže cenu zmeniť.",
  "Pri plánovaní berieme do úvahy aj čas príchodu, dostupnosť parkovania a to, či sa dá výnos spraviť naraz alebo po etapách.",
];

const cityHeadings = [
  "Ako prebieha sťahovanie v meste {{city}}",
  "Praktický postup pre presun v lokalite {{city}}",
  "Čo riešime pred príchodom na adresu v meste {{city}}",
  "Sťahovací plán pre lokalitu {{city}} a okolie",
  "Organizácia práce pri sťahovaní {{city}}",
  "Od prvého zoznamu vecí po vyloženie v meste {{city}}",
  "Čo nastavujeme pri zákazkách v lokalite {{city}}",
  "Ako držíme poriadok počas sťahovania {{city}}",
];

const cityCards = [
  { title: "Balenie a označenie", text: "Krabice odporúčame triediť podľa miestností a priority vyloženia. Krehké veci, elektroniku a drobný inventár označíme tak, aby sa s nimi manipulovalo opatrne." },
  { title: "Výnos a schody", text: "Pri bytoch bez výťahu počítame s časovou rezervou a vhodným počtom ľudí. Ťažké kusy sa nesú bezpečne, bez zbytočného tlaku na rýchlosť." },
  { title: "Demontáž nábytku", text: "Skrine, postele alebo pracovné stoly vieme rozobrať a pripraviť na prevoz. Pri skladaní dávame pozor na kovanie, police aj drobné diely." },
  { title: "Ochrana majetku", text: "Citlivé rohy, sklenené časti a povrchy chránime fóliou, dekami alebo kartónom podľa typu vecí a dĺžky trasy." },
  { title: "Prevoz medzi adresami", text: "Nakládku skladáme tak, aby sa veci nehýbali a zároveň sa dali vykladať v správnom poradí." },
  { title: "Vypratávanie po presune", text: "Ak zostane starý nábytok, pivnica alebo nepotrebné kusy, vieme ich odviezť ako samostatnú doplnkovú službu." },
  { title: "Firemný inventár", text: "Pri kanceláriách riešime techniku, dokumenty, stoly, stoličky aj archívy tak, aby bol návrat do práce čo najrýchlejší." },
  { title: "Krátke termíny", text: "Keď je termín tesný, pomôže presný zoznam vecí a pripravený prístup. Podľa toho navrhneme realistickú posádku." },
  { title: "Domy a garáže", text: "Pri rodinných domoch myslíme aj na garáž, záhradu, dielňu a objemnejšie veci, ktoré sa často zabudnú pri prvom odhade." },
  { title: "Krehké kusy", text: "Zrkadlá, sklo, obrazy a menšiu elektroniku riešime samostatne, aby sa neocitli pod ťažkým nákladom." },
  { title: "Nová adresa", text: "Pri vykladaní vieme veci rozdeliť podľa miestností. Šetrí to čas pri vybaľovaní a znižuje chaos po odchode tímu." },
  { title: "Komunikácia", text: "Pred príchodom potvrdíme čas, rozsah a kontaktnú osobu. Počas práce riešime zmeny priamo, aby sa nestrácali minúty." },
];

const cityBullets = [
  "orientačný odhad podľa objemu, poschodia a prístupu k vchodu",
  "prevoz bytového nábytku, spotrebičov, krabíc a osobných vecí",
  "pomoc pri kancelárskom presune mimo hlavnej pracovnej špičky",
  "ochrana podláh, rohov a citlivých častí nábytku podľa potreby",
  "možnosť doplniť vypratávanie, odvoz starého nábytku alebo autodopravu",
  "dohoda na termíne s prihliadnutím na parkovanie a čas nakládky",
  "rozobratie vybraných kusov pred výnosom a opätovná príprava na používanie",
  "praktické odporúčania k baleniu ešte pred samotným termínom",
  "presun menšieho bytu, rodinného domu, skladu alebo prevádzky",
  "preprava medzi lokalitami {{nearby}} podľa dohodnutej trasy",
  "jasné pomenovanie položiek, ktoré môžu meniť konečnú cenu",
  "priebežná komunikácia, ak sa zmení objem vecí alebo čas prístupu",
  "samostatný prístup ku krehkým veciam, elektronike a ťažkým kusom",
  "nakládka v poradí, ktoré urýchli vykladanie na novej adrese",
  "riešenie zákaziek v pracovné dni aj po individuálnej dohode",
  "možnosť pripraviť viac pracovníkov pri dlhom výnose alebo bez výťahu",
  "odporúčanie vhodnej veľkosti auta podľa zoznamu vecí",
  "fotenie alebo krátky popis problematických kusov pred cenovou ponukou",
];

const routeHeadings = [
  "Trasy z mesta {{city}} a blízke presuny",
  "Sťahovanie medzi mestami v okolí {{city}}",
  "Regionálne presuny, ktoré sa dajú dobre naplánovať",
  "Keď sa z lokálnej zákazky stane dlhšia trasa",
  "Presun z lokality {{city}} do iného regiónu",
  "Ako rátame cestu pri zákazkách v okolí {{city}}",
];

const routeText = [
  "Pri trasách smerom na {{nearby}} sledujeme najmä čas nakládky a vykládky. Samotné kilometre sú len časť výpočtu; cenu ovplyvní aj čakacia doba, výnos a počet zastávok.",
  "Ak sa nesťahujete iba v rámci mesta, pomôže spojiť viac úkonov do jednej jazdy. Zákazník tak šetrí čas a posádka má jasné poradie práce.",
  "Pri regionálnych presunoch si vopred overíme, či je na oboch adresách priestor na státie. Je to drobnosť, ktorá dokáže výrazne zrýchliť celý deň.",
  "Trasu nastavujeme tak, aby sa nenosilo dvakrát to isté a aby sa krehké veci vykladali bez zbytočného prekladania.",
  "Ak je súčasťou zákazky aj vypratávanie, naplánujeme ho pred alebo po prevoze podľa toho, čo je výhodnejšie pre prístup a čas.",
  "Pri ceste mimo mesta odporúčame pripraviť presný zoznam väčších kusov. Vďaka tomu sa dá lepšie odhadnúť auto, počet ľudí aj dĺžka práce.",
];

const ctaText = [
  "Pošlite nám adresy, približný zoznam vecí a požadovaný termín. Ozveme sa s návrhom postupu a orientačnou cenou pre {{city}}.",
  "Na rýchly odhad stačí typ priestoru, poschodie, výťah, vzdialenosť ku vchodu a pár fotiek objemných kusov. Podľa toho pripravíme ponuku pre {{city}}.",
  "Ak ešte nemáte všetko zbalené, nevadí. Najskôr si prejdeme rozsah a poradíme, čo pripraviť pred príchodom tímu v lokalite {{city}}.",
  "Pri väčšej zákazke vieme rozdeliť sťahovanie na prípravnú časť, hlavný prevoz a prípadné vypratanie po odovzdaní priestoru.",
  "Najpresnejšia cena vznikne po krátkom upresnení. Opíšte nám prístup, väčšie kusy a cieľovú adresu; zvyšok doladíme spoločne.",
];

const accessModes = [
  "krátku trasu nosenia od auta ku vchodu",
  "rezervu pri nosení cez spoločné priestory",
  "opatrné manévrovanie v úzkych chodbách",
  "samostatné poradie pre ťažké a krehké kusy",
  "rýchle vyloženie vecí určených do prvej miestnosti",
  "prípravu výťahu alebo alternatívu pri schodoch",
  "rozumné rozdelenie krabíc podľa miestností",
  "kontrolu parkovania ešte pred príchodom posádky",
  "ochranu rohov pri väčších skriniach a spotrebičoch",
  "nakládku podľa toho, čo sa bude vykladať ako prvé",
  "oddelenie osobných vecí od nábytku a techniky",
  "priestor na krátke zastavenie bez blokovania susedov",
  "postupné vynášanie pri domoch s viacerými podlažiami",
  "balenie citlivých predmetov mimo hlavného priechodu",
  "komunikáciu s kontaktnou osobou na oboch adresách",
  "časovú rezervu pri starších domoch a menších vchodoch",
];

const buildingScenarios = [
  "starší bytový dom s užším schodiskom",
  "novostavba s presným režimom výťahu",
  "rodinný dom s garážou a pivnicou",
  "menšia kancelária s technikou a dokumentmi",
  "byt po rekonštrukcii, kde treba chrániť povrchy",
  "prenajatý priestor s pevne daným odovzdaním",
  "domácnosť s väčším množstvom krabíc",
  "sklad alebo dielňa s rôznorodými predmetmi",
  "prevádzka, ktorá potrebuje rýchly návrat do chodu",
  "byt bez výťahu a s dlhším výnosom",
  "adresa s obmedzeným státím pri vchode",
  "presun medzi dvoma menšími priestormi",
  "kombinácia bytu, pivnice a samostatnej garáže",
  "kancelária, kde sa vybavenie delí podľa tímov",
  "dom s objemným nábytkom a spotrebičmi",
  "priestor, kde sa časť vecí iba odváža preč",
];

const handlingDetails = [
  "väčšie skrine, ktoré je lepšie rozobrať ešte pred nosením",
  "sklenené výplne, zrkadlá a obrazy uložené mimo ťažkého nákladu",
  "spotrebiče, pri ktorých sa počíta s opatrným naklonením",
  "krabice s knihami, ktoré netreba zbytočne preťažovať",
  "pracovné stoly a stoličky, ktoré majú byť po vyložení hneď použiteľné",
  "detské izby, kde pomáha označenie podľa poradia vybaľovania",
  "kuchynské vybavenie balené oddelene od drobnej elektroniky",
  "matrace a čalúnený nábytok chránený pred zašpinením",
  "archívy a dokumenty, ktoré sa musia dostať na správne miesto",
  "sezónne veci z pivnice, ktoré sa často podcenia pri odhade",
  "náradie a dielenské vybavenie s vyššou hmotnosťou",
  "drobný inventár, ktorý je najlepšie pripraviť v uzavretých boxoch",
  "nábytkové diely označené tak, aby sa nestratilo kovanie",
  "technika zabalená oddelene od káblov a príslušenstva",
  "veci na prvý deň, ktoré majú zostať dostupné aj po presune",
  "starý nábytok určený na odvoz mimo novej adresy",
];

const localOutcomes = [
  "menej čakania pri vchode a plynulejšiu nakládku",
  "presnejší odhad času aj počtu pracovníkov",
  "nižšie riziko poškodenia pri rýchlej manipulácii",
  "prehľadnejšie vyloženie na novej adrese",
  "menší počet otázok počas samotného termínu",
  "lepšiu kontrolu nad vecami, ktoré idú do skladu",
  "jednoduchšie riešenie doplnkového vypratávania",
  "rýchlejšie odovzdanie pôvodného priestoru",
  "jasnejšie rozdelenie práce medzi členov posádky",
  "lepšiu cenu bez zbytočného časového nafukovania",
  "pokojnejší priebeh pri práci po schodoch",
  "praktickejšie rozloženie nákladu v aute",
  "istejší termín aj pri presune medzi mestami",
  "menej improvizácie pri krehkých predmetoch",
  "rýchlejšie začatie vybaľovania po odchode tímu",
  "prehľadný rozsah práce ešte pred potvrdením ceny",
];

const roomGroups = [
  "kuchyňa, spálňa a veci na prvý deň",
  "obývačka, pracovný kút a väčšie skrine",
  "detská izba, sezónne veci a športové vybavenie",
  "pivnica, garáž a náradie s vyššou hmotnosťou",
  "kancelária, archív a technické vybavenie",
  "chodba, komora a drobný nábytok",
  "spotrebiče, matrace a čalúnený nábytok",
  "skladové regály, krabice a firemný inventár",
  "záhradné veci, dielňa a úložné boxy",
  "šatníkové skrine, postele a nočné stolíky",
  "krehké dekorácie, obrazy a sklenené plochy",
  "pracovné stoly, monitory a dokumenty",
  "starý nábytok určený na odvoz",
  "veci, ktoré majú zostať dostupné po príchode",
  "menšie kusy pripravené do výťahu",
  "ťažké položky, ktoré treba niesť samostatne",
];

const timeWindows = [
  "ranný začiatok s plynulou nakládkou",
  "poobedný termín po uvoľnení parkovania",
  "presun rozdelený na prípravu a hlavný prevoz",
  "krátke časové okno pri odovzdaní bytu",
  "termín prispôsobený pracovnej prevádzke",
  "dohoda mimo najrušnejšej časti dňa",
  "postupné vykladanie podľa miestností",
  "časová rezerva pri adrese bez výťahu",
  "rýchle vypratanie po dokončení presunu",
  "naloženie s dôrazom na následné skladanie",
  "vykládka až po pripravení cieľovej adresy",
  "koordinácia s ďalšou zastávkou na trase",
  "termín naviazaný na prevzatie kľúčov",
  "krátka kontrola rozsahu pred príchodom auta",
  "presun citlivých vecí mimo hlavného nákladu",
  "dokončenie práce pred ďalším používaním priestoru",
];

const scenarioTemplates = [
  "Ak sa pripravuje {{roomGroup}}, pri meste {{city}} ho dávame do plánu spolu s režimom: {{timeWindow}}.",
  "Pri požiadavke na {{accessMode}} je užitočné odfotiť vstup, výťah alebo schodisko; tím si vie nastaviť bezpečnejší postup.",
  "Keď sa rieši {{roomGroup}}, odporúčame označiť krabice podľa miestnosti, aby vykladanie v lokalite {{city}} nezdržalo hľadanie.",
  "Ak je v zozname {{handlingDetail}}, posádka ho uloží mimo časti nákladu, ktorá sa bude vykladať ako posledná.",
  "Pre trasu cez {{nearby}} pomáha, keď je vopred jasné, či sa pôjde na jednu adresu alebo cez medzi-zastávku.",
  "Pri scenári {{timeWindow}} je lepšie potvrdiť kontaktnú osobu na cieľovej adrese ešte pred odchodom auta.",
  "Ak sa kombinuje sťahovanie a odvoz, {{roomGroup}} rozdelíme na veci do nového priestoru a veci mimo domácnosti.",
  "Pri priestore typu {{buildingScenario}} sa oplatí pripraviť kratší priechod od dverí k výťahu alebo schodom.",
  "Keď zákazník potrebuje {{outcome}}, najviac pomáha presný zoznam veľkých kusov a počet krabíc.",
  "Ak sa v lokalite {{city}} pracuje so starším nábytkom, vopred si povieme, čo sa môže rozobrať a čo sa musí niesť vcelku.",
  "Pri položkách ako {{handlingDetail}} sa oplatí vyhradiť miesto pri nakládke, aby neboli pod tlakom ostatných vecí.",
  "Ak je cieľom {{outcome}}, plán nastavíme podľa toho, ktoré miestnosti majú byť použiteľné ako prvé.",
  "Pri zákazke medzi {{city}} a {{nearby}} sa dá čas ušetriť tým, že sa citlivé kusy vyložia bez ďalšieho presúvania.",
  "Ak sa očakáva {{timeWindow}}, odporúčame pripraviť osobné veci mimo hlavnej nakládky.",
  "Pri službe v meste {{city}} pomáha, keď sú kľúče, parkovanie a prístup vyriešené pred príchodom tímu.",
  "Keď je hlavná úloha {{roomGroup}}, cenu aj trvanie ovplyvní najmä výnos, nie iba samotná jazda.",
  "Ak má byť výsledkom {{outcome}}, pri lokalite {{city}} si vopred povieme, ktoré kusy nesmú čakať v spoločných priestoroch.",
  "Pri kombinácii {{roomGroup}} a {{handlingDetail}} je vhodné rozdeliť nakládku na ľahšie krabice a samostatné ťažké položky.",
  "Keď sa pracuje v režime {{timeWindow}}, lepšie funguje kratší zoznam priorít než dlhé rozhodovanie počas nosenia.",
  "Pri presune okolo {{nearby}} sa oplatí potvrdiť, či sa bude čakať na výťah, správcu alebo odovzdanie priestoru.",
  "Ak sa v meste {{city}} rieši {{accessMode}}, posádka si rozdelí prácu tak, aby sa vchod neblokoval dlhšie než treba.",
  "Pri veciach ako {{handlingDetail}} odporúčame pripraviť samostatnú zónu, kde sa náklad nebude miešať s krabicami.",
  "Keď je v hre {{buildingScenario}}, dáva zmysel overiť šírku priechodu a smer otvárania dverí.",
  "Ak sa zákazka týka {{roomGroup}}, pomáha určiť, čo sa má po vyložení používať ešte v ten istý deň.",
  "Pri trase {{city}} a {{nearby}} môže byť výhodnejšie začať na adrese s horším prístupom a druhú nechať na plynulé vyloženie.",
  "Keď zákazník očakáva {{outcome}}, do dohody zahrnieme aj poradie miestností na cieľovej adrese.",
  "Pri položke {{handlingDetail}} sa oplatí dopredu povedať, či sa dá rozobrať alebo musí ísť vcelku.",
  "Ak je priestor {{buildingScenario}}, cenu často ovplyvní viac manipulácia v budove než samotná vzdialenosť jazdy.",
  "Pri lokalite {{city}} odporúčame pripraviť krátky popis prístupu, najmä ak sa auto nemôže dostať priamo ku vchodu.",
  "Keď sa sťahuje {{roomGroup}}, krabice s každodennými vecami nedávame hlboko do nákladu.",
  "Ak sa plánuje {{timeWindow}}, zákazníkovi odporúčame pripraviť platby, kľúče a kontakty ešte pred príchodom posádky.",
  "Pri práci v okolí {{nearby}} sa dá čas skrátiť tým, že všetky zastávky majú vopred určené poradie.",
  "Keď je cieľom {{outcome}}, tím si ešte pred nosením ujasní, ktoré veci patria do bytu, pivnice alebo na odvoz.",
  "Ak sa v zozname objaví {{handlingDetail}}, posádka ho nenakladá pod krabice ani medzi voľné drobnosti.",
  "Pri priestore {{buildingScenario}} pomôže, keď sú chodby voľné a menšie kusy už stoja pri dverách.",
  "Keď sa rieši {{accessMode}}, dohoda pred termínom vie ušetriť viac času než ďalší človek pridaný na poslednú chvíľu.",
];

const localProfileTemplates = [
  "Pri lokalite {{city}} sledujeme {{accessMode}}, lebo {{buildingScenario}} často rozhoduje o tempe celej práce.",
  "Ak sa v meste {{city}} rieši {{handlingDetail}}, odporúčame pripraviť ho oddelene; výsledkom je {{outcome}}.",
  "Pre zákazky okolo {{city}} dávame do plánu {{accessMode}} a pri trase cez {{nearby}} rátame aj s časom vykládky.",
  "Keď je súčasťou presunu {{buildingScenario}}, pomáha vopred určiť, kde budú stáť krabice a čo pôjde do auta ako posledné.",
  "Pri položkách typu {{handlingDetail}} je dôležité, aby sa nenosili spolu s vecami, ktoré môžu tlačiť alebo sa posúvať.",
  "V lokalite {{city}} sa oplatí potvrdiť parkovanie skôr než príde posádka; prináša to {{outcome}}.",
  "Ak sa zákazka spája s miestami {{nearby}}, navrhneme poradie zastávok tak, aby sa náklad zbytočne neprekladal.",
  "Pre {{city}} často volíme plán, ktorý kombinuje {{accessMode}}, ochranu nábytku a jasné označenie miestností.",
  "Keď zákazník nahlási {{handlingDetail}}, vieme lepšie vybrať počet ľudí a pripraviť auto na bezpečné uloženie.",
  "Pri priestore ako {{buildingScenario}} sa oplatí mať kontaktnú osobu aj na cieľovej adrese; zlepší to {{outcome}}.",
  "Pri menšom presune v meste {{city}} niekedy stačí presný zoznam kusov, pri väčšom pomáha krátka fotodokumentácia.",
  "Ak má sťahovanie obsahovať aj odvoz starých vecí, zaradíme ho do harmonogramu tak, aby nebrzdil hlavný prevoz.",
];

function buildLocalProfileSection(page, city) {
  const seed = hashString(`${page.path}:profile`);
  const nearby = joinList(nearbyCities(page, 3));
  const notes = pickMany(localProfileTemplates, page.path, 6).map((template, index) =>
    sentence(template, {
      city,
      nearby,
      accessMode: pick(accessModes, seed, index),
      buildingScenario: pick(buildingScenarios, seed, index + 3),
      handlingDetail: pick(handlingDetails, seed, index + 7),
      outcome: pick(localOutcomes, seed, index + 11),
    }),
  );

  return section(
    pick(["Lokálny profil zákazky v meste {{city}}", "Na čo sa pri lokalite {{city}} pozeráme samostatne", "Detaily, ktoré odlišujú presun v lokalite {{city}}", "Praktické poznámky k sťahovaniu {{city}}"], seed),
    [list(notes, { city, nearby })],
    { city, nearby },
  );
}

function buildScenarioSection(page, city, mode) {
  const seed = hashString(`${page.path}:${mode}:scenario`);
  const nearby = joinList(nearbyCities(page, 3));
  const notes = pickMany(scenarioTemplates, `${page.path}:${mode}`, mode === "price" ? 15 : 10).map((template, index) =>
    sentence(template, {
      city,
      nearby,
      roomGroup: pick(roomGroups, seed, index),
      timeWindow: pick(timeWindows, seed, index + 2),
      accessMode: pick(accessModes, seed, index + 4),
      buildingScenario: pick(buildingScenarios, seed, index + 6),
      handlingDetail: pick(handlingDetails, seed, index + 8),
      outcome: pick(localOutcomes, seed, index + 10),
    }),
  );

  return section(
    mode === "price" ? pick(["Modelové situácie pri cene {{city}}", "Čo môže zmeniť rozpočet v lokalite {{city}}", "Príklady detailov pred cenovou ponukou {{city}}"], seed) : pick(["Modelové situácie pre {{city}}", "Praktické príklady z plánovania {{city}}", "Čo sa oplatí premyslieť pri lokalite {{city}}"], seed),
    [list(notes, { city, nearby })],
    { city, nearby },
  );
}

function buildCityHtml(page, city) {
  const seed = hashString(page.path);
  const nearby = joinList(nearbyCities(page, 3));
  const vars = { city, nearby };
  const cards = pickMany(cityCards, page.path, 4);
  const bullets = pickMany(cityBullets, page.path, 6, 2);

  return [
    section(pick(cityHeadings, seed), [paragraph(pick(cityIntroA, seed), vars), paragraph(pick(cityIntroB, seed, 1), vars)], vars),
    buildLocalProfileSection(page, city),
    buildScenarioSection(page, city, "city"),
    section(
      pick(["Služby, ktoré sa pri lokalite {{city}} najčastejšie kombinujú", "Čo vieme pripraviť pre domácnosť alebo firmu", "Najčastejšie úlohy pri presune v meste {{city}}", "Rozsah prác podľa typu priestoru", "Pomoc, ktorá dáva pri sťahovaní {{city}} zmysel"], seed, 2),
      [cardGrid(cards, vars)],
      vars,
    ),
    section(pick(["Čo je dobré dohodnúť vopred", "Detaily, ktoré chránia termín aj rozpočet", "Príprava pred samotným sťahovaním", "Krátky kontrolný zoznam pred termínom", "Informácie, ktoré zrýchlia cenovú ponuku"], seed, 3), [list(bullets, vars)], vars),
    section(pick(routeHeadings, seed, 4), [paragraph(pick(routeText, seed, 5), vars)], vars),
    section(pick(["Nezáväzná ponuka pre {{city}}", "Ako získať cenu pre sťahovanie {{city}}", "Dohodnite si termín v lokalite {{city}}", "Rýchly odhad pre presun v meste {{city}}", "Kontakt k zákazke v lokalite {{city}}"], seed, 6), [paragraph(pick(ctaText, seed, 7), vars), '<a href="/#kontakt">Poslať dopyt</a>'], vars),
  ].join("");
}

const priceIntro = [
  "Cenník pre lokalitu {{city}} nevychádza iba z kilometrov. Do ceny vstupuje objem vecí, výťah, poschodie, vzdialenosť od auta ku vchodu, počet pracovníkov a doplnkové služby.",
  "Pri výpočte ceny v meste {{city}} rozlišujeme rýchly presun pár kusov, kompletný byt, rodinný dom aj kanceláriu. Každý typ potrebuje iný čas a inú posádku.",
  "Ak chcete cenu sťahovania {{city}} odhadnúť presnejšie, pripravte zoznam väčších kusov, počet krabíc, informáciu o výťahu a adresy oboch miest.",
  "Transparentná ponuka pre {{city}} vzniká až po tom, čo poznáme prístup, objem, termín a prípadné požiadavky na balenie, demontáž alebo vypratávanie.",
  "Pri zákazkách v meste {{city}} odporúčame riešiť cenu spolu s organizáciou práce. Lacnejšie býva dobre pripravené sťahovanie, nie uponáhľaná improvizácia.",
  "Cenu pre {{city}} vieme držať férovú vtedy, keď sú vopred jasné väčšie kusy, poschodia, parkovanie a prípadná potreba ďalších zastávok.",
];

const priceFactors = [
  "počet miestností a približný objem krabíc",
  "ťažké kusy ako práčka, trezor, klavír, veľké skrine alebo spotrebiče",
  "výťah, schody, úzke chodby a dĺžka nosenia od auta",
  "potreba demontáže, montáže alebo ochranného balenia",
  "prevoz v rámci mesta alebo cesta smerom na {{nearby}}",
  "čas nakládky a vykládky na oboch adresách",
  "vypratávanie, odvoz starého nábytku alebo likvidácia nepotrebných vecí",
  "termín, časové okno a počet pracovníkov potrebných na bezpečnú manipuláciu",
  "parkovanie pri vchode, povolenie na státie alebo obmedzený prístup",
  "počet zastávok, napríklad sklad, pivnica, garáž alebo druhá adresa",
];

const priceCards = [
  { title: "Menší byt", text: "Pri menšom byte rozhoduje najmä počet krabíc, výťah a vzdialenosť od auta. Často stačí kratší čas, no príprava stále šetrí peniaze." },
  { title: "Rodinný dom", text: "Domy mávajú viac zón: izby, garáž, pivnicu, záhradu alebo dielňu. Cena sa preto počíta podľa reálneho rozsahu, nie podľa jednej položky." },
  { title: "Firma a kancelária", text: "Pri firemnom presune vstupuje do ceny označenie pracovísk, technika, archív a požiadavka na rýchly návrat do prevádzky." },
  { title: "Doplnkové práce", text: "Balenie, demontáž, vypratávanie alebo odvoz nábytku sa pridávajú len vtedy, keď ich zákazka skutočne potrebuje." },
  { title: "Ťažké predmety", text: "Ťažké alebo citlivé kusy môžu vyžadovať viac ľudí, špeciálne uloženie v aute alebo dlhšiu manipuláciu." },
  { title: "Dlhšia trasa", text: "Pri presune mimo mesta sledujeme kilometre, čas jazdy, počet zastávok a to, či sa dá trasa spojiť s ďalšou službou." },
];

const priceProfileTemplates = [
  "Pri cene pre {{city}} má najväčšiu váhu {{priceFocus}}, najmä ak sa zároveň rieši {{buildingScenario}}.",
  "Ak zákazka obsahuje {{handlingDetail}}, nacenenie počíta s časom na bezpečnú manipuláciu, nie iba s cestou.",
  "Pri trase smerom na {{nearby}} môže cenu ovplyvniť {{routeFactor}} a počet reálnych zastávok.",
  "V lokalite {{city}} odporúčame spresniť {{accessMode}}, pretože práve to často zmení počet pracovníkov.",
  "Keď sa pridá {{addon}}, je lepšie uviesť to už v dopyte; ponuka potom nezabudne na potrebný čas.",
  "Pri priestore typu {{buildingScenario}} sa cena zníži hlavne dobrou prípravou krabíc a voľným prístupom.",
  "Ak je hlavným rizikom {{handlingDetail}}, do ponuky dávame viac času na zabalenie a uloženie v aute.",
  "Cenník pre {{city}} je presnejší, keď poznáme {{priceFocus}} a vieme, či sa bude pracovať po schodoch.",
  "Pri kombinácii s odvozom alebo vypratávaním sa oplatí spojiť práce do jedného termínu; výsledkom je {{outcome}}.",
  "Ak sa cena porovnáva s inou ponukou, treba skontrolovať, či zahŕňa {{addon}} a prácu pracovníkov na oboch adresách.",
];

const specificPriceNotes = {
  "/cennik-stahovanie-lipany.html": {
    heading: "Poznámka k naceneniu pre lokalitu Lipany",
    text: "Pri Lipanoch sa pri odhade často oplatí oddeliť menší mestský presun od trasy smerom na Sabinov, Prešov alebo okolité obce. Ak je súčasťou práce pivnica, garáž alebo vypratanie po staršom bývaní, uveďte to už v prvom dopyte. Cena potom lepšie zohľadní nosenie, čas na triedenie vecí a počet pracovníkov, ktorí majú prísť na adresu.",
  },
  "/cennik-stahovanie-vrutky.html": {
    heading: "Poznámka k naceneniu pre lokalitu Vrútky",
    text: "Pri Vrútkach hrá dôležitú rolu napojenie na Martin, Sučany a Turiec. Pri cene preto sledujeme, či ide o krátky presun v rámci mesta, sťahovanie medzi bytovými domami alebo trasu s viacerými zastávkami. Ak sa prevážajú spotrebiče, kancelárske vybavenie alebo veci zo skladu, pomôže poslať fotky väčších kusov a uviesť dostupnosť výťahu.",
  },
};

const priceFocuses = [
  "celkový objem krabíc a nábytku",
  "čas nosenia medzi autom a vchodom",
  "počet ťažkých kusov v zozname",
  "dostupnosť výťahu počas termínu",
  "počet miestností na vyloženie",
  "dĺžka trasy medzi adresami",
  "počet pracovníkov potrebných pri výnose",
  "rozsah balenia pred nakládkou",
  "možnosť státia pri oboch adresách",
  "počet zastávok mimo hlavnej trasy",
  "rozsah demontáže väčšieho nábytku",
  "časové okno, v ktorom sa musí presun dokončiť",
];

const routeFactors = [
  "čakanie pri prevzatí kľúčov",
  "obmedzené státie pri bytovom dome",
  "dlhšie nosenie od auta",
  "nutnosť vyložiť náklad podľa miestností",
  "skorý ranný alebo večerný termín",
  "prejazd cez viac adries",
  "nakládka zo skladu alebo garáže",
  "doplnkové balenie priamo na mieste",
  "členenie nákladu na veci do bytu a pivnice",
  "potreba chrániť čerstvo dokončené povrchy",
  "nadväzný odvoz starého nábytku",
  "manipulácia s vecami, ktoré sa nedajú rozobrať",
];

const addonsForPricing = [
  "balenie krehkých vecí",
  "demontáž skríň alebo postelí",
  "vypratávanie po odovzdaní priestoru",
  "odvoz starého nábytku",
  "ochranný materiál pre citlivé kusy",
  "viac pracovníkov pri výnose bez výťahu",
  "samostatná manipulácia so spotrebičmi",
  "vyloženie podľa miestností",
  "prevoz cez ďalšiu zastávku",
  "skladanie nábytku po doručení",
  "prenášanie z pivnice alebo garáže",
  "časová rezerva pri presnom odovzdaní bytu",
];

function buildPriceProfileSection(page, city) {
  const seed = hashString(`${page.path}:price-profile`);
  const nearby = joinList(nearbyCities(page, 3));
  const notes = pickMany(priceProfileTemplates, page.path, 6).map((template, index) =>
    sentence(template, {
      city,
      nearby,
      priceFocus: pick(priceFocuses, seed, index),
      routeFactor: pick(routeFactors, seed, index + 4),
      addon: pick(addonsForPricing, seed, index + 8),
      accessMode: pick(accessModes, seed, index + 12),
      buildingScenario: pick(buildingScenarios, seed, index + 16),
      handlingDetail: pick(handlingDetails, seed, index + 20),
      outcome: pick(localOutcomes, seed, index + 24),
    }),
  );

  return section(
    pick(["Cenový profil pre lokalitu {{city}}", "Prečo sa cena v meste {{city}} môže líšiť", "Lokálne premenné pri nacenení {{city}}", "Ako čítame rozsah zákazky v lokalite {{city}}"], seed),
    [list(notes, { city, nearby })],
    { city, nearby },
  );
}

function buildPriceHtml(page, city) {
  if (!city) {
    return [
      section("Cenník sťahovania bez skrytých položiek", [
        paragraph("Základná cena závisí od typu priestoru, objemu vecí, prístupu k adrese, počtu pracovníkov a vzdialenosti. Orientačná kalkulačka na tejto stránke pomôže s prvým odhadom, finálnu ponuku však vždy potvrdíme podľa konkrétneho rozsahu.", {}),
        paragraph("Najpresnejší výpočet získate, keď pošlete adresy, poschodie, informáciu o výťahu, zoznam väčších kusov a približný počet krabíc.", {}),
      ], {}),
      section("Čo najčastejšie mení výslednú cenu", [list(priceFactors.slice(0, 7), { nearby: "ďalšie mestá na trase" })], {}),
      section("Ako cenu spresníme", [
        cardGrid([
          { title: "Rýchly odhad", text: "Stačí krátky opis zákazky a základné údaje o prístupe." },
          { title: "Presnejšia ponuka", text: "Fotky väčších kusov a počet krabíc znížia riziko rozdielu medzi odhadom a realitou." },
          { title: "Doplnkové služby", text: "Balenie, vypratávanie alebo odvoz nábytku pripočítame iba vtedy, keď ich chcete využiť." },
        ], {}),
      ], {}),
    ].join("");
  }

  const seed = hashString(page.path);
  const nearby = joinList(nearbyCities(page, 3));
  const vars = { city, nearby };

  return [
    section(pick(["Cenník sťahovania {{city}} podľa reálneho rozsahu", "Cena sťahovania {{city}}: čo sa počíta", "Ako skladáme ponuku pre lokalitu {{city}}", "Férový odhad ceny v meste {{city}}", "Čo vplýva na cenník pri lokalite {{city}}"], seed), [paragraph(pick(priceIntro, seed, 1), vars)], vars),
    buildPriceProfileSection(page, city),
    buildScenarioSection(page, city, "price"),
    specificPriceNotes[page.path] ? section(specificPriceNotes[page.path].heading, [paragraph(specificPriceNotes[page.path].text, {})], {}) : "",
    section(pick(["Hlavné položky výpočtu", "Čo potrebujeme vedieť pred nacenením", "Premenné, ktoré menia cenu", "Kontrolný zoznam pre rýchly odhad", "Údaje k presnejšej ponuke"], seed, 2), [list(pickMany(priceFactors, page.path, 6), vars)], vars),
    section(pick(["Typické rozsahy zákaziek v meste {{city}}", "Najčastejšie cenové scenáre", "Rozdiel medzi malým a kompletným presunom", "Ako sa líši byt, dom a firma", "Kedy sa oplatí pridať doplnkovú službu"], seed, 3), [cardGrid(pickMany(priceCards, page.path, 4, 3), vars)], vars),
    section(pick(["Ako cenu pre {{city}} spresniť", "Rýchla cesta k presnej ponuke", "Čo poslať pred potvrdením termínu", "Podklady k férovej kalkulácii", "Dopyt bez hádania ceny"], seed, 4), [
      paragraph(pick(["Najlepšie funguje krátky zoznam vecí, pár fotiek väčších kusov a informácia, či sa sťahuje výťahom alebo po schodoch. Podľa toho navrhneme posádku, auto aj čas.", "Ak sa sťahuje aj smerom na {{nearby}}, uveďte obe adresy a prípadné zastávky. Trasu potom nastavíme tak, aby bola práca aj cena rozumná.", "Pri neistom objeme odporúčame poslať aspoň orientačný počet krabíc a fotky hlavných miestností. Lepší vstup znamená presnejšiu cenovú ponuku.", "Pri firemnom presune doplňte počet pracovísk, techniky a požadovaný čas dokončenia. Vďaka tomu sa dá vyhnúť prestojom."], seed, 5), vars),
      '<a href="/#kontakt">Chcem cenovú ponuku</a>',
    ], vars),
  ].join("");
}

const serviceConfigs = {
  "/stahovanie-bytu.html": {
    title: "Sťahovanie bytu bez chaosu a zbytočných prestojov",
    description: "Praktické sťahovanie bytov s balením, výnosom, prevozom a uložením vecí podľa miestností. Dohodnite si termín a orientačnú cenu.",
    h1: "Sťahovanie bytu s jasným postupom",
    body: [
      ["Sťahovanie bytu krok za krokom", "Pri byte rozhoduje príprava: počet krabíc, výťah, poschodie, parkovanie a väčšie kusy nábytku. Pred termínom si prejdeme rozsah, aby posádka prišla s vhodným autom, materiálom a časovou rezervou."],
      ["Čo vieme zabezpečiť", "Pomôžeme s výnosom, balením krehkých vecí, ochranou nábytku, demontážou vybraných kusov a vyložením podľa miestností. Pri menších bytoch často stačí rýchly presun, pri väčších sa oplatí rozdeliť prácu na prípravu a prevoz."],
      ["Ako zrýchliť deň sťahovania", "Najviac pomáha označiť krabice, uvoľniť chodbu, pripraviť výťah a nahlásiť veci, ktoré sa nesmú nakladať pod ťažší nábytok."],
    ],
  },
  "/stahovanie-domu.html": {
    title: "Sťahovanie domu, garáže a pivnice | Sťahovanie 24/7",
    description: "Presun rodinného domu vrátane nábytku, garáže, pivnice, dielne a doplnkových služieb. Férová ponuka podľa skutočného rozsahu.",
    h1: "Sťahovanie domu od izieb až po garáž",
    body: [
      ["Dom má viac častí než iba nábytok", "Pri rodinnom dome sa často sťahujú aj pivnice, garáže, záhradné vybavenie, dielňa alebo sezónne veci. Preto sa pýtame na celý rozsah, nie len na obytné miestnosti."],
      ["Plán nakládky a vykládky", "Ťažké kusy, spotrebiče a objemný nábytok pripravíme tak, aby sa v aute nehýbali a na novej adrese sa dali vyložiť v rozumnom poradí."],
      ["Doplnkové práce", "Ak po presune zostane starý nábytok alebo nepotrebné veci, vieme pridať odvoz, vypratanie alebo samostatnú prepravu materiálu."],
    ],
  },
  "/stahovanie-firmy.html": {
    title: "Sťahovanie firmy a kancelárie bez zbytočných prestojov",
    description: "Sťahovanie kancelárií, prevádzok, archívov a techniky s plánom podľa pracovného režimu firmy. Minimalizujeme prestoje.",
    h1: "Sťahovanie firiem s dôrazom na prevádzku",
    body: [
      ["Najdôležitejší je návrat do práce", "Pri firemnom presune nejde len o prevoz stolov. Riešime označenie pracovísk, archívy, techniku, poradie miestností a čas, kedy má byť prevádzka znovu použiteľná."],
      ["Postup podľa oddelení", "Krabice a vybavenie odporúčame deliť podľa miestností alebo tímov. Vykládka potom prebieha rýchlejšie a zamestnanci nehľadajú veci v nesprávnych zónach."],
      ["Termín podľa firmy", "Presun vieme naplánovať mimo špičky alebo po etapách, aby sa neblokovala celá prevádzka naraz."],
    ],
  },
  "/autodoprava.html": {
    title: "Autodoprava a preprava nábytku podľa dohody",
    description: "Autodoprava pre nábytok, materiál, vybavenie domácnosti alebo firemný inventár. Cena podľa trasy, objemu a manipulácie.",
    h1: "Autodoprava pre nábytok, tovar a vybavenie",
    body: [
      ["Preprava nie je iba cesta autom", "Pri autodoprave počítame objem nákladu, spôsob nakládky, zabezpečenie vecí v aute a dostupnosť oboch adries. Vďaka tomu sa dá vyhnúť poškodeniu aj zdržaniu."],
      ["Kedy sa oplatí objednať prepravu", "Pomáhame pri prevoze nábytku, spotrebičov, firemného vybavenia, menších skladových zásob alebo vecí, ktoré sa nezmestia do osobného auta."],
      ["Nakládka a ochrana", "Ak potrebujete aj pomoc s nosením, povedzte to pri dopyte. Posádku a čas nastavíme inak než pri samotnom pristavení auta."],
    ],
  },
  "/odvoz-nabytku.html": {
    title: "Odvoz starého nábytku a nepotrebných vecí",
    description: "Odvoz nábytku po sťahovaní, rekonštrukcii alebo vypratávaní. Pomoc s výnosom, naložením a dohodnutým postupom.",
    h1: "Odvoz nábytku bez zbytočného prenášania",
    body: [
      ["Keď starý nábytok nemá zostať v byte", "Po sťahovaní často zostanú skrine, matrace, stoly alebo poškodené kusy. Dohodneme rozsah, prístup a čas, aby sa priestor dal rýchlo vyčistiť."],
      ["Výnos a naloženie", "Pri ťažších kusoch riešime poschodie, výťah a dĺžku nosenia. Ak treba nábytok rozobrať, povedzte to vopred, aby posádka prišla pripravená."],
      ["Spojenie so sťahovaním", "Odvoz nábytku sa dá spojiť s presunom domácnosti alebo vypratávaním pivnice, garáže či kancelárie."],
    ],
  },
  "/vypratavanie.html": {
    title: "Vypratávanie bytov, domov, pivníc a firiem",
    description: "Vypratávanie priestorov s odvozom nepotrebných vecí, nábytku a vybavenia. Rozsah nastavíme podľa miesta a prístupu.",
    h1: "Vypratávanie priestorov s plánom",
    body: [
      ["Vypratávanie potrebuje iný postup než sťahovanie", "Pri vypratávaní sa najskôr určí, čo zostáva, čo sa odváža a čo potrebuje opatrnú manipuláciu. Vďaka tomu sa nemiešajú veci na ponechanie s odvozom."],
      ["Byty, domy aj prevádzky", "Pomáhame pri pivniciach, garážach, starších bytoch, skladoch a kanceláriách. Rozsah môže byť pár kusov alebo celý priestor."],
      ["Čo pomôže pred príchodom", "Najlepšie je označiť veci, ktoré sa nemajú odvážať, a poslať fotky väčších kusov. Podľa toho pripravíme ľudí, auto aj čas."],
    ],
  },
};

function buildServiceHtml(config) {
  return config.body.map(([heading, text]) => section(heading, [paragraph(text, {})], {})).join("") + section("Nezáväzný dopyt", [paragraph("Pošlite nám rozsah služby, adresu, poschodie a požadovaný termín. Ozveme sa s praktickým návrhom a orientačnou cenou.", {}), '<a href="/#kontakt">Kontaktovať tím</a>'], {});
}

const europeConfigs = {
  "/stahovanie-europa.html": ["Sťahovanie po Európe s trasou pripravenou vopred", "Medzinárodný presun potrebuje presnejší plán než lokálne sťahovanie. Riešime objem, krajinu, termín, nakládku, vykládku a to, či sa dá trasa spojiť s ďalšou zastávkou."],
  "/stahovanie-z-nemecka.html": ["Sťahovanie do a z Nemecka", "Pri trase Slovensko - Nemecko je dôležitá presná adresa, objem vecí a časové okno na vykládku. Podľa toho navrhneme auto, posádku a spôsob uloženia nákladu."],
  "/stahovanie-z-rakuska.html": ["Sťahovanie do a z Rakúska", "Rakúske trasy často vyžadujú rýchlu koordináciu termínu a prístupu v meste. Vopred riešime parkovanie, poschodie a všetky veci, ktoré potrebujú samostatnú ochranu."],
  "/stahovanie-z-talianska.html": ["Sťahovanie do a z Talianska", "Pri presune do Talianska alebo späť sa oplatí pripraviť zoznam väčších kusov a časový plán. Dlhšia cesta kladie väčší dôraz na bezpečné uloženie nákladu."],
  "/stahovanie-zo-svajciarska.html": ["Sťahovanie do a zo Švajčiarska", "Švajčiarske trasy plánujeme s dôrazom na čas, prístup a dokumenty potrebné pri dlhšom medzinárodnom presune. Cenu spresníme podľa objemu a oboch adries."],
};

function buildEuropeHtml(page, [heading, intro]) {
  const seed = hashString(page.path);
  return [
    section(heading, [paragraph(intro, {})], {}),
    section(pick(["Čo potrebujeme vedieť pred trasou", "Príprava medzinárodného presunu", "Podklady k cenovej ponuke"], seed), [
      list(pickMany([
        "presné adresy nakládky a vykládky vrátane poschodia",
        "zoznam väčších kusov, krabíc a citlivých predmetov",
        "termín, časové okno a možnosť parkovania pri vchode",
        "informáciu, či treba balenie, demontáž alebo skladanie",
        "počet zastávok a požiadavky na poradie vykládky",
        "fotky objemných vecí, ktoré môžu ovplyvniť manipuláciu",
      ], page.path, 5), {}),
    ], {}),
    section("Nezáväzná ponuka", [paragraph("Pošlite trasu a rozsah nákladu. Pripravíme orientačný odhad a odporúčanie, ako presun zorganizovať čo najplynulejšie.", {}), '<a href="/#kontakt">Získať ponuku</a>'], {}),
  ].join("");
}

const articleBodies = {
  "/blog-ako-sa-prestahovat-bez-stresu.html": {
    title: "Ako sa presťahovať pokojnejšie: praktický plán pred termínom",
    description: "Praktický plán sťahovania od prvého triedenia vecí po deň presunu. Menej chaosu, jasné krabice a lepšia komunikácia s tímom.",
    h1: "Ako zvládnuť sťahovanie pokojnejšie",
    bodyHtml: [
      section("Začnite zoznamom, nie krabicami", [paragraph("Najskôr si spíšte miestnosti, väčšie kusy a veci, ktoré si beriete osobne. Až potom má zmysel riešiť krabice. Zoznam pomôže odhadnúť auto, počet ľudí aj čas nakládky.", {})], {}),
      section("Krabice označujte podľa vykladania", [paragraph("Nestačí napísať iba kuchyňa alebo spálňa. Pomôže aj priorita: otvoriť hneď, odložiť do skladu, krehké, dokumenty alebo osobné veci.", {})], {}),
      section("Deň presunu si zjednodušte", [list(["uvoľnite chodbu a prístup k výťahu", "pripravte kľúče, parkovanie a kontakt na osobu na druhej adrese", "ťažké a krehké kusy odfoťte pred balením", "veci na prvú noc nechajte bokom"], {})], {}),
      section("Kedy volať sťahovaciu firmu", [paragraph("Čím viac schodov, nábytku alebo časového tlaku, tým viac sa oplatí riešiť profesionálnu pomoc. Dobrá príprava znižuje cenu aj stres.", {}), '<a href="/blog.html">Späť na blog</a>'], {}),
    ].join(""),
  },
  "/blog-vyber-stahovacej-firmy.html": {
    title: "Ako vybrať sťahovaciu firmu bez nepríjemných prekvapení",
    description: "Čo sa pýtať pred objednávkou sťahovania: cena, rozsah, poistenie, prístup, komunikácia a doplnkové služby.",
    h1: "Ako si vybrať sťahovaciu firmu",
    bodyHtml: [
      section("Dobrý dopyt ukáže viac než reklama", [paragraph("Seriózna firma sa pýta na adresy, poschodie, výťah, objem vecí a termín. Ak niekto sľúbi cenu bez otázok, často sa rozdiel objaví až v deň sťahovania.", {})], {}),
      section("Porovnávajte rovnaký rozsah", [paragraph("Jedna ponuka môže obsahovať dvoch pracovníkov, iná iba auto. Pýtajte sa, či je v cene nosenie, kilometre, čakanie, demontáž alebo ochranný materiál.", {})], {}),
      section("Signály spoľahlivosti", [list(["jasná komunikácia pred termínom", "ochota vysvetliť, čo cenu mení", "realistický časový odhad", "skúsenosť s ťažkými a krehkými kusmi", "možnosť doplnkových služieb podľa potreby"], {})], {}),
      section("Najnižšia cena nemusí byť najlacnejšia", [paragraph("Ak sa presun natiahne pre slabú prípravu alebo chýbajúcu posádku, lacný odhad sa rýchlo zmení. Lepšia je ponuka, ktorá počíta s realitou na adrese.", {}), '<a href="/blog.html">Späť na blog</a>'], {}),
    ].join(""),
  },
  "/blog-zbavte-sa-zbytocnosti.html": {
    title: "Triedenie pred sťahovaním: čo nebrať do nového bývania",
    description: "Ako pred sťahovaním znížiť objem vecí, ušetriť čas a pripraviť domácnosť na rýchlejší presun.",
    h1: "Zbavte sa zbytočností pred sťahovaním",
    bodyHtml: [
      section("Každá neodnesená krabica šetrí čas", [paragraph("Pred sťahovaním má zmysel prejsť veci podľa miestností. Čo sa nepoužívalo roky, často iba zvyšuje cenu a zaberá miesto v novom byte.", {})], {}),
      section("Triedenie podľa rozhodnutia", [list(["vezmem so sebou", "darujem alebo predám", "odveziem ako nepotrebné", "nechám dočasne v sklade", "prejdem ešte raz pred termínom"], {})], {}),
      section("Pozor na pivnice a garáže", [paragraph("Najviac zabudnutého objemu býva mimo obytných miestností. Pneumatiky, staré police, náradie alebo sezónne veci môžu pridať ďalšiu jazdu, ak sa neriešia vopred.", {})], {}),
      section("Spojte triedenie s odvozom", [paragraph("Ak už viete, čo nechcete brať, dá sa odvoz nepotrebných vecí naplánovať spolu so sťahovaním alebo ako samostatná služba.", {}), '<a href="/blog.html">Späť na blog</a>'], {}),
    ].join(""),
  },
};

function updatePage(page) {
  const city = cityForPage(page);

  if (page.kind === "home") {
    return {
      ...page,
      title: "Sťahovanie 24/7 | Sťahovanie, vypratávanie a preprava",
      description: "Sťahovanie domácností, firiem, nábytku a vecí s jasným postupom, férovou cenou a možnosťou vypratávania alebo autodopravy.",
      h1: "Sťahovanie 24/7 pre byty, domy a firmy",
      summary: "Pomôžeme s presunom domácnosti, kancelárie, nábytku aj nepotrebných vecí. Najskôr si ujasníme rozsah a až potom navrhneme cenu a termín.",
      bodyHtml: section("Prečo riešiť presun so Sťahovanie 24/7", [paragraph("Nový web pracuje s vlastným obsahom a praktickým opisom služieb. Každý dopyt riešime podľa adries, objemu, prístupu a požadovaného termínu.", {})], {}),
      city: "",
    };
  }

  if (page.kind === "city") {
    return {
      ...page,
      title: `Sťahovanie ${city} | Lokálne sťahovacie služby`,
      description: `Sťahovanie ${city} pre byty, domy a firmy. Pripravíme plán podľa objemu vecí, prístupu, poschodia, trasy a doplnkových služieb.`,
      h1: `Sťahovanie ${city} s jasným plánom`,
      summary: `Lokálne sťahovanie ${city} riešime podľa reálneho rozsahu: výnos, ochrana nábytku, prevoz, vyloženie aj prípadné vypratávanie.`,
      keywords: `sťahovanie ${city}, sťahovacie služby ${city}, vypratávanie ${city}, odvoz nábytku ${city}, cenník sťahovania ${city}`,
      bodyHtml: buildCityHtml(page, city),
      city,
    };
  }

  if (page.kind === "price") {
    return {
      ...page,
      title: city ? `Cenník sťahovania ${city} | Orientačná cena a postup` : "Cenník sťahovania | Orientačná cena a postup",
      description: city
        ? `Cena sťahovania ${city} podľa objemu vecí, poschodia, výťahu, vzdialenosti a doplnkových služieb. Pošlite rozsah a pripravíme ponuku.`
        : "Orientačný cenník sťahovania podľa typu priestoru, objemu vecí, výťahu, poschodia, vzdialenosti a doplnkových služieb.",
      h1: city ? `Cenník sťahovania ${city}` : "Cenník sťahovania",
      summary: city ? `Pre ${city} pripravíme cenu podľa reálneho rozsahu, nie podľa univerzálnej šablóny.` : "Cenu skladáme podľa rozsahu, prístupu, trasy a služieb, ktoré zákazka skutočne potrebuje.",
      keywords: city ? `cenník sťahovania ${city}, cena sťahovania ${city}, sťahovanie ${city}` : "cenník sťahovania, cena sťahovania, orientačný výpočet sťahovania",
      bodyHtml: buildPriceHtml(page, city),
      city,
    };
  }

  if (page.kind === "service" && serviceConfigs[page.path]) {
    const config = serviceConfigs[page.path];
    return {
      ...page,
      title: config.title,
      description: config.description,
      h1: config.h1,
      summary: config.description,
      bodyHtml: buildServiceHtml(config),
      city: "",
    };
  }

  if (page.kind === "europe" && europeConfigs[page.path]) {
    const [title, description] = europeConfigs[page.path];
    return {
      ...page,
      title: `${title} | Sťahovanie 24/7`,
      description,
      h1: title,
      summary: description,
      bodyHtml: buildEuropeHtml(page, europeConfigs[page.path]),
      city: "",
    };
  }

  if (page.kind === "article" && articleBodies[page.path]) {
    return {
      ...page,
      ...articleBodies[page.path],
      summary: articleBodies[page.path].description,
      keywords: "",
      city: "",
    };
  }

  if (page.kind === "blog") {
    return {
      ...page,
      title: "Blog o sťahovaní | Praktické rady Sťahovanie 24/7",
      description: "Praktické články k baleniu, výberu sťahovacej firmy, triedeniu vecí a príprave domácnosti pred presunom.",
      h1: "Rady k sťahovaniu bez zbytočného chaosu",
      summary: "Prečítajte si praktické rady k sťahovaniu, baleniu, triedeniu vecí a plánovaniu termínu.",
      bodyHtml: section("Praktické návody pred sťahovaním", [paragraph("Blog dopĺňame o rady, ktoré pomáhajú znížiť objem vecí, pripraviť krabice, vybrať vhodnú pomoc a nastaviť realistický termín.", {})], {}),
      city: "",
    };
  }

  return page;
}

const updatedPages = pages.map(updatePage);
const articleByPath = new Map(updatedPages.filter((page) => page.kind === "article").map((page) => [page.path, page]));
const updatedBlogArticleLinks = blogArticleLinks.map((link) => {
  const article = articleByPath.get(link.href);
  return article
    ? {
        ...link,
        title: article.h1,
        description: article.summary,
      }
    : link;
});

const generatedAt = new Date().toISOString();
const pagesSource = `import type { SitePage } from "@/types/site";

// Rewritten by scripts/rewrite-content-for-uniqueness.mjs for Sťahovanie 24/7.
export const scrapeGeneratedAt = ${JSON.stringify(generatedAt)};
export const scrapedPages = ${JSON.stringify(updatedPages, null, 2)} satisfies SitePage[];
`;

const updatedNavSource = navSource
  .replace(/^\/\/ Generated by scripts\/scrape-site\.mjs from .+$/m, "// Navigation links kept from the crawl; article summaries rewritten for Sťahovanie 24/7.")
  .replace(
    /export const blogArticleLinks = [\s\S]*? as const;/,
    `export const blogArticleLinks = ${JSON.stringify(updatedBlogArticleLinks, null, 2)} as const;`,
  );

await writeFile(PAGES_FILE, pagesSource);
await writeFile(NAV_FILE, updatedNavSource);

const changedKinds = updatedPages.reduce((counts, page) => {
  counts[page.kind] = (counts[page.kind] || 0) + 1;
  return counts;
}, {});

console.log(`Rewrote ${updatedPages.length} pages.`);
console.log(JSON.stringify(changedKinds, null, 2));
