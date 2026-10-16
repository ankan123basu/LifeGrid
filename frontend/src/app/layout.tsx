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

export const metadata: Metadata = {
  title: "LifeGrid | Intelligent Blood & Emergency Network (CSE494)",
  description: "Real-time AI-assisted blood inventory and emergency dispatch network powered by MongoDB and Groq AI.",
  keywords: ["Blood Bank", "Emergency Response", "MongoDB", "NoSQL", "Groq AI", "LifeGrid", "CSE494"],
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
      </body>
    </html>
  );
}
