"use client";

import { Calculator, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";

const movingTypes = [
  { label: "Byt", value: 120 },
  { label: "Dom", value: 180 },
  { label: "Firma", value: 250 },
] as const;

const distances = [
  { label: "V rámci mesta", value: 0 },
  { label: "Do 50 km", value: 60 },
  { label: "Nad 100 km", value: 120 },
] as const;

const addons = [
  { id: "balenie", label: "Balenie a ochranný materiál", value: 50 },
  { id: "vypratavanie", label: "Vypratávanie starých vecí", value: 60 },
  { id: "odvoz", label: "Odvoz starého nábytku", value: 70 },
] as const;

export function PriceCalculator() {
  const [movingType, setMovingType] = useState(120);
  const [distance, setDistance] = useState(0);
  const [floors, setFloors] = useState(0);
  const [hasElevator, setHasElevator] = useState(true);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const price = useMemo(() => {
    const addonPrice = addons.filter((addon) => selectedAddons.includes(addon.id)).reduce((sum, addon) => sum + addon.value, 0);
    const stairs = hasElevator ? 0 : Math.max(0, floors) * 15;
    return movingType + distance + addonPrice + stairs;
  }, [distance, floors, hasElevator, movingType, selectedAddons]);

  function toggleAddon(id: string) {
    setSelectedAddons((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <section className="bg-teal-50 px-4 py-14">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-6">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-black uppercase text-yellow-600">
            <Calculator size={18} />
            Orientačný výpočet
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-normal text-black sm:text-4xl">Vypočítajte si cenu sťahovania</h2>
          <p className="mt-4 text-base leading-7 text-black">
            Kalkulačka vychádza zo zdrojového cenníka. Výsledok je orientačný, finálnu ponuku potvrdíme podľa objemu, prístupu a termínu.
          </p>

          <div className="mt-6 rounded-lg border border-teal-100 bg-white p-5 text-black shadow-sm">
            <p className="text-sm text-black">Orientačná cena od</p>
            <p className="mt-2 text-5xl font-black text-teal-700">{price} €</p>
            <a href="/#kontakt" className="mt-5 inline-flex rounded-md bg-yellow-400 px-4 py-3 text-sm font-black text-black transition hover:bg-yellow-300">
              Chcem nezáväznú ponuku
            </a>
          </div>
        </div>

        <div className="grid gap-4 rounded-lg border border-teal-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-black">
              Typ sťahovania
              <select value={movingType} onChange={(event) => setMovingType(Number(event.target.value))} className="rounded-md border border-teal-200 px-3 py-3 font-normal outline-none ring-teal-300 focus:ring-2">
                {movingTypes.map((item) => (
                  <option key={item.label} value={item.value}>
                    {item.label} od {item.value} €
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold text-black">
              Vzdialenosť
              <select value={distance} onChange={(event) => setDistance(Number(event.target.value))} className="rounded-md border border-teal-200 px-3 py-3 font-normal outline-none ring-teal-300 focus:ring-2">
                {distances.map((item) => (
                  <option key={item.label} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-black">
              Poschodia bez výťahu
              <input
                type="number"
                min={0}
                value={floors}
                onChange={(event) => setFloors(Number(event.target.value))}
                className="rounded-md border border-teal-200 px-3 py-3 font-normal outline-none ring-teal-300 focus:ring-2"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-black">
              Výťah
              <select value={hasElevator ? "yes" : "no"} onChange={(event) => setHasElevator(event.target.value === "yes")} className="rounded-md border border-teal-200 px-3 py-3 font-normal outline-none ring-teal-300 focus:ring-2">
                <option value="yes">Áno</option>
                <option value="no">Nie</option>
              </select>
            </label>
          </div>

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-bold text-black">Doplnkové služby</legend>
            {addons.map((addon) => {
              const checked = selectedAddons.includes(addon.id);

              return (
                <label key={addon.id} className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-teal-100 px-3 py-3 transition hover:border-yellow-300">
                  <span className="flex items-center gap-3 text-sm font-semibold text-black">
                    <input type="checkbox" checked={checked} onChange={() => toggleAddon(addon.id)} className="h-5 w-5 accent-teal-600" />
                    {addon.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-black text-teal-700">
                    {checked ? <CheckCircle2 size={16} /> : null}+{addon.value} €
                  </span>
                </label>
              );
            })}
          </fieldset>
        </div>
      </div>
    </section>
  );
}
