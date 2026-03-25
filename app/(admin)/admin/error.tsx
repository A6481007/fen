"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const AdminError = ({ error, reset }: AdminErrorProps) => {
  useEffect(() => {
    console.error("Admin route error", error);
  }, [error]);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-800">Something went wrong</p>
        <p className="mt-2 text-sm text-red-700">
          We could not load this admin page. Try again or return to the admin dashboard. If the issue
          persists, ensure you are signed in and the backend services are reachable.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button size="sm" onClick={() => reset()}>
            Try again
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin">Go to admin home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminError;
