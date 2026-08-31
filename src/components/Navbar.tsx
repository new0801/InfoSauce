"use client";

import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const linkClass = (path: string) => `text-sm transition-colors ${pathname === path ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <nav className="liquid-glass relative z-10 mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-7xl items-center justify-between rounded-full px-8 py-5">
      <a
        href="/"
        className="text-3xl tracking-tight text-foreground"
      >
        <span style={{ fontFamily: "'Instrument Serif', serif" }}>InfoSauce</span><sup className="ml-0.5 text-xs">®</sup>
      </a>

      <div className="hidden items-center gap-8 md:flex">
        <a
          href="/"
          className={linkClass("/")}
        >
          Home
        </a>

        <a
          href="/daily"
          className={linkClass("/daily")}
        >
          Daily Sauce
        </a>

        <a
          href="/verify"
          className={linkClass("/verify")}
        >
          Sauce Verify
        </a>
      </div>
    </nav>
  );
}
