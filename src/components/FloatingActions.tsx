export function FloatingActions() {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
      <a
        href="https://wa.me/421944404495"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Napísať cez WhatsApp"
        className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-500 text-white shadow-lg transition hover:bg-teal-600"
      >
        <img src="/icons/whatsapp.svg" alt="" width={20} height={20} className="h-5 w-5 invert" />
      </a>
      <a
        href="https://m.me/autodopravapuchov"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Napísať cez Messenger"
        className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-700 text-white shadow-lg transition hover:bg-teal-800"
      >
        <img src="/icons/messenger.svg" alt="" width={20} height={20} className="h-5 w-5 invert" />
      </a>
      <a
        href="https://www.instagram.com/jp_transport_stahovanie/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Otvoriť Instagram"
        className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-600 text-white shadow-lg transition hover:bg-teal-700"
      >
        <img src="/icons/instagram.svg" alt="" width={20} height={20} className="h-5 w-5 invert" />
      </a>
    </div>
  );
}
