import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PagePlaceholderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

const PagePlaceholder = ({
  title,
  description,
  actionLabel,
  actionHref,
}: PagePlaceholderProps) => {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm text-center space-y-3">
      <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Placeholder
      </div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          {description}
        </p>
      )}
      {actionHref && actionLabel && (
        <div className="pt-2">
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default PagePlaceholder;
