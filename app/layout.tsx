import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FGDLL | Que nadie sufra solo",
  description: "Encuentra grupos, centros, actividades y orientación de la Fraternidad Guerreros de la Luz.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={manrope.variable}>{children}</body></html>;
}
