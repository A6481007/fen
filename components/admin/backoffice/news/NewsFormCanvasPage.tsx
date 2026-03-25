"use client";

import { FormProvider, useForm } from "react-hook-form";
import type { DefaultValues, FieldValues } from "react-hook-form";
import type { LayoutNode } from "@/components/admin/backoffice/layout/layoutTypes";
import { LayoutRenderer } from "@/components/admin/backoffice/layout/LayoutRenderer";
import { Button } from "@/components/ui/button";

type NewsFormCanvasPageProps<TValues extends FieldValues> = {
  initialLayout: LayoutNode;
  defaultValues: DefaultValues<TValues>;
  onSubmit?: (values: TValues) => void | Promise<void>;
};

export function NewsFormCanvasPage<TValues extends FieldValues>({
  initialLayout,
  defaultValues,
  onSubmit,
}: NewsFormCanvasPageProps<TValues>) {
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
        <LayoutRenderer node={initialLayout} />
        <div>
          <Button type="submit" size="sm">
            Save
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
