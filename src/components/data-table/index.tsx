import { For, Show, createSignal } from 'solid-js'
import { flexRender, createSolidTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel } from '@tanstack/solid-table'
import type { ColumnDef, ColumnFiltersState, RowSelectionState, SortingState, VisibilityState } from '@tanstack/solid-table'

type DataTableProps<T> = {
  data: T[]
  columns: ColumnDef<T, unknown>[]
  loading?: boolean
  onRowClick?: (row: T) => void
  globalFilter?: string
  onGlobalFilterChange?: (val: string) => void
  onBulkDelete?: (rows: T[]) => void
  getRowId?: (row: T, index: number) => string
}

export function DataTable<T>(props: DataTableProps<T>) {
  const [sorting, setSorting] = createSignal<SortingState>([])
  const [filters, setFilters] = createSignal<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = createSignal<RowSelectionState>({})
  const [visibility, setVisibility] = createSignal<VisibilityState>({})
  const [localGlobal, setLocalGlobal] = createSignal('')
  const [showColumns, setShowColumns] = createSignal(false)
  const globalValue = () => props.globalFilter ?? localGlobal()
  const setGlobalValue = (v: string) => props.onGlobalFilterChange ? props.onGlobalFilterChange(v) : setLocalGlobal(v)

  const selectedRows = () => table.getSelectedRowModel().rows.map((row) => row.original)
  const selectableColumn: ColumnDef<T, unknown> = {
    id: '__select',
    enableSorting: false,
    enableHiding: false,
    size: 36,
    header: ({ table }) => (
      <input
        aria-label="Pilih semua baris di halaman ini"
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        ref={(el) => { el.indeterminate = table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected() }}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
    ),
    cell: ({ row }) => (
      <input
        aria-label="Pilih baris"
        type="checkbox"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onClick={(event) => event.stopPropagation()}
        onChange={row.getToggleSelectedHandler()}
        class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
    ),
  }
  const tableColumns = (): ColumnDef<T, unknown>[] => [selectableColumn, ...props.columns]

  const table = createSolidTable({
    get data() { return props.data },
    get columns() { return tableColumns() },
    state: {
      get sorting() { return sorting() },
      get columnFilters() { return filters() },
      get rowSelection() { return rowSelection() },
      get columnVisibility() { return visibility() },
      get globalFilter() { return globalValue() },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setFilters,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setVisibility,
    onGlobalFilterChange: setGlobalValue,
    getRowId: (row, index) => props.getRowId?.(row, index) ?? String(index),
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return <div class="space-y-4 text-slate-900 dark:text-slate-100">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input value={globalValue()} onInput={(e) => setGlobalValue(e.currentTarget.value)} placeholder="Cari..." class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 sm:max-w-xs" />
      <div class="relative">
        <div class="flex items-center gap-2">
          <Show when={selectedRows().length > 0}>
            <div class="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300">
              <span>{selectedRows().length} dipilih</span>
              <Show when={props.onBulkDelete}>
                <button type="button" onClick={() => props.onBulkDelete?.(selectedRows())} class="rounded-full bg-red-600 px-2 py-0.5 text-white hover:bg-red-700">Hapus</button>
              </Show>
            </div>
          </Show>
          <button type="button" onClick={() => setShowColumns(!showColumns())} class="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">Kolom</button>
        </div>
        <Show when={showColumns()}>
          <div class="absolute right-0 z-10 mt-2 w-52 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <For each={table.getAllLeafColumns().filter((c) => c.getCanHide())}>{(column) =>
              <label class="flex items-center gap-2 px-2 py-1 text-sm">
                <input type="checkbox" checked={column.getIsVisible()} onChange={column.getToggleVisibilityHandler()} />
                <span>{String(column.columnDef.header ?? column.id)}</span>
              </label>
            }</For>
          </div>
        </Show>
      </div>
    </div>
    <div class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <table class="w-full border-collapse text-sm">
        <thead class="bg-slate-50 dark:bg-slate-900">
          <For each={table.getHeaderGroups()}>{(hg) => <tr>
            <For each={hg.headers}>{(header) => <th class="border-b border-slate-200 px-3 py-3 text-left font-medium dark:border-slate-800">
              <button type="button" class="flex items-center gap-1" onClick={header.column.getToggleSortingHandler()} disabled={!header.column.getCanSort()}>
                <Show when={!header.isPlaceholder}>{flexRender(header.column.columnDef.header, header.getContext())}</Show>
                <span>{header.column.getIsSorted() === 'asc' ? '↑' : header.column.getIsSorted() === 'desc' ? '↓' : ''}</span>
              </button>
            </th>}</For>
          </tr>}</For>
        </thead>
        <tbody>
          <Show when={!props.loading} fallback={<For each={Array.from({ length: 5 })}>{() => <tr><td colSpan={table.getVisibleLeafColumns().length} class="px-3 py-3"><div class="h-5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" /></td></tr>}</For>}>
            <Show when={table.getRowModel().rows.length > 0} fallback={<tr><td colSpan={table.getVisibleLeafColumns().length} class="px-3 py-10 text-center text-slate-500">Tidak ada data</td></tr>}>
              <For each={table.getRowModel().rows}>{(row) => <tr onClick={() => props.onRowClick?.(row.original)} class="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                <For each={row.getVisibleCells()}>{(cell) => <td class="px-3 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>}</For>
              </tr>}</For>
            </Show>
          </Show>
        </tbody>
      </table>
    </div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <select value={table.getState().pagination.pageSize} onChange={(e) => table.setPageSize(Number(e.currentTarget.value))} class="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
        <For each={[10, 25, 50]}>{(n) => <option value={n}>{n} / halaman</option>}</For>
      </select>
      <div class="flex items-center gap-3 text-sm">
        <span>Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount() || 1}</span>
        <button class="rounded-md border px-3 py-2 disabled:opacity-50 dark:border-slate-700" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Prev</button>
        <button class="rounded-md border px-3 py-2 disabled:opacity-50 dark:border-slate-700" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</button>
      </div>
    </div>
  </div>
}

export type { ColumnDef }
