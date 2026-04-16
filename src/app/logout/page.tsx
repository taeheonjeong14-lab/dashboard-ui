"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    signOut()
      .catch(() => {})
      .finally(() => {
        router.replace("/login");
      });
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-4">
      <p className="text-sm text-gray-600">로그아웃 처리 중...</p>
    </main>
  );
}
