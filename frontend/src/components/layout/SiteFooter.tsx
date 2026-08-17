"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, Code2, Globe2 } from "lucide-react";
import QuanturaLogo from "@/components/brand/QuanturaLogo";

const personalLinks = [
  {
    label: "GitHub",
    href: "https://github.com/abdxllxh",
    icon: Code2,
  },
  {
    label: "Portfolio",
    href: "https://abdullahdev.work/",
    icon: Globe2,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/mohammad-abdullah-25ba1721b",
    icon: BriefcaseBusiness,
  },
] as const;

export default function SiteFooter() {
  const pathname = usePathname();

  if (pathname.startsWith("/workspace")) return null;

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="inline-flex items-center gap-3 self-start rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]" aria-label="Quantura home">
            <QuanturaLogo className="quantura-logo-motion h-11 w-11" />
            <span>
              <span className="quantura-wordmark block text-base text-[var(--text-primary)]">Quantura</span>
              <span className="block text-xs">Deterministic data intelligence</span>
            </span>
          </Link>

          <nav aria-label="Creator links" className="flex flex-wrap gap-2">
            {personalLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                aria-label={`Open Mohammad Abdullah's ${label} in a new tab`}
              >
                <Icon className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>Built by Mohammad Abdullah.</p>
          <p className="font-mono">Local compute · Verified results · Reproducible analysis</p>
        </div>
      </div>
    </footer>
  );
}
