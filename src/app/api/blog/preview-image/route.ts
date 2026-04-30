const ALLOWED_IMAGE_HOSTS = ["blogthumb.pstatic.net", "postfiles.pstatic.net", "ssl.pstatic.net"];

function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_IMAGE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export async function GET(request: Request): Promise<Response> {
  const reqUrl = new URL(request.url);
  const raw = reqUrl.searchParams.get("url");
  if (!raw) {
    return new Response("Missing url", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (!["https:", "http:"].includes(target.protocol)) {
    return new Response("Invalid protocol", { status: 400 });
  }
  if (!isAllowedImageHost(target.hostname)) {
    return new Response("Host not allowed", { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        referer: "https://blog.naver.com/",
      },
    });
    if (!upstream.ok) {
      return new Response("Upstream fetch failed", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const bytes = await upstream.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response("Proxy failed", { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
