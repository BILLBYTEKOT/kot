# Implementation Plan: Reports Page Revamp

## Overview

This implementation plan revamps the Reports & Analytics page to transform it from a simple card layout into a rich dashboard with a sticky header, horizontally-scrollable tabs, date presets driving KPI metrics, 8 KPI metric cards with trend indicators, dual-axis sales charts, payment breakdown donut charts, a top-selling items table, and a fully-featured orders table with advanced filters and pagination. The implementation uses the existing React/Tailwind/shadcn/ui stack plus recharts for charting, preserving all existing data-fetch functions and API integrations while only changing the rendering layer.

## Tasks

- [ ] 1. Add recharts dependency and install
  - Add `"recharts": "^2.12.7"` to `frontend/package.json` dependencies
  - Run `npm install` in frontend directory and verify no build errors
  - _Requirements: 1.1, 1.2_

- [ ] 2. Add UI state variables for filters and pagination
  - [ ] 2.1 Add state: `searchQuery`, `filterStatus`, `filterPayment`, `filterStaff`, `filterTable`, `ordersPage`, `ordersPageSize`, `activeTab`, `priorPeriodOrders`
    - All initialized to empty/default values per requirement
    - _Requirements: 10.2, 12.1_
  
  - [ ] 2.2 Add `fetchPriorPeriodOrders` function
    - Calculate prior period date range from current `dateRange`
    - Fetch from `/reports/export` endpoint into `priorPeriodOrders` state
    - _Requirements: 5.4_
  
  - [ ] 2.3 Add `useEffect` to call `fetchPriorPeriodOrders` when `dateRange` changes
    - _Requirements: 5.4_

- [ ] 3. Add derived data computations with useMemo
  - [ ] 3.1 Add `kpiCurrent` useMemo
    - Aggregate from `reportOrders`: totalSales, totalOrders, avgOrderValue, itemsSold, customers, discounts, taxes, netRevenue
    - _Requirements: 5.2_
  
  - [ ] 3.2 Add `kpiPrior` useMemo
    - Same aggregation over `priorPeriodOrders`
    - _Requirements: 5.4_
  
  - [ ] 3.3 Add `trendPct(current, prior)` utility function
    - Returns percentage change: `((current - prior) / prior) * 100` or 0 if prior is 0
    - _Requirements: 5.4_
  
  - [ ] 3.4 Add `salesTrendData` useMemo
    - Group `reportOrders` by calendar day into `[{ date, sales, orders }]` array
    - _Requirements: 6.2_
  
  - [ ] 3.5 Add `paymentBreakdownData` useMemo
    - Group `reportOrders` by `payment_method` normalised to Cash/UPI/Card/Online/Other
    - Sum `order.total` per group
    - _Requirements: 7.2, 7.3_
  
  - [ ] 3.6 Add `filteredOrders` useMemo
    - Filter `reportOrders` by `searchQuery`, `filterStatus`, `filterPayment`, `filterStaff`, `filterTable`
    - Case-insensitive text search on Bill #, Customer name, Order #
    - _Requirements: 10.2, 10.3_
  
  - [ ] 3.7 Add `paginatedOrders` useMemo
    - Slice `filteredOrders` to current page based on `ordersPage` and `ordersPageSize`
    - _Requirements: 12.1_
  
  - [ ] 3.8 Add `filteredTotal` useMemo
    - Sum `order.total` over all `filteredOrders` (not just current page)
    - _Requirements: 12.5_
  
  - [ ] 3.9 Add `useEffect` to reset `ordersPage` to 1 when any filter or `ordersPageSize` changes
    - _Requirements: 12.3_

- [ ] 4. Checkpoint — Verify state and data layer
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Revamp the page header
  - [ ] 5.1 Replace existing header JSX with new header row
    - Icon + "Reports & Analytics" title, subtitle text
    - Timezone selector `<select>` (default Asia/Kolkata)
    - Refresh `<Button>` with `RefreshCw` icon (calls all fetch functions)
    - Export `<Button>` (calls `handleExportCSV`)
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 5.2 Make header responsive
    - On `< sm` screens: title block stacks above action controls using `flex-col sm:flex-row`
    - No horizontal overflow
    - _Requirements: 2.4_

- [ ] 6. Revamp the tab navigation
  - [ ] 6.1 Replace `<Tabs>` with controlled version
    - Use `value={activeTab}` and `onValueChange={setActiveTab}`
    - Apply `overflow-x-auto whitespace-nowrap` styling to `<TabsList>` for horizontal scrolling
    - _Requirements: 3.1, 3.2_
  
  - [ ] 6.2 Configure tab triggers
    - 9 tabs in order: overview, sales-trends, best-sellers, stock-report, staff-performance, peak-hours, customer-balance, day-book, export
    - Apply active-tab visual styling (white background, shadow)
    - _Requirements: 3.1, 3.3, 3.4_

- [ ] 7. Build the Date Preset Bar in Overview tab
  - [ ] 7.1 Add preset buttons
    - Today, Yesterday, 7 Days, 15 Days, 30 Days, Custom Range
    - Each calls `applyPreset` with corresponding key
    - _Requirements: 4.1, 4.2_
  
  - [ ] 7.2 Add custom range date picker
    - Two `<input type="date">` fields
    - Appears when `activePreset` is 'custom'
    - Updates `dateRange` state directly
    - _Requirements: 4.4_
  
  - [ ] 7.3 Style active preset
    - Highlight active preset button with distinct style (blue/indigo background)
    - _Requirements: 4.6_
  
  - [ ] 7.4 Show comparison label
    - "Compared to: [prior start] – [prior end]" label
    - Display currently selected date range as formatted text
    - _Requirements: 4.5_

- [ ] 8. Build the 8 KPI metric cards
  - [ ] 8.1 Create card grid
    - 2-row × 4-column grid using `grid grid-cols-2 md:grid-cols-4`
    - Responsive: 2 columns on mobile
    - _Requirements: 5.1, 5.8_
  
  - [ ] 8.2 Render 8 KPI cards
    - Row 1: Total Sales, Total Orders, Avg Order Value, Items Sold
    - Row 2: Customers, Discounts, Taxes, Net Revenue
    - Each card: colored icon, metric label, formatted ₹ value (or count), trend arrow + percentage vs prior period
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 8.3 Implement trend indicators
    - Trend up → green + ArrowUp icon
    - Trend down → red + ArrowDown icon
    - _Requirements: 5.4, 5.5, 5.6_
  
  - [ ] 8.4 Handle zero/loading state
    - Default to 0 when `reportOrders` is empty
    - No runtime errors
    - _Requirements: 5.7_

- [ ] 9. Build the Sales Trend Chart
  - [ ] 9.1 Import recharts components
    - `ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer`
    - _Requirements: 6.1_
  
  - [ ] 9.2 Render chart with dual Y-axes
    - `<ResponsiveContainer width="100%" height={260}>` wrapping `<ComposedChart data={salesTrendData}>`
    - Left `<YAxis yAxisId="left">` for Sales (₹)
    - Right `<YAxis yAxisId="right" orientation="right">` for Orders count
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ] 9.3 Add data series
    - `<Line yAxisId="left">` for sales (color `#8b5cf6`)
    - `<Bar yAxisId="right">` for orders (color `#3b82f6`)
    - _Requirements: 6.3_
  
  - [ ] 9.4 Add chart controls
    - `<Tooltip>` formatter showing ₹ for sales, count for orders
    - `<Legend>` identifying series
    - `<CartesianGrid strokeDasharray="3 3">`
    - _Requirements: 6.4, 6.5_
  
  - [ ] 9.5 Handle edge cases
    - Empty data: render chart with no data lines, no errors
    - Single-point data: render without errors
    - Responsive: 100% width on `< sm`
    - _Requirements: 6.6, 6.7, 6.8_

- [ ] 10. Build the Payment Breakdown Donut Chart
  - [ ] 10.1 Import recharts components
    - `PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer`
    - _Requirements: 7.1_
  
  - [ ] 10.2 Render donut chart
    - `<ResponsiveContainer width="100%" height={260}>` wrapping `<PieChart>`
    - `<Pie data={paymentBreakdownData} innerRadius={70} outerRadius={100}>` for donut shape
    - `<Cell>` for each segment with color palette
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ] 10.3 Add centre label and legend
    - Centre-label overlay showing grand total (₹) using absolute positioning or custom label
    - `<Tooltip>` and `<Legend>` with payment method name and ₹ amount
    - _Requirements: 7.4, 7.5_
  
  - [ ] 10.4 Handle edge cases
    - Empty data: show "No data" message or empty donut, no errors
    - Single payment method: render full circle, no errors
    - _Requirements: 7.6, 7.7_

- [ ] 11. Build the Top Selling Items table
  - [ ] 11.1 Render compact table
    - Columns: #, Item, Qty Sold, Revenue
    - Populated from `bestSelling` (top 5–7 rows)
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ] 11.2 Add navigation button
    - "View All Best Sellers" button at bottom
    - Sets `activeTab` to `'best-sellers'`
    - _Requirements: 8.4_
  
  - [ ] 11.3 Handle empty state
    - Show "No data" row or skeleton when `bestSelling` is empty
    - _Requirements: 8.5_

- [ ] 12. Arrange the three-column chart layout
  - Wrap Sales Trend Chart, Payment Breakdown Chart, and Top Selling Table in grid: `grid grid-cols-1 lg:grid-cols-[50%_25%_25%]`
  - On `< lg` viewports: stack vertically (grid-cols-1)
  - _Requirements: 9.1, 9.2_

- [ ] 13. Checkpoint — Verify Overview tab rendering
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Build the Orders Table toolbar and filters
  - [ ] 14.1 Add text search input
    - Bound to `searchQuery`
    - Placeholder: "Search bill no., customer, staff…"
    - _Requirements: 10.1, 10.3_
  
  - [ ] 14.2 Add filter dropdowns
    - Four `<select>` dropdowns: All Status, All Payment Methods, All Staff, All Tables
    - Each bound to respective filter state variable
    - _Requirements: 10.1, 10.4, 10.5, 10.6, 10.7_
  
  - [ ] 14.3 Derive dropdown options dynamically
    - Use `useMemo` to extract distinct values from `reportOrders`
    - _Requirements: 10.4, 10.5, 10.6, 10.7_
  
  - [ ] 14.4 Add export buttons
    - Download icon button (calls `handleExportCSV` with filtered orders)
    - Export button
    - Placed to right of filters
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [ ] 14.5 Make toolbar responsive
    - On `< sm` viewports: wrap dropdowns in 2-column grid, no overflow
    - _Requirements: 14.5_

- [ ] 15. Build the Orders Table
  - [ ] 15.1 Render table with all columns
    - Horizontally-scrollable (`overflow-x-auto`)
    - Columns: Bill #, Date & Time, Order #, Table, Customer, Staff, Items, Subtotal, Discount, Tax, Charges, Total, Paid, Balance, Payment, Status, Actions
    - _Requirements: 11.1, 11.7_
  
  - [ ] 15.2 Render status badges
    - Status column as coloured badge using `getStatusColor`
    - _Requirements: 11.2_
  
  - [ ] 15.3 Render action buttons
    - Three icon buttons per row: Eye (opens `viewOrderModal`), Pencil (opens `editOrderModal`), Trash2/MoreVertical (opens `deleteConfirmModal`)
    - _Requirements: 11.3, 11.4, 11.5, 11.6_
  
  - [ ] 15.4 Handle loading state
    - Show loading spinner / skeleton rows while `reportOrdersLoading` is true
    - _Requirements: 16.2_
  
  - [ ] 15.5 Handle empty state
    - Show "No orders found for the selected date range" when `filteredOrders` is empty after loading
    - _Requirements: 16.3_

- [ ] 16. Build the Pagination footer
  - [ ] 16.1 Render pagination controls
    - "Showing X to Y of Z results"
    - Rows per page selector [10, 25, 50, 100]
    - Previous/next page buttons
    - Page indicator "Page X of Y"
    - _Requirements: 12.1, 12.2_
  
  - [ ] 16.2 Wire pagination state
    - Rows per page selector updates `ordersPageSize` and resets `ordersPage` to 1
    - Previous/next buttons decrement/increment `ordersPage` with boundary checks
    - _Requirements: 12.2, 12.3_
  
  - [ ] 16.3 Wire pagination controls
    - Disable previous button on page 1
    - Disable next button on last page
    - Scroll to top of table when page changes
    - _Requirements: 12.4, 12.6_
  
  - [ ] 16.4 Display filtered total
    - "Total (Filtered): ₹X" in footer showing `filteredTotal`
    - _Requirements: 12.5_

- [ ] 17. Build skeleton loading state
  - [ ] 17.1 Render initial loading skeleton
    - While `initialLoading` is true: render skeleton approximating header, tab bar, 8 card slots, chart area using `animate-pulse` divs
    - _Requirements: 16.1_
  
  - [ ] 17.2 Render table loading skeleton
    - While `reportOrdersLoading` is true: show skeleton rows inside orders table section
    - _Requirements: 16.2_

- [ ] 18. Preserve existing tab content
  - [ ] 18.1 Verify non-Overview tabs unchanged
    - Sales Trends, Best Sellers, Stock Report, Staff Performance, Peak Hours, Customer Balance, Day Book, Export tabs render same content
    - _Requirements: 15.1_
  
  - [ ] 18.2 Verify data-fetch functions preserved
    - Confirm all existing data-fetch functions called with same timing: `fetchDailyReport`, `fetchWeeklyReport`, `fetchMonthlyReport`, `fetchBestSelling`, `fetchStaffPerformance`, `fetchPeakHours`, `fetchCategoryAnalysis`, `fetchCustomerBalances`, `fetchStockReport`, `fetchStockCategories`, `fetchStockSuppliers`, `fetchForecast`, `fetchReportOrders`
    - _Requirements: 15.2_
  
  - [ ] 18.3 Verify export functions preserved
    - Confirm all existing export functions accessible: `handleExportCSV`, `handleExportExcel`, `handleExportPDF`, `handlePrintReport`, `handleExportStockReport`, `handleExportCustomerBalances`
    - _Requirements: 15.3_

- [ ] 19. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- This implementation revamps only the rendering layer of ReportsPage.js
- All existing data-fetch functions and API integrations are preserved
- recharts is the only new dependency introduced
- Test-related sub-tasks are not marked optional as this is a UI-focused feature without property-based testing requirements
- The Orders Table uses client-side filtering and pagination for performance with typical data volumes
- Responsive design ensures mobile usability with horizontal scrolling for wide tables
- Skeleton loading states prevent empty/broken UI during data loads

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9"] },
    { "id": 3, "tasks": ["5.1", "5.2", "6.1", "6.2"] },
    { "id": 4, "tasks": ["7.1", "7.2", "7.3", "7.4", "8.1", "8.2", "8.3", "8.4"] },
    { "id": 5, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5", "10.1", "10.2", "10.3", "10.4", "11.1", "11.2", "11.3"] },
    { "id": 6, "tasks": ["12"] },
    { "id": 7, "tasks": ["14.1", "14.2", "14.3", "14.4", "14.5"] },
    { "id": 8, "tasks": ["15.1", "15.2", "15.3", "15.4", "15.5"] },
    { "id": 9, "tasks": ["16.1", "16.2", "16.3", "16.4"] },
    { "id": 10, "tasks": ["17.1", "17.2"] },
    { "id": 11, "tasks": ["18.1", "18.2", "18.3"] }
  ]
}
```
