import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
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
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F4F1EA] text-[#0A0A0A]">
        {children}
        <AskLifeGridChat />
      </body>
    </html>
  );
}
