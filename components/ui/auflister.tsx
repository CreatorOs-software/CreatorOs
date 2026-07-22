"use client";

import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  type ColumnDef,
  type SortingState,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedHeight } from "@/components/ui/animated-height";

interface AuflisterProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  emptyText: string;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  /** Controls rendered left of the filter bar (segmented control, …) */
  filterLeft?: ReactNode;
  /** Controls rendered right of the filter bar (action buttons, …) */
  filterRight?: ReactNode;
  /** Show built-in search input in the filter bar */
  searchPlaceholder?: string;
  /** Content rendered inside the Filter popover button */
  filterContent?: ReactNode;
  /** Badge count on the Filter button when filters are active */
  activeFilterCount?: number;
  /** Show rows-per-page select + navigation buttons below the table */
  pagination?: boolean;
}

export function Auflister<T>({
  data,
  columns,
  emptyText,
  onRowClick,
  onEdit,
  onDelete,
  filterLeft,
  filterRight,
  searchPlaceholder,
  filterContent,
  activeFilterCount = 0,
  pagination: showPagination = false,
}: AuflisterProps<T>) {
  "use no memo"; // prevents React Compiler from memoizing useReactTable (returns unstable functions)
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const actionsColumn: ColumnDef<T> | null =
    onEdit || onDelete
      ? {
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <div
              className="flex items-center justify-end gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(row.original)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(row.original)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ),
          size: 72,
          enableSorting: false,
        }
      : null;

  const allColumns = actionsColumn ? [...columns, actionsColumn] : columns;

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(showPagination && {
      getPaginationRowModel: getPaginationRowModel(),
      onPaginationChange: setPaginationState,
    }),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    enableSortingRemoval: false,
    state: {
      sorting,
      globalFilter,
      ...(showPagination && { pagination: paginationState }),
    },
  });

  const hasFilterBar =
    filterLeft != null ||
    filterRight != null ||
    searchPlaceholder != null ||
    filterContent != null;

  return (
    <AnimatedHeight>
      <div className="flex flex-col gap-3">
        {/* ── Filter bar ──────────────────────────────────────────────── */}
        {hasFilterBar && (
          <div className="flex items-center gap-2">
            {/* Left group: segment control + search + filter */}
            {filterLeft && (
              <div className="flex items-center gap-2">{filterLeft}</div>
            )}
            {searchPlaceholder != null && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-8 pl-8 pr-3 text-sm w-44"
                />
              </div>
            )}
            {filterContent != null && (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                    />
                  }
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-accent text-background text-[9px] font-medium">
                      {activeFilterCount}
                    </span>
                  )}
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56">
                  {filterContent}
                </PopoverContent>
              </Popover>
            )}
            {/* Right group: action buttons */}
            {filterRight && (
              <div className="flex items-center gap-2 ml-auto">
                {filterRight}
              </div>
            )}
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────────────── */}
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            {emptyText}
          </p>
        ) : (
          <div className="overflow-auto rounded-xl">
            <Table className="table-fixed">
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        style={{ width: `${header.getSize()}px` }}
                        className="sticky top-0 z-10 bg-card h-9 text-[11px] font-semibold uppercase tracking-wider"
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <div
                            className="flex items-center gap-1 cursor-pointer select-none"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {{
                              asc: <ChevronUp className="w-3 h-3 opacity-60" />,
                              desc: (
                                <ChevronDown className="w-3 h-3 opacity-60" />
                              ),
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={onRowClick ? "cursor-pointer" : undefined}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────────── */}
        {showPagination && data.length > 0 && (
          <div className="flex items-center justify-between gap-4 pt-1">
            {/* Rows per page */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Zeilen pro Seite
              </span>
              <Select
                value={table.getState().pagination.pageSize.toString()}
                onValueChange={(v) => {
                  table.setPageSize(Number(v));
                }}
              >
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((size) => (
                    <SelectItem
                      key={size}
                      value={size.toString()}
                      className="text-xs"
                    >
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page info */}
            <p className="grow text-right text-xs text-muted-foreground tabular-nums">
              <span className="text-foreground">
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}
                –
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getRowCount(),
                )}
              </span>{" "}
              von <span className="text-foreground">{table.getRowCount()}</span>
            </p>

            {/* Nav buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => table.firstPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Erste Seite"
              >
                <ChevronFirst className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Vorherige Seite"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Nächste Seite"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => table.lastPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Letzte Seite"
              >
                <ChevronLast className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AnimatedHeight>
  );
}
