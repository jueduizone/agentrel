import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { GoogleAnalytics } from "@next/third-parties/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgentRel — Web3 AI Context Infrastructure",
  description: "Skills platform for AI Agents to truly understand Web3. Fix AI hallucinations, stay updated with ecosystem changes, and get accurate Web3 context.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
      <GoogleAnalytics gaId="G-27VHL2GHVL" />
    </html>
  );
}
