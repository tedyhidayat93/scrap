import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const urlParam = searchParams.get("url");

    if (!urlParam) {
      return NextResponse.json(
        { error: "Missing `url` query parameter" },
        { status: 400 }
      );
    }

    // Decode in case the caller double-encoded the URL
    let decoded = decodeURIComponent(urlParam);

    // Ensure we have a protocol. If caller passed a hostless URL (used by some helpers), try to recover.
    if (!/^https?:\/\//i.test(decoded)) {
      // If user passed a hostless URL like `example.com/img.jpg`, assume https
      decoded = `https://${decoded}`;
    }

    // Use images.weserv.nl to convert to JPEG (server-side proxy + conversion)
    // images.weserv expects the URL without protocol (hostless)
    const hostless = decoded.replace(/^https?:\/\//i, "");
    const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(
      hostless
    )}&output=jpg&quality=80`;

    const resp = await fetch(weservUrl);
    if (!resp.ok) {
      // Fallback: try to fetch original and return as-is
      const orig = await fetch(decoded);
      if (!orig.ok) {
        return NextResponse.json(
          { error: "Failed to fetch image from source" },
          { status: 502 }
        );
      }

      const headers = new Headers(orig.headers);
      headers.set("Cache-Control", "public, max-age=86400");
      // prefer jpeg, but keep original content-type
      return new NextResponse(orig.body, { headers });
    }

    const headers = new Headers(resp.headers);
    headers.set("Content-Type", "image/jpeg");
    headers.set("Cache-Control", "public, max-age=86400");

    return new NextResponse(resp.body, { headers });
  } catch (err) {
    // console.error("[image-proxy] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
