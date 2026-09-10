import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "FGDLL | Que nadie sufra solo",
  description: "Encuentra grupos, centros, actividades y orientación de la Fraternidad Guerreros de la Luz.",
  other: { "google-adsense-account": "ca-pub-7617681116082759" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}<Script id="google-adsense" async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7617681116082759" crossOrigin="anonymous" strategy="afterInteractive" /></body></html>;
}
