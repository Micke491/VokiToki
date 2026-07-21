import { NextResponse } from "next/server";

const UPSTREAM_APK_URL =
  "https://github.com/Micke491/voki-toki-mobile/releases/latest/download/vokitoki.apk";

export async function GET() {
  const upstream = await fetch(UPSTREAM_APK_URL, {
    redirect: "follow",
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Could not fetch the APK. Please try again later." },
      { status: 502 }
    );
  }

  const headers = new Headers({
    "Content-Type": "application/vnd.android.package-archive",
    "Content-Disposition": 'attachment; filename="vokitoki.apk"',
    "Cache-Control": "public, max-age=300",
  });

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new NextResponse(upstream.body, { status: 200, headers });
}
