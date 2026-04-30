"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BlogMetricSection from "@/components/blog/BlogMetricSection";
import BlogRanksSection from "@/components/blog/BlogRanksSection";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchBlogPeriodKpis,
  fetchHospitalScope,
  fetchSummaryBlogRanks,
  type BlogPeriodDayRow,
  type BlogRankSummaryRow,
} from "@/lib/queries";

export default function BlogPerformancePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [rows, setRows] = useState<BlogPeriodDayRow[]>([]);
  const [blogRanks, setBlogRanks] = useState<BlogRankSummaryRow[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!active) return;
        if (!user) {
          router.replace("/login");
          return;
        }

        const scope = await fetchHospitalScope(user);
        if (!active) return;
        const hospitalId = scope.assignedHospitalId;
        if (!hospitalId) {
          setError("users.hospital_id 배정이 없어 블로그 통계를 불러올 수 없습니다.");
          setHospitalId(null);
          setReady(true);
          return;
        }
        setHospitalId(hospitalId);

        const [kpiRows, rankRows] = await Promise.all([
          fetchBlogPeriodKpis(hospitalId),
          fetchSummaryBlogRanks(hospitalId),
        ]);
        if (!active) return;
        setRows(kpiRows);
        setBlogRanks(rankRows);
        setError(null);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.");
      } finally {
        if (!active) return;
        setLoading(false);
        setReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-sm text-zinc-400">데이터 준비 중…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full max-w-none px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">네이버 블로그 통계</h1>
          <p className="mt-1 text-sm text-zinc-400">
            블로그 조회수·순방문자수 추이와 주요 키워드 노출 순위를 확인합니다.
          </p>
        </div>
      </header>

      {loading && <p className="mt-3 text-sm text-zinc-500">불러오는 중…</p>}

      <div className="border-t border-zinc-800">
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <BlogRanksSection
              rows={blogRanks}
              hospitalId={hospitalId}
              loading={loading}
              headingId="blog-ranks"
            />
          </div>
          <div className="flex flex-col divide-y divide-zinc-800 lg:col-span-2 lg:border-l lg:border-zinc-800">
            <BlogMetricSection
              title="블로그 조회수"
              description="기간 내 일/월/연 단위 블로그 조회수 추이입니다."
              rows={rows}
              metric="views"
              valueSuffix="회"
            />
            <BlogMetricSection
              title="블로그 순방문자수"
              description="기간 내 일/월/연 단위 블로그 순방문자수 추이입니다."
              rows={rows}
              metric="uniqueVisitors"
              valueSuffix="명"
              footnote="월·연 값은 일일 고유 방문자의 합으로 계산됩니다."
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 border border-red-900/50 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </main>
  );
}
