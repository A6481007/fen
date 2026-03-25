"use client";

import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { DefaultValues, FieldValues } from "react-hook-form";
import type { LayoutNode } from "@/components/admin/backoffice/layout/layoutTypes";
import { sampleTwoColumnLayout } from "@/components/admin/backoffice/layout/layoutTypes";
import { LayoutRenderer } from "@/components/admin/backoffice/layout/LayoutRenderer";
import { LayoutJsonEditor } from "@/components/admin/backoffice/layout/LayoutJsonEditor";
import { Button } from "@/components/ui/button";

type NewsLayoutEditorPageProps<TValues extends FieldValues> = {
  initialLayout?: LayoutNode;
  defaultValues: DefaultValues<TValues>;
  onSubmit?: (values: TValues) => void | Promise<void>;
};

export function NewsLayoutEditorPage<TValues extends FieldValues>({
  initialLayout = sampleTwoColumnLayout,
  defaultValues,
  onSubmit,
}: NewsLayoutEditorPageProps<TValues>) {
  const [layout, setLayout] = useState<LayoutNode>(initialLayout);
  const form = useForm<TValues>({ defaultValues });

  const handleSubmit = form.handleSubmit(async (values) => {
    if (onSubmit) {
      await onSubmit(values);
    } else {
      // eslint-disable-next-line no-console
      console.log("Submitted values", values);
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LayoutJsonEditor layout={layout} onChange={setLayout} />
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-800">Live preview</div>
            <LayoutRenderer node={layout} />
          </div>
        </div>
        <div>
          <Button type="submit" size="sm">
            Save content
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
