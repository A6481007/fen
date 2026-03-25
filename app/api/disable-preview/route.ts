import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const sanitizeRedirect = (value: string | null) => {
  if (!value) return "/";
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      return parsed.pathname + parsed.search + parsed.hash;
    } catch {
      return "/";
    }
  }

  return value.startsWith("/") ? value : `/${value}`;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectParam = searchParams.get("redirect");
  const redirectPath = sanitizeRedirect(redirectParam);

  (await draftMode()).disable();

  return NextResponse.redirect(new URL(redirectPath, request.url));
}
