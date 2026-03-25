"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Filter, Layers3, Tags } from "lucide-react";
import { useMemo } from "react";

type FilterPanelProps = {
  categories: string[];
  fileTypes: string[];
  tags: string[];
  selectedCategory?: string;
  selectedFileType?: string;
  selectedTags: string[];
  onCategoryChange: (value: string) => void;
  onFileTypeChange: (value: string) => void;
  onTagToggle: (value: string) => void;
  onReset: () => void;
  isLoading?: boolean;
};

const FilterPanel = ({
  categories,
  fileTypes,
  tags,
  selectedCategory,
  selectedFileType,
  selectedTags,
  onCategoryChange,
  onFileTypeChange,
  onTagToggle,
  onReset,
  isLoading = false,
}: FilterPanelProps) => {
  const activeFilters =
    (selectedCategory ? 1 : 0) +
    (selectedFileType ? 1 : 0) +
    (selectedTags?.length || 0);

  const sortedTags = useMemo(
    () => [...(tags || [])].sort((a, b) => a.localeCompare(b)),
    [tags]
  );

  return (
    <div className="sticky top-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-shop_dark_green">
            <Filter className="h-4 w-4" />
            Filters
          </p>
          <h3 className="text-xl font-semibold text-slate-900">Refine results</h3>
          <p className="text-sm text-slate-600">
            Narrow the catalog by category, format, or tags.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {activeFilters > 0 && (
            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
              {activeFilters} active
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isLoading}
            className="text-slate-700 hover:text-shop_dark_green"
          >
            Reset
          </Button>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Layers3 className="h-4 w-4 text-shop_dark_green" />
            Categories
          </div>
          <RadioGroup
            value={selectedCategory || "all"}
            onValueChange={onCategoryChange}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2 rounded-lg border border-transparent p-1 hover:border-slate-200">
              <RadioGroupItem value="all" id="category-all" disabled={isLoading} />
              <Label htmlFor="category-all" className="cursor-pointer text-sm text-slate-700">
                All categories
              </Label>
            </div>
            {categories.map((category) => (
              <div
                key={category}
                className="flex items-center space-x-2 rounded-lg border border-transparent p-1 hover:border-slate-200"
              >
                <RadioGroupItem value={category} id={`category-${category}`} disabled={isLoading} />
                <Label
                  htmlFor={`category-${category}`}
                  className="cursor-pointer text-sm text-slate-700"
                >
                  {category}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FileTypesIcon />
            File types
          </div>
          <RadioGroup
            value={selectedFileType || "all"}
            onValueChange={onFileTypeChange}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2 rounded-lg border border-transparent p-1 hover:border-slate-200">
              <RadioGroupItem value="all" id="filetype-all" disabled={isLoading} />
              <Label htmlFor="filetype-all" className="cursor-pointer text-sm text-slate-700">
                All file types
              </Label>
            </div>
            {fileTypes.map((type) => (
              <div
                key={type}
                className="flex items-center space-x-2 rounded-lg border border-transparent p-1 hover:border-slate-200"
              >
                <RadioGroupItem value={type} id={`filetype-${type}`} disabled={isLoading} />
                <Label
                  htmlFor={`filetype-${type}`}
                  className="cursor-pointer text-sm text-slate-700"
                >
                  {type}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Tags className="h-4 w-4 text-shop_dark_green" />
            Tags
          </div>
          <ScrollArea className="h-48 rounded-md border border-slate-100">
            <div className="space-y-2 p-2">
              {sortedTags.length === 0 ? (
                <p className="text-sm text-slate-500">No tags available for this view.</p>
              ) : (
                sortedTags.map((tag) => {
                  const checked = selectedTags.includes(tag);
                  return (
                    <label
                      key={tag}
                      className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-slate-50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => onTagToggle(tag)}
                        disabled={isLoading}
                      />
                      <span className="text-sm text-slate-700">{tag}</span>
                    </label>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

const FileTypesIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    className="h-4 w-4 text-shop_dark_green"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 15h6" />
    <path d="M9 18h6" />
    <path d="M9 12h3" />
  </svg>
);

export default FilterPanel;
