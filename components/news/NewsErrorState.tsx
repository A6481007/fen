"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NewsErrorStateProps = {
  titleKey?: string;
  subtitleKey?: string;
  actionLabelKey?: string;
  actionHref?: string;
  className?: string;
};

const NewsErrorState = ({
  titleKey = "client.news.error.title",
  subtitleKey = "client.news.error.subtitle",
  actionLabelKey = "client.news.error.retry",
  actionHref = "/news",
  className,
}: NewsErrorStateProps) => {
  const { t } = useTranslation();

  return (
    <Card className={cn("border border-dashed border-border bg-surface-0", className)}>
      <CardHeader className="items-center text-center space-y-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <CardTitle className="text-xl text-ink-strong">{t(titleKey)}</CardTitle>
          <p className="text-sm text-ink-muted">{t(subtitleKey)}</p>
        </div>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button asChild className="bg-shop_dark_green hover:bg-shop_light_green">
          <Link href={actionHref}>{t(actionLabelKey)}</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default NewsErrorState;
