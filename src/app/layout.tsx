import "@puckoops/camelot/styles.css";
import "./globals.css";
import { themeScript } from "@puckoops/camelot/helpers";
import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { InlineScript } from "@/components/InlineScript";
import { Providers } from "./providers";

const sans = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--pk-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--pk-serif", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--pk-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Orbit", template: "%s · Orbit" },
  description: "Keep clients, projects, work, money and files in a single tracker.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" data-theme="light" className={`${sans.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
