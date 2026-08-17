import React from "react";

interface QuanturaLogoProps {
  className?: string;
  title?: string;
}

export default function QuanturaLogo({ className = "h-10 w-10", title }: QuanturaLogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <rect x="2.5" y="2.5" width="43" height="43" rx="13" fill="var(--bg-surface)" stroke="var(--border-strong)" />
      <path d="m24 9.5 13 7.1-13 7.2-13-7.2L24 9.5Z" fill="var(--accent-subtle)" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="m11 16.6 13 7.2v14.7l-13-7.2V16.6Z" fill="color-mix(in srgb, var(--accent) 14%, var(--bg-surface))" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="m37 16.6-13 7.2v14.7l13-7.2V16.6Z" fill="color-mix(in srgb, var(--secondary-accent) 14%, var(--bg-surface))" stroke="var(--secondary-accent)" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="m31.2 34.5 7.1 6.3" stroke="var(--secondary-accent)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="18.2" cy="28.1" r="1.55" fill="var(--accent)" />
      <circle cx="29.8" cy="27" r="1.55" fill="var(--secondary-accent)" />
      <circle cx="24" cy="15.6" r="1.35" fill="var(--text-primary)" />
    </svg>
  );
}
