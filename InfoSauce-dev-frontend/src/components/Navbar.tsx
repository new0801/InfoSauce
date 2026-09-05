"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const linkClass = (path: string) =>
    `text-sm transition-colors ${pathname === path ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <nav className="liquid-glass relative z-10 mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-7xl items-center justify-between rounded-full px-8 py-5">
      <Link href="/" className="text-3xl tracking-tight text-foreground">
        <span style={{ fontFamily: "'Instrument Serif', serif" }}>InfoSauce</span><sup className="ml-0.5 text-xs">®</sup>
      </Link>
      <div className="hidden items-center gap-8 md:flex">
        <Link href="/" className={linkClass("/")}>Home</Link>
        <Link href="/daily" className={linkClass("/daily")}>Daily Sauce</Link>
        <Link href="/trending" className={linkClass("/trending")}>Trending</Link>
        <Link href="/verify" className={linkClass("/verify")}>Sauce Verify</Link>
      </div>
    </nav>
  );
}
