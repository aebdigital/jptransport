"use client";

import { useEffect, useState } from "react";
import { Cookie, Settings, X } from "lucide-react";

type CookiePreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = "stahovanie24_cookie_preferences";

const defaultPreferences: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

function loadPreferences() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? ({ ...defaultPreferences, ...JSON.parse(raw), necessary: true } as CookiePreferences) : null;
  } catch {
    return null;
  }
}

function savePreferences(preferences: CookiePreferences) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...preferences,
      necessary: true,
      savedAt: new Date().toISOString(),
    }),
  );
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);

  useEffect(() => {
    const stored = loadPreferences();
    if (stored) {
      setPreferences(stored);
      return;
    }

    setOpen(true);
  }, []);

  useEffect(() => {
    function handleOpenSettings() {
      setPreferences(loadPreferences() || defaultPreferences);
      setSettingsOpen(true);
      setOpen(true);
    }

    window.addEventListener("stahovanie24:open-cookie-settings", handleOpenSettings);
    return () => window.removeEventListener("stahovanie24:open-cookie-settings", handleOpenSettings);
  }, []);

  function acceptAll() {
    const next: CookiePreferences = { necessary: true, analytics: true, marketing: true };
    savePreferences(next);
    setPreferences(next);
    setOpen(false);
    setSettingsOpen(false);
  }

  function rejectOptional() {
    savePreferences(defaultPreferences);
    setPreferences(defaultPreferences);
    setOpen(false);
    setSettingsOpen(false);
  }

  function saveSelected() {
    const next: CookiePreferences = { ...preferences, necessary: true };
    savePreferences(next);
    setPreferences(next);
    setOpen(false);
    setSettingsOpen(false);
  }

  function togglePreference(key: "analytics" | "marketing") {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-lg border border-teal-100 bg-white p-5 text-black shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <Cookie size={21} />
            </span>
            <div>
              <h2 className="text-lg font-black">Nastavenia cookies</h2>
              <p className="mt-2 text-sm leading-6 text-black">
                Používame nevyhnutné cookies pre fungovanie webu. Voliteľné analytické a marketingové cookies zapneme iba po vašom súhlase.
              </p>
            </div>
          </div>

          <button type="button" onClick={rejectOptional} className="rounded-md p-2 text-black transition hover:bg-zinc-100" aria-label="Zavrieť cookies panel">
            <X size={20} />
          </button>
        </div>

        {settingsOpen ? (
          <div className="mt-5 grid gap-3">
            <label className="flex items-start justify-between gap-4 rounded-md border border-teal-100 bg-teal-50 px-4 py-3">
              <span>
                <span className="block text-sm font-black">Nevyhnutné cookies</span>
                <span className="mt-1 block text-sm leading-5 text-black">Zabezpečujú základné fungovanie webu a formulárov.</span>
              </span>
              <input type="checkbox" checked disabled className="mt-1 h-5 w-5 accent-teal-600" />
            </label>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-zinc-200 px-4 py-3">
              <span>
                <span className="block text-sm font-black">Analytické cookies</span>
                <span className="mt-1 block text-sm leading-5 text-black">Pomáhajú merať návštevnosť a zlepšovať obsah webu.</span>
              </span>
              <input type="checkbox" checked={preferences.analytics} onChange={() => togglePreference("analytics")} className="mt-1 h-5 w-5 accent-teal-600" />
            </label>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-zinc-200 px-4 py-3">
              <span>
                <span className="block text-sm font-black">Marketingové cookies</span>
                <span className="mt-1 block text-sm leading-5 text-black">Môžu slúžiť na meranie kampaní alebo remarketing.</span>
              </span>
              <input type="checkbox" checked={preferences.marketing} onChange={() => togglePreference("marketing")} className="mt-1 h-5 w-5 accent-teal-600" />
            </label>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setSettingsOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-md border border-teal-200 px-4 py-3 text-sm font-black text-black transition hover:bg-teal-50">
            <Settings size={17} />
            Nastavenia
          </button>
          <button type="button" onClick={rejectOptional} className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-black text-black transition hover:bg-zinc-50">
            Odmietnuť voliteľné
          </button>
          {settingsOpen ? (
            <button type="button" onClick={saveSelected} className="rounded-md bg-teal-600 px-4 py-3 text-sm font-black text-white transition hover:bg-teal-700">
              Uložiť výber
            </button>
          ) : null}
          <button type="button" onClick={acceptAll} className="rounded-md bg-yellow-400 px-4 py-3 text-sm font-black text-black transition hover:bg-yellow-300">
            Prijať všetko
          </button>
        </div>
      </div>
    </div>
  );
}
