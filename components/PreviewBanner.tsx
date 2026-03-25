"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type PreviewBannerProps = {
  isDraftMode?: boolean;
};

const buildRedirect = (pathname: string | null, searchParams: URLSearchParams | null) => {
  const path = pathname && pathname.length > 0 ? pathname : "/";
  if (!searchParams) return path;

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
};

const PreviewBanner = ({ isDraftMode }: PreviewBannerProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!isDraftMode) return null;

  const redirectTarget = buildRedirect(pathname, searchParams);
  const exitHref = `/api/disable-preview?redirect=${encodeURIComponent(redirectTarget)}`;

  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-amber-400/95 text-amber-950 shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-sm font-semibold">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-amber-50 text-xs">
            PRE
          </span>
          <span>Preview mode is active</span>
        </div>
        <Link
          href={exitHref}
          prefetch={false}
          className="rounded-md border border-amber-500 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900 transition hover:bg-white"
        >
          Exit preview
        </Link>
      </div>
    </div>
  );
};

export default PreviewBanner;
