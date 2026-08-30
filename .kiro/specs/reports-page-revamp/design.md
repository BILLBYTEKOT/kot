# Design Document — Reports Page Revamp

## Overview

This revamp rewrites the rendering layer of `frontend/src/pages/ReportsPage.js` to match the rich dashboard shown in the reference screenshot. All existing data-fetch functions, API calls, state variables, and export utilities are preserved verbatim; only JSX/UI is changed. Recharts is the single new library dependency.

---

## Architecture

### Component Structure (all inside ReportsPage.js)

```
ReportsPage
├── <TrialBanner />
├── <Layout>
│   ├── PageHeader           (inline — title, subtitle, timezone selector, Refresh, Export)
│   ├── HScrollableTabs      (9 tabs, horizontally scrollable on mobile)
│   │   ├── OverviewTab
│   │   │   ├── DatePresetBar
│   │   │   ├── KPICardGrid  (8 cards × 2 rows)
│   │   │   ├── ChartLayout  (3-col on desktop, stacked on mobile)
│   │   │   │   ├── SalesTrendChart   (Recharts ComposedChart)
│   │   │   │   ├── PaymentDonutChart (Recharts PieChart)
│   │   │   │   └── TopSellingTable
│   │   │   └── OrdersSection
│   │   │       ├── OrdersToolbar (search + 4 dropdowns + download + export)
│   │   │       ├── OrdersTable   (horizontally scrollable)
│   │   │       └── PaginationFooter
│   │   ├── SalesTrendsTab   (existing content, unchanged)
│   │   ├── BestSellersTab   (existing content, unchanged)
│   │   ├── StockReportTab   (existing content, unchanged)
│   │   ├── StaffPerformanceTab (existing content, unchanged)
│   │   ├── PeakHoursTab     (existing content, unchanged)
│   │   ├── CustomerBalanceTab (existing content, unchanged)
│   │   ├── DayBookTab       (existing content, unchanged)
│   │   └── ExportTab        (existing content, unchanged)
│   └── Modals (EditOrderModal, DeleteConfirm, ViewOrder, CancelConfirm)
```

### New State (added to ReportsPage)

| Variable | Type | Purpose |
|---|---|---|
| `searchQuery` | string | Text filter for orders table |
| `filterStatus` | string | Selected status filter value |
| `filterPayment` | string | Selected payment method filter |
| `filterStaff` | string | Selected staff filter |
| `filterTable` | string | Selected table filter |
| `ordersPage` | number | Current page index (1-based) |
| `ordersPageSize` | number | Rows per page (10/25/50/100) |
| `activeTab` | string | Controlled tab value |

### New Derived / Memoised Values

| Derived Value | Computation |
|---|---|
| `priorPeriodOrders` | Fetched lazily from `/reports/export` with prior-period dates (same length) |
| `kpiCurrent` | Aggregated from `reportOrders` — totalSales, totalOrders, avgOrderValue, itemsSold, customers, discounts, taxes, netRevenue |
| `kpiPrior` | Same aggregation over `priorPeriodOrders` |
| `trendPct(current, prior)` | `(current - prior) / prior * 100` — utility function |
| `salesTrendData` | `reportOrders` grouped by calendar day → `[{ date, sales, orders }]` |
| `paymentBreakdownData` | `reportOrders` grouped by `payment_method` → `[{ name, value }]` |
| `filteredOrders` | `reportOrders` filtered by search + 4 dropdowns |
| `paginatedOrders` | `filteredOrders` sliced to current page |
| `filteredTotal` | sum of `order.total` across all `filteredOrders` |

---

## Key Design Decisions

### 1. Single-file approach
All new UI stays in `ReportsPage.js`. No new files are created. This preserves the existing import structure and avoids routing changes.

### 2. Recharts responsive containers
All charts are wrapped in `<ResponsiveContainer width="100%" height={...}>` so they reflow naturally on mobile without explicit width calculations.

### 3. Client-side filtering and pagination
All filtering (search, dropdowns) and pagination is done in-memory using `useMemo`. No extra API calls are made when filters change.

### 4. Prior period calculation
A second `useEffect` runs whenever `dateRange` changes. It calculates the prior period (equal-length window ending the day before `start_date`) and fetches `priorPeriodOrders` from the same `/reports/export` endpoint. KPI trend percentages are derived by comparing the two aggregations.

### 5. Tab navigation
The existing shadcn `<Tabs>` component is used. A `scrollable-tabs` CSS class is added inline to make the `<TabsList>` horizontally scrollable on narrow viewports using `overflow-x: auto; white-space: nowrap;`.

---

## Responsive Breakpoints

| Breakpoint | KPI Grid | Chart Layout | Orders Toolbar |
|---|---|---|---|
| < 640px (mobile) | 2 columns | stacked (1 col) | 2-col wrap |
| 640–1023px (tablet) | 4 columns | stacked (1 col) | flex wrap |
| ≥ 1024px (desktop) | 4 columns | 3 columns (50/25/25%) | single row |

---

## Recharts Components Used

| Chart | Recharts Components |
|---|---|
| Sales Trend | `ComposedChart`, `Line` (sales), `Bar` (orders), `XAxis`, `YAxis` (×2), `CartesianGrid`, `Tooltip`, `Legend`, `ResponsiveContainer` |
| Payment Donut | `PieChart`, `Pie` (with `innerRadius`), `Cell`, `Tooltip`, `Legend`, `ResponsiveContainer` |

---

## Data Flow Diagram

```
dateRange (state)
    │
    ├──► fetchReportOrders() ──► reportOrders (state)
    │         │
    │         ├──► kpiCurrent (memo)
    │         ├──► salesTrendData (memo)
    │         ├──► paymentBreakdownData (memo)
    │         └──► filteredOrders (memo) ──► paginatedOrders (memo)
    │
    └──► fetchPriorPeriodOrders() ──► priorPeriodOrders (state)
              │
              └──► kpiPrior (memo) ──► trendPct values
```

---

## Color Palette

| Metric / Series | Color |
|---|---|
| Total Sales | purple / indigo |
| Total Orders | blue |
| Avg Order Value | green |
| Items Sold | orange |
| Customers | teal |
| Discounts | pink |
| Taxes | yellow |
| Net Revenue | emerald |
| Sales line (chart) | `#8b5cf6` |
| Orders bar (chart) | `#3b82f6` |
| Cash (donut) | `#10b981` |
| UPI (donut) | `#3b82f6` |
| Card (donut) | `#f59e0b` |
| Online (donut) | `#8b5cf6` |
| Other (donut) | `#6b7280` |
