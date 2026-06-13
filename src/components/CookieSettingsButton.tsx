"use client";

export function CookieSettingsButton() {
  function openSettings() {
    window.dispatchEvent(new Event("stahovanie24:open-cookie-settings"));
  }

  return (
    <button type="button" onClick={openSettings} className="font-semibold text-black underline-offset-4 transition hover:text-teal-700 hover:underline">
      Cookies
    </button>
  );
}
