"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SummaryDualWeekCompareChart from "@/components/SummaryDualWeekCompareChart";
import SummaryHeader from "@/components/SummaryHeader";
import BlogRanksSection from "@/components/blog/BlogRanksSection";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchHospitalScope,
  fetchSummaryBlogRanks,
  fetchSummaryKpis,
  fetchSummaryPlaceRanks,
  type BlogRankSummaryRow,
  type PlaceRankSummaryRow,
  type SummaryKpis,
} from "@/lib/queries";

const EMPTY_KPIS: SummaryKpis = {
  salesCurrentWeek: [],
  salesPreviousWeek: [],
  newCustomersCurrentWeek: [],
  newCustomersPreviousWeek: [],
  datePairs: [],
};

function formatRank(value: number | null) {
  if (value == null) return "-";
  return `${new Intl.NumberFormat("ko-KR").format(value)}위`;
}

export default function SummaryPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [kpis, setKpis] = useState<SummaryKpis>(EMPTY_KPIS);
  const [blogRanks, setBlogRanks] = useState<BlogRankSummaryRow[]>([]);
  const [placeRanks, setPlaceRanks] = useState<PlaceRankSummaryRow[]>([]);

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
          setError("users.hospital_id 배정이 없어 요약 데이터를 불러올 수 없습니다.");
          setHospitalId(null);
          setReady(true);
          return;
        }
        setHospitalId(hospitalId);

        const [kpiRows, blogRows, placeRows] = await Promise.all([
          fetchSummaryKpis(hospitalId),
          fetchSummaryBlogRanks(hospitalId),
          fetchSummaryPlaceRanks(hospitalId),
        ]);
        if (!active) return;
        setKpis(kpiRows);
        setBlogRanks(blogRows);
        setPlaceRanks(placeRows);
        setError(null);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "요약 데이터를 불러오지 못했습니다.");
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
    <main className="w-full max-w-none px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <SummaryHeader />

      <div className="mt-3 flex flex-col border-t border-zinc-800 divide-y divide-zinc-800">
        <div className="grid grid-cols-1 gap-px lg:grid-cols-2">
          <section
            aria-labelledby="summary-revenue"
            className="min-w-0 bg-zinc-950 p-4 sm:p-5"
          >
            <h2 id="summary-revenue" className="mb-1 text-base font-semibold text-zinc-100 sm:text-lg">
              병원 일별 매출
            </h2>
            <p className="mb-3 text-sm text-zinc-500">
              데이터가 있는 마지막 날짜를 끝점으로 최근 7일 일별 매출(파란색)과 직전 7일 일별
              매출(보라색)을 같은 슬롯에서
              비교합니다.
            </p>
            <SummaryDualWeekCompareChart
              ariaLabel="병원 일별 매출: 최근 7일 대 직전 7일"
              variant="currency"
              currentWeek={kpis.salesCurrentWeek}
              previousWeek={kpis.salesPreviousWeek}
              datePairs={kpis.datePairs}
            />
          </section>

          <section
            aria-labelledby="summary-patients"
            className="min-w-0 bg-zinc-950 p-4 sm:p-5"
          >
            <h2 id="summary-patients" className="mb-1 text-base font-semibold text-zinc-100 sm:text-lg">
              일별 신규 환자 유입
            </h2>
            <p className="mb-3 text-sm text-zinc-500">
              데이터가 있는 마지막 날짜를 끝점으로 최근 7일 일별 신규 환자 수와 직전 7일 일별 신규
              환자 수를 같은 슬롯에서 비교합니다.
            </p>
            <SummaryDualWeekCompareChart
              ariaLabel="일별 신규 환자: 최근 7일 대 직전 7일"
              variant="integer"
              currentWeek={kpis.newCustomersCurrentWeek}
              previousWeek={kpis.newCustomersPreviousWeek}
              datePairs={kpis.datePairs}
            />
          </section>
        </div>

        <BlogRanksSection
          rows={blogRanks}
          hospitalId={hospitalId}
          loading={loading}
          headingId="summary-blog-rank"
        />

        <section aria-labelledby="summary-place-rank" className="bg-zinc-950 p-4 sm:p-5">
          <h2 id="summary-place-rank" className="mb-2 text-base font-semibold text-zinc-100 sm:text-lg">
            주요 키워드 · 스마트플레이스 노출 순위
          </h2>
          <p className="mb-3 text-sm text-zinc-500">
            가장 최신 수집 기준, 주요 키워드별 스마트플레이스 노출 순위입니다.
          </p>
          {loading && <p className="text-sm text-zinc-400">데이터를 불러오는 중...</p>}
          {!loading && placeRanks.length === 0 && (
            <p className="border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">
              표시할 순위 데이터가 없습니다.
            </p>
          )}
          {!loading && placeRanks.length > 0 && (
            <div className="overflow-x-auto border border-zinc-800 bg-zinc-900/30">
              <table className="w-full min-w-[460px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="px-3 py-2 font-medium">검색어</th>
                    <th className="px-3 py-2 font-medium">순위</th>
                  </tr>
                </thead>
                <tbody>
                  {placeRanks.map((row) => (
                    <tr key={row.keyword} className="border-b border-zinc-800/70 text-zinc-200">
                      <td className="px-3 py-2">{row.keyword}</td>
                      <td className="px-3 py-2">{formatRank(row.rank_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {error && (
        <p className="mt-3 border border-red-900/50 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </main>
  );
}
