import type { Metadata } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";

import { Header } from "@/components/header";
import { Providers } from "@/components/providers";

import "./globals.css";
import "./wallet-adapter.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Squad²",
  description: "Multisig wallet for Solana and SVM chains",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${dmMono.variable} min-h-screen antialiased`}
      >
        <Providers>
          <Header />
          <main className="min-h-[calc(100svh-4.5rem)] w-full px-4 py-4 sm:px-5 md:px-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
