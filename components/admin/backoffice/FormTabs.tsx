"use client";

import { ReactNode, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export type FormSection = {
  id: string;
  label: string;
  description?: string;
  fields?: string[];
  content: ReactNode;
};

type FormTabsProps = {
  sections: FormSection[];
  defaultSection?: string;
  onSectionChange?: (sectionId: string) => void;
};

export function FormTabs({ sections, defaultSection, onSectionChange }: FormTabsProps) {
  const fallbackTab = useMemo(() => sections[0]?.id ?? "general", [sections]);
  const activeDefault = defaultSection ?? fallbackTab;

  return (
    <Tabs
      defaultValue={activeDefault}
      className="w-full"
      onValueChange={(value) => onSectionChange?.(value)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          {sections.map((section) => (
            <TabsTrigger key={section.id} value={section.id}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {sections.map((section) => (
        <TabsContent key={section.id} value={section.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {section.description && (
            <p className="mb-3 text-sm text-slate-600">{section.description}</p>
          )}
          {section.fields && section.fields.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {section.fields.map((field) => (
                <Badge key={field} variant="outline">
                  {field}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-4">{section.content}</div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
