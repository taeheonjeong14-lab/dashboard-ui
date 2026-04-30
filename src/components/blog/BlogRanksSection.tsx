"use client";

import type { BlogRankSummaryRow } from "@/lib/queries";

function formatRank(value: number | null) {
  if (value == null) return "-";
  return `${new Intl.NumberFormat("ko-KR").format(value)}위`;
}

export type BlogRanksSectionProps = {
  rows: BlogRankSummaryRow[];
  loading?: boolean;
  /** 섹션 제목 */
  title?: string;
  /** 보조 설명 */
  description?: string;
  /** aria-labelledby 용 id */
  headingId?: string;
};

export default function BlogRanksSection({
  rows,
  loading = false,
  title = "주요 키워드 · 블로그 노출 순위",
  description = "가장 최신 수집 기준, 주요 키워드별 네이버 블로그 노출 순위입니다.",
  headingId = "blog-ranks-section",
}: BlogRanksSectionProps) {
  return (
    <section aria-labelledby={headingId} className="bg-zinc-950 p-4 sm:p-5">
      <h2 id={headingId} className="mb-2 text-base font-semibold text-zinc-100 sm:text-lg">
        {title}
      </h2>
      <p className="mb-3 text-sm text-zinc-500">{description}</p>
      {loading && <p className="text-sm text-zinc-400">데이터를 불러오는 중...</p>}
      {!loading && rows.length === 0 && (
        <p className="border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-500">
          표시할 순위 데이터가 없습니다.
        </p>
      )}
      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[740px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="px-3 py-2 font-medium">검색어</th>
                <th className="px-3 py-2 font-medium">블로그탭</th>
                <th className="px-3 py-2 font-medium">일반 검색</th>
                <th className="px-3 py-2 font-medium">네이버 통합검색</th>
                <th className="px-3 py-2 font-medium">반려동물 인기글</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.keyword} className="border-b border-zinc-800/70 text-zinc-200">
                  <td className="px-3 py-2">{row.keyword}</td>
                  <td className="px-3 py-2">{formatRank(row.blog_rank_tab)}</td>
                  <td className="px-3 py-2">{formatRank(row.blog_rank_general)}</td>
                  <td className="px-3 py-2">{formatRank(row.blog_rank_integrated)}</td>
                  <td className="px-3 py-2">{formatRank(row.blog_rank_pet_popular)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
