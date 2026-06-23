import type { Metadata } from "next";
import { Fraunces, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/layout/Navbar";
import CompareBar from "@/components/college/CompareBar";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "CollegeFinder — Find Your Perfect College",
  description: "Search, compare, and discover the best colleges in India",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${manrope.variable} ${jbMono.variable} bg-paper text-charcoal min-h-screen antialiased`}>
        <Providers>
          <Navbar />
          <main>{children}</main>
          <CompareBar />
        </Providers>
      </body>
    </html>
  );
}
