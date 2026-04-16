"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  deleteKeywordTarget,
  fetchHospitalScope,
  fetchKeywordTargets,
  insertKeywordTarget,
  updateKeywordTarget,
  type HospitalOption,
  type KeywordTargetRow,
} from "@/lib/queries";

export default function KeywordsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [hospitalId, setHospitalId] = useState<string | "all">("all");
  const [targets, setTargets] = useState<KeywordTargetRow[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [newPriority, setNewPriority] = useState("100");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedHospital = useMemo(
    () => hospitals.find((h) => h.hospital_id === hospitalId),
    [hospitals, hospitalId]
  );

  const blogIdForInsert = useMemo(() => {
    if (hospitalId === "all") return null;
    return selectedHospital?.naver_blog_id?.trim() || null;
  }, [hospitalId, selectedHospital]);

  const hospitalNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of hospitals) m.set(h.hospital_id, h.hospital_name);
    return m;
  }, [hospitals]);

  const loadTargets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchKeywordTargets({ hospitalId: hospitalId, isAdmin });
      setTargets(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
      setTargets([]);
    } finally {
      setLoading(false);
    }
  }, [hospitalId, isAdmin]);

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
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "병원 정보를 불러오지 못했습니다.");
      } finally {
        if (active) setAuthReady(true);
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    loadTargets();
  }, [authReady, loadTargets]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (hospitalId === "all") {
      setError("키워드를 추가하려면 병원을 한 곳 선택하세요.");
      return;
    }
    if (!blogIdForInsert) {
      setError("선택한 병원에 네이버 블로그 ID(naver_blog_id)가 없습니다. DB에서 먼저 설정하세요.");
      return;
    }
    const pr = parseInt(newPriority, 10);
    setSaving(true);
    setError(null);
    try {
      await insertKeywordTarget({
        account_id: blogIdForInsert,
        hospital_id: hospitalId,
        keyword: newKeyword,
        priority: Number.isFinite(pr) ? pr : 100,
      });
      setNewKeyword("");
      setNewPriority("100");
      await loadTargets();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : e && typeof e === "object" && "message" in e
            ? String((e as { message: unknown }).message)
            : "추가에 실패했습니다.";
      const code =
        e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
      if (code === "23505" || msg.includes("duplicate") || msg.includes("23505")) {
        setError("이미 같은 블로그·키워드 조합이 있습니다.");
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(row: KeywordTargetRow, next: boolean) {
    setError(null);
    try {
      await updateKeywordTarget(row.id, { is_active: next });
      setTargets((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, is_active: next } : r))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    }
  }

  async function handlePriorityBlur(row: KeywordTargetRow, raw: string) {
    const pr = parseInt(raw, 10);
    if (!Number.isFinite(pr) || pr === row.priority) return;
    setError(null);
    try {
      await updateKeywordTarget(row.id, { priority: pr });
      setTargets((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, priority: pr } : r))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "우선순위 저장에 실패했습니다.");
    }
  }

  async function handleDelete(row: KeywordTargetRow) {
    if (!confirm(`키워드 "${row.keyword}" 를 삭제할까요?`)) return;
    setError(null);
    try {
      await deleteKeywordTarget(row.id);
      setTargets((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    }
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-gray-600">세션 확인 중…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl bg-gray-50 px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">블로그 순위 키워드</h1>
          <p className="mt-1 text-sm text-gray-600">
            수집 매크로가 읽는 대상입니다. 저장 후 순위 스크립트는 DB 입력 모드(
            <code className="rounded bg-gray-200 px-1">RANK_INPUT_SOURCE=db</code>)로 실행하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
          >
            대시보드
          </Link>
          <Link
            href="/logout"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
          >
            로그아웃
          </Link>
        </div>
      </header>

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <label className="block text-sm text-gray-600">
          병원
          <select
            value={hospitalId}
            onChange={(e) => {
              setHospitalId(e.target.value);
            }}
            className="mt-2 w-full max-w-md rounded-lg border border-gray-300 px-3 py-2"
          >
            {isAdmin && <option value="all">전체 병원 (목록만)</option>}
            {hospitals.map((h) => (
              <option key={h.hospital_id} value={h.hospital_id}>
                {h.hospital_name}
              </option>
            ))}
          </select>
        </label>
        {hospitalId !== "all" && !blogIdForInsert && (
          <p className="mt-3 text-sm text-amber-800">
            이 병원에는 <code className="rounded bg-amber-100 px-1">naver_blog_id</code>가 없어 키워드를
            추가할 수 없습니다.
          </p>
        )}
      </section>

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-gray-900">키워드 추가</h2>
        <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-sm text-gray-600">
            키워드
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="예: 은평구동물병원"
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2"
              disabled={saving || hospitalId === "all" || !blogIdForInsert}
            />
          </label>
          <label className="block w-full text-sm text-gray-600 sm:w-28">
            우선순위
            <input
              type="number"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2"
              disabled={saving || hospitalId === "all" || !blogIdForInsert}
            />
          </label>
          <button
            type="submit"
            disabled={saving || hospitalId === "all" || !blogIdForInsert || !newKeyword.trim()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            추가
          </button>
        </form>
        {hospitalId !== "all" && blogIdForInsert && (
          <p className="mt-2 text-xs text-gray-500">
            블로그 ID: <span className="font-mono">{blogIdForInsert}</span> (병원 설정값)
          </p>
        )}
      </section>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-gray-900">등록된 키워드</h2>
        {loading && <p className="text-sm text-gray-600">불러오는 중…</p>}
        {!loading && targets.length === 0 && (
          <p className="text-sm text-gray-600">등록된 키워드가 없습니다.</p>
        )}
        {!loading && targets.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  {isAdmin && hospitalId === "all" && <th className="py-2 pr-3">병원</th>}
                  <th className="py-2 pr-3">블로그 ID</th>
                  <th className="py-2 pr-3">키워드</th>
                  <th className="py-2 pr-3">우선순위</th>
                  <th className="py-2 pr-3">활성</th>
                  <th className="py-2">삭제</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100">
                    {isAdmin && hospitalId === "all" && (
                      <td className="py-2 pr-3 text-xs text-gray-700">
                        {row.hospital_id
                          ? hospitalNameById.get(row.hospital_id) ?? row.hospital_id
                          : "—"}
                      </td>
                    )}
                    <td className="py-2 pr-3 font-mono text-xs">{row.account_id}</td>
                    <td className="py-2 pr-3">{row.keyword}</td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        defaultValue={row.priority}
                        className="w-20 rounded border border-gray-300 px-2 py-1"
                        onBlur={(e) => handlePriorityBlur(row, e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={row.is_active}
                        onChange={(e) => handleToggleActive(row, e.target.checked)}
                        aria-label={`${row.keyword} 활성`}
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
