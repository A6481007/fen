import { ReactNode } from "react";

interface ListPageShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

const ListPageShell = ({
  title,
  description,
  actions,
  children,
}: ListPageShellProps) => {
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
      <div className="rounded-xl border bg-white p-4 shadow-sm">{children}</div>
    </div>
  );
};

export default ListPageShell;
