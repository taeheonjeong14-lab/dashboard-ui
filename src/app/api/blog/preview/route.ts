const ALLOWED_HOSTS = new Set(["blog.naver.com", "m.blog.naver.com", "naver.me"]);

const MOBILE_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

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

function parseMetaAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null = null;
  while ((match = attrRegex.exec(tag)) !== null) {
    const [, rawName, dQuoted, sQuoted, bare] = match;
    const value = dQuoted ?? sQuoted ?? bare ?? "";
    attrs[rawName.toLowerCase()] = value.trim();
  }
  return attrs;
}

function extractMeta(html: string, key: string): string | null {
  const target = key.toLowerCase();
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const attrs = parseMetaAttributes(tag);
    const name = (attrs.property ?? attrs.name ?? "").toLowerCase();
    if (name !== target) continue;
    const content = attrs.content?.trim();
    if (content) return content;
  }
  return null;
}

function extractTagText(html: string, tag: string): string | null {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i");
  const match = html.match(pattern);
  if (!match?.[1]) return null;
  return match[1].replace(/\s+/g, " ").trim() || null;
}

function normalizeImageUrl(rawImage: string | null, finalUrl: string): string | null {
  if (!rawImage) return null;
  try {
    return new URL(rawImage, finalUrl).toString();
  } catch {
    return null;
  }
}

function extractScriptRedirectUrl(html: string, baseUrl: string): string | null {
  const patterns = [
    /top\.location\.replace\(\s*['"]([^'"]+)['"]\s*\)/i,
    /location\.href\s*=\s*['"]([^'"]+)['"]/i,
    /location\.replace\(\s*['"]([^'"]+)['"]\s*\)/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const raw = match?.[1]?.trim();
    if (!raw) continue;
    const normalized = raw.replace(/\\\//g, "/");
    try {
      return new URL(normalized, baseUrl).toString();
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchHtmlWithRedirectHint(
  initialUrl: string,
  signal: AbortSignal
): Promise<{ finalUrl: string; html: string } | null> {
  let currentUrl = initialUrl;
  for (let i = 0; i < 3; i += 1) {
    const response = await fetch(currentUrl, {
      signal,
      headers: { "user-agent": MOBILE_USER_AGENT, accept: "text/html,*/*;q=0.8" },
      redirect: "follow",
    });
    if (!response.ok) return null;

    const finalUrl = response.url;
    const html = (await response.text()).slice(0, 262144);
    const hasMeta = /<meta\b/i.test(html);
    if (hasMeta) return { finalUrl, html };

    const hinted = extractScriptRedirectUrl(html, finalUrl);
    if (!hinted || hinted === currentUrl) return { finalUrl, html };
    currentUrl = hinted;
  }
  return null;
}

async function parsePreview(targetUrl: string): Promise<PreviewOk | PreviewErr> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, reason: "invalid_url" };
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    return { ok: false, reason: "host_not_allowed" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const fetched = await fetchHtmlWithRedirectHint(parsed.toString(), controller.signal);
    if (!fetched) {
      return { ok: false, reason: "fetch_failed" };
    }

    const { finalUrl, html } = fetched;
    const head = extractTagText(html, "head") ?? html;

    const title = extractMeta(head, "og:title") ?? extractTagText(head, "title");
    const description =
      extractMeta(head, "og:description") ?? extractMeta(head, "description");
    const siteName = extractMeta(head, "og:site_name");
    const image = normalizeImageUrl(extractMeta(head, "og:image"), finalUrl);

    if (!title && !description && !image) {
      return { ok: false, reason: "parse_failed" };
    }

    return {
      ok: true,
      title,
      description,
      image,
      siteName,
      finalUrl,
    };
  } catch {
    return { ok: false, reason: "fetch_failed" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const target = url.searchParams.get("url");

  if (!target) {
    return Response.json({ ok: false, reason: "invalid_url" } satisfies PreviewErr, {
      status: 400,
    });
  }

  const result = await parsePreview(target);
  const status = result.ok ? 200 : result.reason === "host_not_allowed" ? 400 : 502;
  const cacheControl = result.ok
    ? "public, s-maxage=86400, stale-while-revalidate=86400"
    : "no-store";

  return Response.json(result, {
    status,
    headers: {
      "Cache-Control": cacheControl,
    },
  });
}
