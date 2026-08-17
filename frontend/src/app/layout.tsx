import type { Metadata } from "next";
import { Outfit, Work_Sans, IBM_Plex_Mono } from "next/font/google";
import ExperienceLayer from "@/components/experience/ExperienceLayer";
import GlobalPreloader from "@/components/experience/GlobalPreloader";
import SiteFooter from "@/components/layout/SiteFooter";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-quantura-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-quantura-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-quantura-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quantura | Deterministic Data Intelligence & Quantitative Analytics",
  description: "High-precision automated data analytics, deterministic Python/Pandas compute engine, anomaly detection, and natural language SQL workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="theme-1"
      className={`${outfit.variable} ${ibmPlexMono.variable} ${workSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('datalens-user-theme');if(['theme-1','theme-2','theme-3','theme-4'].includes(t)){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased selection:bg-[var(--accent)] selection:text-white overflow-x-hidden">
        <GlobalPreloader />
        <ExperienceLayer />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
