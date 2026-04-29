"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BlogViewsChart from "@/components/BlogViewsChart";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchBlogViews,
  fetchHospitalScope,
  type BlogViewPoint,
  type HospitalOption,
  type RangeDays,
} from "@/lib/queries";

function formatNumber(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

export default function BlogPerformancePage() {
  const router = useRouter();
  const [scopeReady, setScopeReady] = useState(false);
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [hospitalId, setHospitalId] = useState<string | "all">("all");
  const [points, setPoints] = useState<BlogViewPoint[]>([]);
  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      let user;
      try {
        user = await getCurrentUser();
      } catch {
        if (active) router.replace("/login");
        return;
      }
      if (!user) {
        if (active) router.replace("/login");
        return;
      }
      try {
        const scope = await fetchHospitalScope(user);
        if (!active) return;
        setIsAdmin(scope.isAdmin);
        setHospitals(scope.hospitals);
        if (scope.isAdmin) {
          setHospitalId("all");
        } else if (scope.hospitals.length > 0) {
          setHospitalId(scope.hospitals[0].hospital_id);
        }
        setIsReady(true);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "초기 데이터를 불러오지 못했습니다.");
        setIsReady(true);
      } finally {
        if (active) setScopeReady(true);
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!isReady) return;
    let active = true;
    fetchBlogViews(rangeDays, hospitalId)
      .then((rows) => {
        if (!active) return;
        setPoints(rows);
        setError(null);
      })
      .catch((e) => {
        if (!active) return;
        setError(e.message || "데이터를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isReady, rangeDays, hospitalId]);

  const latest = useMemo(() => {
    if (points.length === 0) return null;
    return points[points.length - 1].blog_views;
  }, [points]);

  const avg = useMemo(() => {
    if (points.length === 0) return null;
    const valid = points
      .map((p) => p.blog_views)
      .filter((v): v is number => typeof v === "number");
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
  }, [points]);

  if (!scopeReady) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-sm text-zinc-400">데이터 준비 중…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full max-w-none px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">네이버 블로그 실적</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Supabase analytics 데이터 기준 블로그 조회수 추이입니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/keywords"
            className="bg-zinc-800 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-700"
          >
            순위 키워드 관리
          </Link>
        </div>
      </header>

      <div className="mt-3 flex flex-col divide-y divide-zinc-800 border border-zinc-800 bg-zinc-800">
        <section className="bg-zinc-950 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="border border-zinc-800 bg-zinc-900/80 p-3 text-sm">
              <span className="mb-2 block text-zinc-400">병원</span>
              <select
                value={hospitalId}
                onChange={(e) => {
                  setLoading(true);
                  setHospitalId(e.target.value);
                }}
                className="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {isAdmin && <option value="all">전체 병원</option>}
                {hospitals.map((hospital) => (
                  <option key={hospital.hospital_id} value={hospital.hospital_id}>
                    {hospital.hospital_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="border border-zinc-800 bg-zinc-900/80 p-3 text-sm">
              <span className="mb-2 block text-zinc-400">기간</span>
              <select
                value={rangeDays}
                onChange={(e) => {
                  setLoading(true);
                  setRangeDays(Number(e.target.value) as RangeDays);
                }}
                className="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value={7}>최근 7일</option>
                <option value={30}>최근 30일</option>
                <option value={90}>최근 90일</option>
              </select>
            </label>
          </div>
        </section>

        <section className="bg-zinc-950 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <article className="border border-zinc-800 bg-zinc-900/80 p-4">
              <p className="text-sm text-zinc-400">최신 조회수</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-50">{formatNumber(latest)}</p>
            </article>
            <article className="border border-zinc-800 bg-zinc-900/80 p-4">
              <p className="text-sm text-zinc-400">기간 평균 조회수</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-50">{formatNumber(avg)}</p>
            </article>
          </div>
        </section>

        <section className="bg-zinc-950 p-4 sm:p-5">
          {loading && <p className="text-sm text-zinc-400">데이터를 불러오는 중...</p>}
          {error && (
            <p className="border border-red-900/50 bg-red-950/40 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
          {!loading && !error && points.length === 0 && (
            <p className="border border-amber-900/40 bg-amber-950/30 p-3 text-sm text-amber-200">
              선택한 조건에 해당하는 조회수 데이터가 없습니다.
            </p>
          )}
          {!loading && !error && points.length > 0 && <BlogViewsChart data={points} />}
        </section>
      </div>
    </main>
  );
}
