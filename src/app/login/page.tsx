"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signInWithPassword } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (!cancelled && user) router.replace("/");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithPassword(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 bg-zinc-950">
      <form
        onSubmit={onSubmit}
        className="w-full border border-zinc-800 bg-zinc-900/90 p-6 shadow-xl shadow-black/40"
      >
        <h1 className="text-xl font-semibold text-zinc-50">로그인</h1>
        <p className="mt-1 text-sm text-zinc-400">병원별 대시보드 데이터를 확인하려면 로그인하세요.</p>

        <div className="mt-4 space-y-3">
          <label className="block text-sm text-zinc-300">
            이메일
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 border border-red-900/50 bg-red-950/50 p-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
