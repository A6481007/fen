"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type ReferenceOption = {
  id: string;
  label: string;
  description?: string;
  payload?: unknown;
};

type ReferencePickerProps = {
  label?: string;
  placeholder?: string;
  description?: string;
  value?: ReferenceOption | null;
  onChange?: (option: ReferenceOption | null) => void;
  onSearch: (query: string) => Promise<ReferenceOption[]>;
  allowClear?: boolean;
  className?: string;
};

export function ReferencePicker({
  label,
  placeholder,
  description,
  value,
  onChange,
  onSearch,
  allowClear = true,
  className,
}: ReferencePickerProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("admin.referencePicker.label");
  const resolvedPlaceholder = placeholder ?? t("admin.referencePicker.placeholder");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<ReferenceOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      try {
        const results = await onSearch(search);
        if (!controller.signal.aborted) {
          setOptions(results);
        }
      } catch (error) {
        console.error("[ReferencePicker] search failed", error);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    const debounce = setTimeout(run, 180);
    return () => {
      controller.abort();
      clearTimeout(debounce);
    };
  }, [search, onSearch]);

  const triggerLabel = useMemo(() => {
    const label = value?.label?.trim();
    return label ? label : resolvedPlaceholder;
  }, [resolvedPlaceholder, value]);

  const handleSelectOption = (option: ReferenceOption) => {
    onChange?.(option);
    setOpen(false);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-700">{resolvedLabel}</p>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
        {allowClear && value && (
          <Button variant="ghost" size="sm" onClick={() => onChange?.(null)}>
            {t("admin.referencePicker.clear")}
          </Button>
        )}
      </div>

      <Button
        variant="outline"
        className="justify-between"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className="truncate">{triggerLabel}</span>
        <Badge variant="secondary">
          {value ? t("admin.referencePicker.selected") : t("admin.referencePicker.choose")}
        </Badge>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command label={resolvedLabel}>
          <CommandInput
            placeholder={resolvedPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading && (
              <CommandItem disabled value="loading">
                {t("admin.referencePicker.searching")}
              </CommandItem>
            )}
            <CommandEmpty>{t("admin.referencePicker.noResults")}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.id}
                value={`${option.label} ${option.description ?? ""} ${option.id}`}
                onSelect={() => handleSelectOption(option)}
                onClick={() => handleSelectOption(option)}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{option.label}</span>
                  {option.description && (
                    <span className="text-xs text-slate-500">{option.description}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}
