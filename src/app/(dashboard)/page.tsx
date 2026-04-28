import type { Metadata } from "next";
import SummaryDualWeekCompareChart from "@/components/SummaryDualWeekCompareChart";

export const metadata: Metadata = {
  title: "요약 | 블로그 조회수 대시보드",
  description: "병원·채널 핵심 지표 요약",
};

export default function SummaryPage() {
  return (
    <main className="w-full max-w-none px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-50">요약</h1>
        <p className="mt-1 text-sm text-zinc-400">
          최근 업무 기준 주요 지표를 한 번에 확인합니다. (데이터 소스 연동 후 표시 예정)
        </p>
      </div>

      <div className="flex flex-col gap-10">
        <section aria-labelledby="summary-revenue">
          <h2 id="summary-revenue" className="mb-2 text-lg font-semibold text-zinc-100">
            병원 일별 매출
          </h2>
          <p className="mb-4 text-sm text-zinc-500">
            최근 7일 일별 매출(파란색)과 그 이전 7일 일별 매출(보라색)을 한 그래프에서 같은 일차 기준으로 비교합니다.
          </p>
          <SummaryDualWeekCompareChart
            ariaLabel="병원 일별 매출: 최근 7일 대 직전 7일"
            variant="currency"
          />
        </section>

        <section aria-labelledby="summary-patients">
          <h2 id="summary-patients" className="mb-2 text-lg font-semibold text-zinc-100">
            일별 신규 환자 유입
          </h2>
          <p className="mb-4 text-sm text-zinc-500">
            최근 7일 일별 신규 환자 수와 직전 7일 일별 신규 환자 수를 한 그래프에서 비교합니다.
          </p>
          <SummaryDualWeekCompareChart
            ariaLabel="일별 신규 환자: 최근 7일 대 직전 7일"
            variant="integer"
          />
        </section>

        <section aria-labelledby="summary-blog-rank">
          <h2 id="summary-blog-rank" className="mb-4 text-lg font-semibold text-zinc-100">
            주요 키워드 · 블로그 노출 순위
          </h2>
          <p className="mb-3 text-sm text-zinc-500">
            가장 최신 수집 기준, 주요 키워드별 네이버 블로그 노출 순위입니다.
          </p>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-500">
            데이터 연동 후 표가 표시됩니다.
          </div>
        </section>

        <section aria-labelledby="summary-place-rank">
          <h2 id="summary-place-rank" className="mb-4 text-lg font-semibold text-zinc-100">
            주요 키워드 · 스마트플레이스 노출 순위
          </h2>
          <p className="mb-3 text-sm text-zinc-500">
            가장 최신 수집 기준, 주요 키워드별 스마트플레이스 노출 순위입니다.
          </p>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-500">
            데이터 연동 후 표가 표시됩니다.
          </div>
        </section>
      </div>
    </main>
  );
}
