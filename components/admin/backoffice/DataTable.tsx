"use client";

import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  accessor?: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  data?: T[];
  columns?: DataTableColumn<T>[];
  loading?: boolean;
  emptyMessage?: string;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  rowKey?: (row: T, index: number) => string;
  renderActions?: (row: T) => ReactNode;
};

const renderSkeletonRow = (colCount: number, key: string | number) => (
  <TableRow key={key}>
    {Array.from({ length: colCount }).map((_, idx) => (
      <TableCell key={`${key}-${idx}`}>
        <Skeleton className="h-4 w-full max-w-[180px]" />
      </TableCell>
    ))}
  </TableRow>
);

export function DataTable<T>({
  data = [],
  columns = [],
  loading = false,
  emptyMessage,
  total,
  page = 1,
  pageSize = 20,
  onPageChange,
  rowKey,
  renderActions,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const resolvedEmptyMessage = emptyMessage ?? t("admin.dataTable.empty");
  const pageCount =
    typeof total === "number" && total > 0 && pageSize > 0
      ? Math.ceil(total / pageSize)
      : 0;

  const visiblePages = (() => {
    if (pageCount <= 1) return [1];
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(pageCount, page + 2);

    if (start > 1) pages.push(1);
    for (let idx = start; idx <= end; idx += 1) {
      pages.push(idx);
    }
    if (end < pageCount) pages.push(pageCount);
    return Array.from(new Set(pages));
  })();

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.id} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
              {renderActions && (
                <TableHead className="w-[220px] text-right">
                  {t("admin.dataTable.actions")}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: Math.max(3, Math.min(6, pageSize)) }).map((_, idx) =>
                  renderSkeletonRow(columns.length + (renderActions ? 1 : 0), idx),
                )
              : data.map((row, index) => (
                  <TableRow key={rowKey ? rowKey(row, index) : index}>
                    {columns.map((column) => (
                      <TableCell key={column.id} className={column.className}>
                        {column.accessor ? (
                          column.accessor(row)
                        ) : (
                          <Badge variant="secondary">
                            {t("admin.dataTable.emptyValue")}
                          </Badge>
                        )}
                      </TableCell>
                    ))}
                    {renderActions && (
                      <TableCell className="text-right align-middle">
                        <div className="flex flex-wrap justify-end gap-2">{renderActions(row)}</div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
            {!loading && data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (renderActions ? 1 : 0)}
                  className="text-center text-slate-500"
                >
                  {resolvedEmptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && onPageChange && (
        <div className="flex items-center justify-end">
          <Pagination className="justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(Math.max(1, page - 1));
                  }}
                />
              </PaginationItem>
              {visiblePages.map((pageNumber, index) => {
                const isEllipsis =
                  index > 0 &&
                  visiblePages[index - 1] + 1 !== pageNumber &&
                  pageNumber !== pageCount;

                if (isEllipsis) {
                  return (
                    <PaginationItem key={`ellipsis-${pageNumber}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }

                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === page}
                      onClick={(event) => {
                        event.preventDefault();
                        onPageChange(pageNumber);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(Math.min(pageCount, page + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
