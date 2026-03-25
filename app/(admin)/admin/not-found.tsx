import Link from "next/link";

const AdminNotFound = () => {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-900">Admin page not found</p>
          <p className="text-sm text-slate-600">
            We could not find this admin page or record. It may have been removed or the link may be outdated.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center rounded-lg bg-brand-text-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-text-main/90"
          >
            Go to admin home
          </Link>
          <Link
            href="/admin/content/insights"
            className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-brand-text-main/60 hover:text-brand-text-main"
          >
            View content list
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminNotFound;
