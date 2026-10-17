import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F8FAFC] text-slate-900 selection:bg-rose-500 selection:text-white">
        {children}
        <AskLifeGridChat />
      </body>
    </html>
  );
}
