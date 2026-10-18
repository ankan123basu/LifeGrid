import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Noto_Sans_Devanagari, Noto_Sans_Gurmukhi } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// JetBrains Mono — ONLY for code, IDs, technical values
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

// Noto Sans Devanagari (Hindi) for language switcher and localized typography
const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Noto Sans Gurmukhi (Punjabi) for language switcher and localized typography
const notoSansGurmukhi = Noto_Sans_Gurmukhi({
  variable: "--font-noto-gurmukhi",
  subsets: ["gurmukhi"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

import AskLifeGridChat from "@/components/AskLifeGridChat";

export const metadata: Metadata = {
  title: "LifeGrid | Real-Time Blood & Emergency Network",
  description: "Connect instantly with verified hospital blood banks and voluntary lifesavers in real time across India.",
  keywords: ["Blood Bank", "Emergency Response", "LifeGrid", "Blood Donation", "Hospital Blood Stock"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Apply all font variables to <html> so portals (modals attached to <body>) also inherit them
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} ${notoSansDevanagari.variable} ${notoSansGurmukhi.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F8FAFC] text-slate-900 selection:bg-rose-500 selection:text-white">
        {children}
        <AskLifeGridChat />
      </body>
    </html>
  );
}
