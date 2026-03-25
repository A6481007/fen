import { ReactNode } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface FormTabsShellProps {
  title: string;
  description?: string;
  tabs: Array<{
    value: string;
    label: string;
    content: ReactNode;
  }>;
  defaultValue?: string;
  actions?: ReactNode;
}

const FormTabsShell = ({
  title,
  description,
  tabs,
  defaultValue,
  actions,
}: FormTabsShellProps) => {
  const firstTab = tabs[0]?.value;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions}
      </div>

      <Tabs defaultValue={defaultValue ?? firstTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="whitespace-nowrap">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              {tab.content}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default FormTabsShell;
