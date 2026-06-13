import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CookieConsent } from "@/components/CookieConsent";
import { FloatingActions } from "@/components/FloatingActions";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://stahovanie-24.sk"),
  title: {
    default: "Sťahovanie 24/7 | Sťahovanie, preprava a vypratávanie",
    template: "%s",
  },
  description: "Profesionálne sťahovanie, vypratávanie a autodoprava po Slovensku aj v Európe.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="sk">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <FloatingActions />
        <CookieConsent />
      </body>
    </html>
  );
}
