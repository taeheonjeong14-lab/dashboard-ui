"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/hospital", label: "병원 실적" },
  { href: "/blog", label: "네이버 블로그 실적" },
  { href: "/place", label: "네이버 플레이스 실적" },
  { href: "/ads", label: "네이버 광고 실적" },
] as const;

export default function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-zinc-100 transition hover:text-white"
        >
          대시보드
        </Link>
        <nav className="flex flex-1 flex-wrap items-center justify-end gap-1 sm:gap-2">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-2.5 py-1.5 text-sm transition sm:px-3 ${
                  active
                    ? "bg-zinc-800 text-zinc-50"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/logout"
            className="ml-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800 sm:px-3"
          >
            로그아웃
          </Link>
        </nav>
      </div>
    </header>
  );
}
