"use client";

import { useEffect, useMemo, useState } from "react";
import {
  dashboardBlogPreviewImageRequestUrl,
  dashboardBlogPreviewRequestUrl,
} from "@/lib/dashboard-api";

type PreviewOk = {
  ok: true;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  finalUrl: string;
};

type PreviewErr = {
  ok: false;
  reason: "invalid_url" | "host_not_allowed" | "fetch_failed" | "parse_failed";
};

type PreviewData = PreviewOk | PreviewErr;

const previewCache = new Map<string, PreviewData>();

function reasonText(reason: PreviewErr["reason"]) {
  switch (reason) {
    case "host_not_allowed":
      return "허용된 링크 도메인이 아닙니다.";
    case "invalid_url":
      return "잘못된 링크 형식입니다.";
    case "parse_failed":
      return "미리보기 정보를 읽지 못했습니다.";
    default:
      return "미리보기를 불러오지 못했습니다.";
  }
}

function domainOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export type BlogLinkPreviewModalProps = {
  open: boolean;
  url: string | null;
  label: string;
  onClose: () => void;
};

export default function BlogLinkPreviewModal({ open, url, label, onClose }: BlogLinkPreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  useEffect(() => {
    if (!open || !url) return;
    const cached = previewCache.get(url);
    if (cached && cached.ok) {
      setPreview(cached);
      setLoading(false);
      return;
    }

    let aborted = false;
    const controller = new AbortController();

    setLoading(true);
    setPreview(null);

    fetch(dashboardBlogPreviewRequestUrl(url), { signal: controller.signal })
      .then(async (res) => {
        const data = (await res.json()) as PreviewData;
        if (aborted) return;
        if (data.ok) previewCache.set(url, data);
        setPreview(data);
      })
      .catch(() => {
        if (aborted) return;
        setPreview({ ok: false, reason: "fetch_failed" });
      })
      .finally(() => {
        if (!aborted) setLoading(false);
      });

    return () => {
      aborted = true;
      controller.abort();
    };
  }, [open, url]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const previewUrl = useMemo(() => {
    if (!url) return null;
    if (preview?.ok) return preview.finalUrl;
    return url;
  }, [preview, url]);

  const previewImageUrl = useMemo(() => {
    if (!preview || !preview.ok || !preview.image) return null;
    return dashboardBlogPreviewImageRequestUrl(preview.image);
  }, [preview]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="미리보기 닫기"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-100">링크 미리보기</h3>
            <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 border border-zinc-700 px-2.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            닫기
          </button>
        </div>

        {loading && (
          <div className="space-y-2">
            <div className="h-40 w-full animate-pulse bg-zinc-900" />
            <div className="h-5 w-2/3 animate-pulse bg-zinc-900" />
            <div className="h-4 w-full animate-pulse bg-zinc-900" />
            <div className="h-4 w-5/6 animate-pulse bg-zinc-900" />
          </div>
        )}

        {!loading && preview?.ok && (
          <div>
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt=""
                className="mb-3 h-40 w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="mb-3 h-40 w-full bg-zinc-900" />
            )}
            <p className="text-base font-semibold text-zinc-100">{preview.title ?? "제목 없음"}</p>
            {preview.description && <p className="mt-1 line-clamp-3 text-sm text-zinc-400">{preview.description}</p>}
            <p className="mt-2 text-xs italic text-zinc-600">
              {preview.siteName ?? domainOf(preview.finalUrl) ?? "알 수 없는 도메인"}
            </p>
          </div>
        )}

        {!loading && preview && !preview.ok && (
          <p className="text-sm italic text-zinc-500">{reasonText(preview.reason)}</p>
        )}

        <div className="mt-4 flex justify-end">
          <a
            href={previewUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
            className={`h-8 border border-zinc-700 px-2.5 text-xs leading-[30px] text-zinc-200 hover:bg-zinc-800 ${
              previewUrl ? "" : "pointer-events-none opacity-40"
            }`}
          >
            원문 보기
          </a>
        </div>
      </div>
    </div>
  );
}
