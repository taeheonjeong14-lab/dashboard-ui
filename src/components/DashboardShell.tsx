"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppNav from "@/components/AppNav";

type Props = {
  children: React.ReactNode;
};

export default function DashboardShell({ children }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (!active) return;
        if (!user) {
          router.replace("/login");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (active) router.replace("/login");
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-950">
        <main className="flex flex-1 items-center justify-center px-4">
          <p className="text-sm text-zinc-400">세션 확인 중…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <AppNav />
      {children}
    </div>
  );
}
