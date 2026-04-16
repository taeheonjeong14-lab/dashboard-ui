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
};

function getStartDate(days: RangeDays) {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  return date.toISOString().slice(0, 10);
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

export async function fetchHospitalScope(user?: User | null): Promise<HospitalScope> {
  const supabase = getSupabaseClient();
  const resolved = user ?? (await getCurrentUser());
  if (!resolved) {
    return { isAdmin: false, hospitals: [] };
  }

  const { data: profile, error: profileError } = await supabase
    .schema("core")
    .from("users")
    .select("id,hospital_id,role")
    .eq("id", resolved.id)
    .maybeSingle();
  if (profileError) throw profileError;

  const role = String(profile?.role ?? "member").toLowerCase();
  const isAdmin = role === "admin";

  if (isAdmin) {
    const { data: hospitals, error: hospitalError } = await supabase
      .schema("core")
      .from("hospitals")
      .select("id,name,naver_blog_id")
      .order("name", { ascending: true });
    if (hospitalError) throw hospitalError;
    return {
      isAdmin: true,
      hospitals: (hospitals ?? []).map((row) => ({
        hospital_id: String(row.id),
        hospital_name: row.name ?? String(row.id),
        naver_blog_id: row.naver_blog_id != null ? String(row.naver_blog_id) : null,
      })),
    };
  }

  if (!profile?.hospital_id) return { isAdmin: false, hospitals: [] };

  const { data: hospitals, error: hospitalError } = await supabase
    .schema("core")
    .from("hospitals")
    .select("id,name,naver_blog_id")
    .eq("id", profile.hospital_id)
    .order("name", { ascending: true });
  if (hospitalError) throw hospitalError;

  return {
    isAdmin: false,
    hospitals: (hospitals ?? []).map((row) => ({
      hospital_id: String(row.id),
      hospital_name: row.name ?? String(row.id),
      naver_blog_id: row.naver_blog_id != null ? String(row.naver_blog_id) : null,
    })),
  };
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
