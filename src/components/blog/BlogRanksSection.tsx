"use client";

import { useState } from "react";
import BlogLinkPreviewModal from "@/components/blog/BlogLinkPreviewModal";
import type { BlogRankSummaryRow } from "@/lib/queries";

function formatRank(value: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(value)}위`;
}

type RankPart = {
  id: string;
  title: string;
  rankKey:
    | "blog_rank_tab"
    | "blog_rank_pet_popular"
    | "blog_rank_general"
    | "blog_rank_integrated";
  urlKey:
    | "blog_rank_tab_url"
    | "blog_rank_pet_popular_url"
    | "blog_rank_general_url"
    | "blog_rank_integrated_url";
  label: string;
};

const PARTS: RankPart[] = [
  {
    id: "tab",
    title: "블로그탭",
    rankKey: "blog_rank_tab",
    urlKey: "blog_rank_tab_url",
    label: "블로그탭 순위",
  },
  {
    id: "pet_popular",
    title: "반려동물 인기글",
    rankKey: "blog_rank_pet_popular",
    urlKey: "blog_rank_pet_popular_url",
    label: "반려동물 인기글 순위",
  },
  {
    id: "general",
    title: "일반 검색",
    rankKey: "blog_rank_general",
    urlKey: "blog_rank_general_url",
    label: "일반검색 순위",
  },
  {
    id: "integrated",
    title: "네이버 통합검색",
    rankKey: "blog_rank_integrated",
    urlKey: "blog_rank_integrated_url",
    label: "네이버 통합검색 순위",
  },
];

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

type RankEntry = {
  keyword: string;
  rank: number;
  url: string | null;
};

function pickPartEntries(rows: BlogRankSummaryRow[], part: RankPart): RankEntry[] {
  return rows
    .map((row) => {
      const rank = row[part.rankKey];
      if (rank == null) return null;
      return {
        keyword: row.keyword,
        rank,
        url: row[part.urlKey],
      } satisfies RankEntry;
    })
    .filter((entry): entry is RankEntry => entry !== null)
    .sort((a, b) => a.rank - b.rank || a.keyword.localeCompare(b.keyword, "ko"));
}

export default function BlogRanksSection({
  rows,
  loading = false,
  title = "주요 키워드 · 블로그 노출 순위",
  description = "가장 최신 수집 기준, 주요 키워드별 네이버 블로그 노출 순위입니다.",
  headingId = "blog-ranks-section",
}: BlogRanksSectionProps) {
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null);

  const renderRankCell = (entry: RankEntry, label: string) => {
    const text = formatRank(entry.rank);
    if (!entry.url) return <span className="text-zinc-200">{text}</span>;

    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 text-zinc-200 hover:text-zinc-50 hover:underline"
        onClick={() => setPreview({ url: entry.url as string, label })}
      >
        <span>{text}</span>
        <span aria-hidden="true" className="text-[10px]">
          ↗
        </span>
      </button>
    );
  };

  return (
    <>
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
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {PARTS.map((part) => {
              const entries = pickPartEntries(rows, part);
              return (
                <div key={part.id}>
                  <h3 className="mb-1 text-sm font-semibold text-zinc-200">{part.title}</h3>
                  {entries.length === 0 ? (
                    <p className="text-xs italic text-zinc-600">표시할 키워드가 없습니다.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-400">
                            <th className="py-1.5 pr-2 font-medium">검색어</th>
                            <th className="py-1.5 pl-2 font-medium">순위</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((entry) => (
                            <tr
                              key={`${part.id}:${entry.keyword}`}
                              className="border-b border-zinc-800/70 text-zinc-200"
                            >
                              <td className="py-1.5 pr-2">{entry.keyword}</td>
                              <td className="py-1.5 pl-2">{renderRankCell(entry, part.label)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <BlogLinkPreviewModal
        open={preview !== null}
        url={preview?.url ?? null}
        label={preview?.label ?? ""}
        onClose={() => setPreview(null)}
      />
    </>
  );
}
