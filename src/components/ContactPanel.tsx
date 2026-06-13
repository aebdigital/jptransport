"use client";

import { FormEvent, useState } from "react";
import { Mail, Phone, Send } from "lucide-react";

type FormState = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

export function ContactPanel() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("Sťahovanie bytu");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<FormState>({ type: "idle", message: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState({ type: "loading", message: "Odosielame správu..." });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, phone, service, message }),
      });

      const result = await response.json().catch(() => ({ message: "" }));

      if (!response.ok || !result.ok) {
        setFormState({ type: "error", message: result.message || "Správu sa nepodarilo odoslať." });
        return;
      }

      setName("");
      setEmail("");
      setPhone("");
      setService("Sťahovanie bytu");
      setMessage("");
      setFormState({ type: "success", message: result.message || "Ďakujeme, správa bola odoslaná." });
    } catch {
      setFormState({ type: "error", message: "Správu sa nepodarilo odoslať. Skúste prosím zavolať." });
    }
  }

  return (
    <section id="kontakt" className="bg-teal-50 px-4 py-16 text-black">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-6">
        <div>
          <p className="text-sm font-black uppercase text-teal-700">Kontakt</p>
          <h2 className="mt-3 text-3xl font-black tracking-normal sm:text-4xl">Nezáväzná cenová ponuka</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-black">
            Napíšte základné údaje k sťahovaniu a ozveme sa späť s praktickým postupom. Pri urgentnom termíne je najrýchlejšie zavolať priamo.
          </p>

          <div className="mt-8 grid gap-3 text-sm">
            <a href="tel:+421944404495" className="inline-flex items-center gap-3 rounded-lg bg-teal-600 px-4 py-3 font-black text-white transition hover:bg-teal-700">
              <Phone size={18} />
              +421 944 404 495
            </a>
            <a href="mailto:patrik.janicek358@gmail.com" className="inline-flex items-center gap-3 rounded-lg border border-teal-200 bg-white px-4 py-3 font-semibold text-black transition hover:bg-teal-100 hover:text-teal-700">
              <Mail size={18} />
              patrik.janicek358@gmail.com
            </a>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-teal-100 bg-white p-5 text-black shadow-sm sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Meno
              <input required value={name} onChange={(event) => setName(event.target.value)} className="rounded-md border border-teal-200 px-3 py-3 font-normal outline-none ring-teal-300 transition focus:ring-2" />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Email
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-md border border-teal-200 px-3 py-3 font-normal outline-none ring-teal-300 transition focus:ring-2" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Telefón
              <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="rounded-md border border-teal-200 px-3 py-3 font-normal outline-none ring-teal-300 transition focus:ring-2" />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Služba
              <select value={service} onChange={(event) => setService(event.target.value)} className="rounded-md border border-teal-200 px-3 py-3 font-normal outline-none ring-teal-300 transition focus:ring-2">
                <option>Sťahovanie bytu</option>
                <option>Sťahovanie domu</option>
                <option>Sťahovanie firmy</option>
                <option>Vypratávanie</option>
                <option>Odvoz nábytku</option>
                <option>Autodoprava</option>
                <option>Sťahovanie Európa</option>
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-sm font-bold">
            Poznámka
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              required
              className="resize-none rounded-md border border-teal-200 px-3 py-3 font-normal outline-none ring-teal-300 transition focus:ring-2"
              placeholder="Odkiaľ, kam, termín, poschodie, približný objem..."
            />
          </label>

          {formState.message ? (
            <div className={formState.type === "success" ? "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900" : "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900"}>
              {formState.message}
            </div>
          ) : null}

          <button type="submit" disabled={formState.type === "loading"} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-3 font-black text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70">
            <Send size={18} />
            {formState.type === "loading" ? "Odosielam..." : "Odoslať dopyt"}
          </button>
        </form>
      </div>
    </section>
  );
}
