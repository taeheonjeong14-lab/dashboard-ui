import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

export type RangeDays = 7 | 30 | 90;

export type BlogViewPoint = {
  metric_date: string;
  hospital_id: string | null;
  hospital_name: string | null;
  blog_views: number | null;
};

export type HospitalOption = {
  hospital_id: string;
  hospital_name: string;
  naver_blog_id: string | null;
  address: string | null;
};

export type KeywordTargetRow = {
  id: number;
  account_id: string;
  hospital_id: string | null;
  keyword: string;
  is_active: boolean;
  priority: number;
  source: string;
  updated_at?: string | null;
};

export type HospitalScope = {
  isAdmin: boolean;
  hospitals: HospitalOption[];
  /** core.users.name */
  userName: string | null;
  /** core.users.hospital_id (배정 병원) */
  assignedHospitalId: string | null;
};

export type SummaryKpis = {
  salesCurrentWeek: (number | null)[];
  salesPreviousWeek: (number | null)[];
  newCustomersCurrentWeek: (number | null)[];
  newCustomersPreviousWeek: (number | null)[];
  datePairs: { currentDate: string; previousDate: string }[];
};

/** 일별 KPI 시계열 (경영 통계 페이지). dateKey는 Asia/Seoul 기준 YYYY-MM-DD. */
export type HospitalManagementDayRow = {
  dateKey: string;
  periodType: "day" | "month" | "year";
  sales: number | null;
  visits: number | null;
  newPatients: number | null;
};

export type BlogRankSummaryRow = {
  keyword: string;
  blog_rank_tab: number | null;
  blog_rank_general: number | null;
  blog_rank_integrated: number | null;
  blog_rank_pet_popular: number | null;
};

export type PlaceRankSummaryRow = {
  keyword: string;
  rank_value: number | null;
};

/** 오늘 날짜 (Asia/Seoul 달력 기준 YYYY-MM-DD) */
function todayDateKeySeoul(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

function addCalendarDaysUtc(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + delta * 86400000;
  const dt = new Date(t);
  const ys = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const da = String(dt.getUTCDate()).padStart(2, "0");
  return `${ys}-${mo}-${da}`;
}

function getStartDate(days: RangeDays) {
  const end = todayDateKeySeoul();
  return addCalendarDaysUtc(end, -(days - 1));
}

function asNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const normalized = value.replace(/,/g, "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function firstNumber(row: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    if (!(key in row)) continue;
    const n = asNumberOrNull(row[key]);
    if (n != null) return n;
  }
  return null;
}

function asStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toSeoulDateKey(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(d);
}

function addNullableKpi(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}

function parseDateValue(row: Record<string, unknown>): Date | null {
  const candidates = [
    row.metric_date,
    row.business_date,
    row.period_start_date,
    row.period_date,
    row.period_start,
    row.period,
    row.ym,
    row.start_date,
    row.target_date,
    row.day,
    row.month,
    row.year,
    row.base_date,
    row.collected_at,
    row.date,
  ];
  for (const value of candidates) {
    if (value == null) continue;
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date;
  }

  for (const [key, value] of Object.entries(row)) {
    if (value == null) continue;
    if (!/(date|day|period|month|year)/i.test(key)) continue;
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

/**
 * chart_kpis_period_view may contain mixed granularity rows (day/month/year).
 * We only want day-level rows, then aggregate in UI by month/year.
 */
function isDailyGranularityRow(row: Record<string, unknown>): boolean {
  const candidates = [
    row.period_type,
    row.period_granularity,
    row.granularity,
    row.period_unit,
    row.unit,
    row.bucket,
  ];
  const defined = candidates.filter((v) => v != null);
  if (defined.length === 0) return true;

  for (const raw of defined) {
    const v = String(raw).trim().toLowerCase();
    if (v === "day" || v === "daily" || v === "d" || v === "1d") return true;
  }
  return false;
}

function granularityOfRow(row: Record<string, unknown>): "day" | "week" | "month" | "year" | "unknown" {
  const candidates = [
    row.period_type,
    row.period_granularity,
    row.granularity,
    row.period_unit,
    row.unit,
    row.bucket,
  ];
  for (const raw of candidates) {
    if (raw == null) continue;
    const v = String(raw).trim().toLowerCase();
    if (v === "day" || v === "daily" || v === "d" || v === "1d") return "day";
    if (v === "week" || v === "weekly" || v === "w" || v === "1w") return "week";
    if (v === "month" || v === "monthly" || v === "m" || v === "1m") return "month";
    if (v === "year" || v === "yearly" || v === "y" || v === "1y") return "year";
  }
  return "unknown";
}

function latestSnapshotRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  if (rows.length === 0) return [];
  const stamped = rows
    .map((row) => ({ row, date: parseDateValue(row) }))
    .filter((item): item is { row: T; date: Date } => item.date !== null);
  if (stamped.length === 0) return rows;

  const maxTime = Math.max(...stamped.map((item) => item.date.getTime()));
  return stamped
    .filter((item) => item.date.getTime() === maxTime)
    .map((item) => item.row);
}

export async function fetchBlogViews(
  rangeDays: RangeDays,
  hospitalId: string | "all"
) {
  const supabase = getSupabaseClient();
  const startDate = getStartDate(rangeDays);

  let query = supabase
    .schema("analytics")
    .from("analytics_daily_metrics_daily_view")
    .select("metric_date,hospital_id,hospital_name,blog_views")
    .gte("metric_date", startDate)
    .not("blog_views", "is", null)
    .order("metric_date", { ascending: true });

  if (hospitalId !== "all") {
    query = query.eq("hospital_id", hospitalId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as BlogViewPoint[];
}

function userNameFromProfile(profile: { name?: unknown } | null | undefined): string | null {
  const n = profile?.name;
  return typeof n === "string" && n.trim() !== "" ? n.trim() : null;
}

export async function fetchHospitalScope(user?: User | null): Promise<HospitalScope> {
  const supabase = getSupabaseClient();
  const resolved = user ?? (await getCurrentUser());
  if (!resolved) {
    return { isAdmin: false, hospitals: [], userName: null, assignedHospitalId: null };
  }

  const { data: profile, error: profileError } = await supabase
    .schema("core")
    .from("users")
    .select('id,"hospitalId",name')
    .eq("id", resolved.id)
    .maybeSingle();
  if (profileError) throw profileError;

  const userName = userNameFromProfile(profile);
  const assignedHospitalId =
    profile?.hospitalId != null ? String(profile.hospitalId) : null;

  // dashboard-ui 측 admin 분기는 현재 비활성. 관리/배정은 별도 관리자 앱에서 처리.
  const isAdmin = false;

  if (isAdmin) {
    const { data: hospitals, error: hospitalError } = await supabase
      .schema("core")
      .from("hospitals")
      .select("id,name,naver_blog_id,address")
      .order("name", { ascending: true });
    if (hospitalError) throw hospitalError;
    return {
      isAdmin: true,
      hospitals: (hospitals ?? []).map((row) => ({
        hospital_id: String(row.id),
        hospital_name: row.name ?? String(row.id),
        naver_blog_id: row.naver_blog_id != null ? String(row.naver_blog_id) : null,
        address:
          row.address != null && String(row.address).trim() !== ""
            ? String(row.address).trim()
            : null,
      })),
      userName,
      assignedHospitalId,
    };
  }

  if (!profile?.hospitalId) {
    return { isAdmin: false, hospitals: [], userName, assignedHospitalId };
  }

  const { data: hospitals, error: hospitalError } = await supabase
    .schema("core")
    .from("hospitals")
    .select("id,name,naver_blog_id,address")
    .eq("id", profile.hospitalId)
    .order("name", { ascending: true });
  if (hospitalError) throw hospitalError;

  return {
    isAdmin: false,
    hospitals: (hospitals ?? []).map((row) => ({
      hospital_id: String(row.id),
      hospital_name: row.name ?? String(row.id),
      naver_blog_id: row.naver_blog_id != null ? String(row.naver_blog_id) : null,
      address:
        row.address != null && String(row.address).trim() !== ""
          ? String(row.address).trim()
          : null,
    })),
    userName,
    assignedHospitalId,
  };
}

export async function fetchSummaryKpis(hospitalId: string): Promise<SummaryKpis> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .schema("analytics")
    .from("chart_kpis_period_view")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("period_type", "day");
  if (error) throw error;

  const rawRows = (data ?? []) as Record<string, unknown>[];
  const hasIntovet = rawRows.some((r) => String(r.chart_type ?? "").toLowerCase() === "intovet");
  const sourceRows = hasIntovet
    ? rawRows.filter((r) => String(r.chart_type ?? "").toLowerCase() === "intovet")
    : rawRows;

  const byDate = new Map<string, { sales: number | null; patients: number | null }>();
  for (const rawRow of sourceRows) {
    const parsedDate = parseDateValue(rawRow);
    if (!parsedDate) continue;
    const dateKey = toSeoulDateKey(parsedDate);
    byDate.set(dateKey, {
      sales: firstNumber(rawRow, ["sales_amount", "monthly_sales", "sales"]),
      patients: firstNumber(rawRow, [
        "new_customer_count",
        "visit_count",
        "patient_count",
        "customers",
      ]),
    });
  }

  const latestDate = Array.from(byDate.keys()).sort().at(-1) ?? addCalendarDaysUtc(todayDateKeySeoul(), -1);
  const endDate = latestDate;
  const currentDates = Array.from({ length: 7 }, (_, i) => addCalendarDaysUtc(endDate, -6 + i));
  const previousDates = currentDates.map((d) => addCalendarDaysUtc(d, -7));
  const datePairs = currentDates.map((currentDate, i) => ({
    currentDate,
    previousDate: previousDates[i],
  }));

  const toWeek = (
    weekDates: string[],
    key: "sales" | "patients"
  ): (number | null)[] => weekDates.map((d) => byDate.get(d)?.[key] ?? null);

  return {
    salesCurrentWeek: toWeek(currentDates, "sales"),
    salesPreviousWeek: toWeek(previousDates, "sales"),
    newCustomersCurrentWeek: toWeek(currentDates, "patients"),
    newCustomersPreviousWeek: toWeek(previousDates, "patients"),
    datePairs,
  };
}

export async function fetchHospitalManagementKpis(
  hospitalId: string
): Promise<HospitalManagementDayRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .schema("analytics")
    .from("chart_kpis_period_view")
    .select("*")
    .eq("hospital_id", hospitalId)
    .in("period_type", ["day", "month", "year"]);
  if (error) throw error;

  const rawRows = (data ?? []) as Record<string, unknown>[];
  const hasIntovet = rawRows.some((r) => String(r.chart_type ?? "").toLowerCase() === "intovet");
  const sourceRows = hasIntovet
    ? rawRows.filter((r) => String(r.chart_type ?? "").toLowerCase() === "intovet")
    : rawRows;

  const mapped = sourceRows
    .map((rawRow) => {
      const parsedDate = parseDateValue(rawRow);
      if (!parsedDate) return null;
      const periodType = String(rawRow.period_type ?? "").toLowerCase();
      if (periodType !== "day" && periodType !== "month" && periodType !== "year") return null;
      return {
        dateKey: toSeoulDateKey(parsedDate),
        periodType,
        sales: firstNumber(rawRow, ["sales_amount", "monthly_sales", "sales"]),
        visits: firstNumber(rawRow, ["visit_count", "treatment_count", "patient_count", "visits"]),
        newPatients: firstNumber(rawRow, [
          "new_customer_count",
          "new_patient_count",
          "new_patients",
        ]),
      } as HospitalManagementDayRow;
    })
    .filter((row): row is HospitalManagementDayRow => row !== null);

  const dedup = new Map<string, HospitalManagementDayRow>();
  for (const row of mapped) {
    dedup.set(`${row.periodType}:${row.dateKey}`, row);
  }

  return Array.from(dedup.values()).sort((a, b) => {
    if (a.periodType === b.periodType) return a.dateKey.localeCompare(b.dateKey);
    return a.periodType.localeCompare(b.periodType);
  });
}

/**
 * 디버그용: chart_kpis_period_view의 해당 병원 row를 가공 없이 그대로 반환.
 * 컬럼 구조/값 확인을 위해 사용.
 */
export async function fetchHospitalManagementRawRows(
  hospitalId: string
): Promise<Record<string, unknown>[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .schema("analytics")
    .from("chart_kpis_period_view")
    .select("*")
    .eq("hospital_id", hospitalId);
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

export async function fetchSummaryBlogRanks(hospitalId: string): Promise<BlogRankSummaryRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .schema("analytics")
    .from("analytics_blog_keyword_ranks_daily_view")
    .select("*")
    .eq("hospital_id", hospitalId);
  if (error) throw error;

  return latestSnapshotRows((data ?? []) as Record<string, unknown>[])
    .map((row) => ({
      keyword: asStringOrNull(row.keyword) ?? "-",
      blog_rank_tab: asNumberOrNull(row.blog_rank_tab),
      blog_rank_general: asNumberOrNull(row.blog_rank_general),
      blog_rank_integrated: asNumberOrNull(row.blog_rank_integrated),
      blog_rank_pet_popular: asNumberOrNull(row.blog_rank_pet_popular),
    }))
    .sort((a, b) => a.keyword.localeCompare(b.keyword, "ko"));
}

export async function fetchSummaryPlaceRanks(hospitalId: string): Promise<PlaceRankSummaryRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .schema("analytics")
    .from("analytics_place_keyword_ranks")
    .select("*")
    .eq("hospital_id", hospitalId);
  if (error) throw error;

  return latestSnapshotRows((data ?? []) as Record<string, unknown>[])
    .map((row) => ({
      keyword: asStringOrNull(row.keyword) ?? "-",
      rank_value: asNumberOrNull(row.rank_value),
    }))
    .sort((a, b) => a.keyword.localeCompare(b.keyword, "ko"));
}

export async function fetchKeywordTargets(params: {
  hospitalId: string | "all";
  isAdmin: boolean;
}) {
  const supabase = getSupabaseClient();
  let q = supabase
    .schema("analytics")
    .from("analytics_blog_keyword_targets")
    .select("id,account_id,hospital_id,keyword,is_active,priority,source,updated_at")
    .order("priority", { ascending: true })
    .order("keyword", { ascending: true });

  if (!params.isAdmin || params.hospitalId !== "all") {
    if (params.hospitalId === "all") {
      return [] as KeywordTargetRow[];
    }
    q = q.eq("hospital_id", params.hospitalId);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as KeywordTargetRow[];
}

export async function insertKeywordTarget(input: {
  account_id: string;
  hospital_id: string;
  keyword: string;
  priority?: number;
}) {
  const supabase = getSupabaseClient();
  const keyword = input.keyword.trim();
  if (!keyword) throw new Error("키워드를 입력하세요.");

  const { error } = await supabase.schema("analytics").from("analytics_blog_keyword_targets").insert({
    account_id: input.account_id.trim(),
    hospital_id: input.hospital_id,
    keyword,
    is_active: true,
    priority: input.priority ?? 100,
    source: "dashboard",
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function updateKeywordTarget(
  id: number,
  patch: Partial<Pick<KeywordTargetRow, "is_active" | "priority" | "keyword">>
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .schema("analytics")
    .from("analytics_blog_keyword_targets")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteKeywordTarget(id: number) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .schema("analytics")
    .from("analytics_blog_keyword_targets")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
