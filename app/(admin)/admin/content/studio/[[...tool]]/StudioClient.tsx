"use client";

import "@/app/i18n";
import { useTranslation } from "react-i18next";
import { NextStudio } from "next-sanity/studio";
import config from "@/sanity.config";

const adminConfig = {
  ...config,
  basePath: "/admin/content/studio",
};

const AdminStudioClient = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {t("admin.studio.title")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.studio.subtitle")}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="min-h-[70vh] h-[75vh]">
          <NextStudio config={adminConfig} />
        </div>
      </div>
    </div>
  );
};

export default AdminStudioClient;
