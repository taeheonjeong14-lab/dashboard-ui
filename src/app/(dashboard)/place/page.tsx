"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PlaceInflowSection from "@/components/place/PlaceInflowSection";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchHospitalScope,
  fetchPlacePeriodKpis,
  fetchSummaryPlaceRanks,
  type PlacePeriodDayRow,
  type PlaceRankSummaryRow,
} from "@/lib/queries";

function formatRank(value: number | null) {
  if (value == null) return "-";
  return `${new Intl.NumberFormat("ko-KR").format(value)}위`;
}

export default function PlacePerformancePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placeRanks, setPlaceRanks] = useState<PlaceRankSummaryRow[]>([]);
  const [inflowRows, setInflowRows] = useState<PlacePeriodDayRow[]>([]);
  const [inflowError, setInflowError] = useState<string | null>(null);

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
          setError("users.hospital_id 배정이 없어 플레이스 통계를 불러올 수 없습니다.");
          setReady(true);
          return;
        }

        const [rankResult, inflowResult] = await Promise.allSettled([
          fetchSummaryPlaceRanks(hospitalId),
          fetchPlacePeriodKpis(hospitalId),
        ]);
        if (!active) return;

        if (rankResult.status === "fulfilled") {
          setPlaceRanks(rankResult.value);
        } else {
          setPlaceRanks([]);
        }

        if (inflowResult.status === "fulfilled") {
          setInflowRows(inflowResult.value);
          setInflowError(null);
        } else {
          setInflowRows([]);
          setInflowError(
            inflowResult.reason instanceof Error
              ? `플레이스 유입수 조회 오류: ${inflowResult.reason.message}`
              : "플레이스 유입수 조회 중 오류가 발생했습니다."
          );
        }

        if (rankResult.status === "rejected" && inflowResult.status === "rejected") {
          setError("플레이스 통계 데이터를 불러오지 못했습니다.");
        } else {
          setError(null);
        }
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
    <main className="w-full max-w-none px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      {loading && <p className="text-sm text-zinc-500">불러오는 중…</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3">
        <section aria-labelledby="place-ranks" className="border-b border-zinc-800 bg-zinc-950 p-4 sm:p-5">
          <h2 id="place-ranks" className="mb-2 text-base font-semibold text-zinc-100 sm:text-lg">
            주요 키워드 · 스마트플레이스 노출 순위
          </h2>
          <p className="mb-3 text-sm text-zinc-500">
            가장 최신 수집 기준, 주요 키워드별 스마트플레이스 노출 순위입니다.
          </p>
          {loading && <p className="text-sm text-zinc-500">불러오는 중…</p>}
          {!loading && placeRanks.length === 0 && (
            <p className="border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">
              표시할 데이터가 없습니다.
            </p>
          )}
          {!loading && placeRanks.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-left text-sm">
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

        <PlaceInflowSection rows={inflowRows} errorMessage={inflowError} />
      </div>

      {error && (
        <p className="mt-3 border border-red-900/50 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </main>
  );
}
