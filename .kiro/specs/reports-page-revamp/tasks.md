# Implementation Plan: Reports Page Revamp

## Overview

This implementation plan revamps the Reports & Analytics page (`frontend/src/pages/ReportsPage.js`) to transform it from a simple card layout into a rich dashboard with a sticky header, horizontally-scrollable tabs, date presets driving KPI metrics, 8 KPI metric cards with trend indicators, dual-axis sales charts, payment breakdown donut charts, a top-selling items table, and a fully-featured orders table with advanced filters and pagination. The implementation uses the existing React/Tailwind/shadcn/ui stack plus recharts for charting, preserving all existing data-fetch functions and API integrations while only changing the rendering layer.

## Tasks

- [ ] 1. Add recharts dependency and verify installation
  - Add `"recharts": "^2.12.7"` to `frontend/package.json` dependencies
  - Run `npm install` in frontend directory
  - Verify no build errors by running `npm run build` or `npm start`
  - _Requirements: 1.1, 1.2_

- [ ] 2. Add new UI state variables to ReportsPage
  - [ ] 2.1 Add filter and pagination state variables
    - Add `searchQuery` (string, default "")
    - Add `filterStatus` (string, default "")
    - Add `filterPayment` (string, default "")
    - Add `filterStaff` (string, default "")
    - Add `filterTable` (string, default "")
    - Add `ordersPage` (number, default 1)
    - Add `ordersPageSize` (number, default 25)
    - Add `activeTab` (string, default "overview")
    - Add `priorPeriodOrders` (array, default [])
    - _Requirements: 10.2, 12.1_
  
  - [ ] 2.2 Implement `fetchPriorPeriodOrders` function
    - Calculate prior period date range (equal length to current `dateRange`, ending the day before current start)
    - Fetch from `/reports/export` endpoint with prior dates
    - Store result in `priorPeriodOrders` state
    - Handle errors gracefully
    - _Requirements: 5.4_
  
  - [ ] 2.3 Add useEffect to trigger prior period fetch on date change
    - Listen to `dateRange` changes
    - Call `fetchPriorPeriodOrders` whenever `dateRange` updates
    - _Requirements: 5.4_

- [ ] 3. Add derived data computations with useMemo
  - [ ] 3.1 Add `kpiCurrent` useMemo
    - Derive from `reportOrders`: totalSales (sum of order.total), totalOrders (count), avgOrderValue (totalSales/totalOrders or 0), itemsSold (sum of item.quantity across all items), customers (distinct customer_name count or order count), discounts (sum of order.discount or 0), taxes (sum of order.tax), netRevenue (totalSales - discounts - taxes)
    - Return object with all 8 KPI values
    - _Requirements: 5.2_
  
  - [ ] 3.2 Add `kpiPrior` useMemo
    - Same aggregation logic as `kpiCurrent` but over `priorPeriodOrders`
    - Return object with all 8 prior-period KPI values
    - _Requirements: 5.4_
  
  - [ ] 3.3 Add `trendPct` utility function
    - Function signature: `trendPct(current, prior)`
    - Return `((current - prior) / prior) * 100` if prior > 0, else 0
    - _Requirements: 5.4_
  
  - [ ] 3.4 Add `salesTrendData` useMemo
    - Group `reportOrders` by calendar day (date string)
    - For each day, compute: sales (sum of order.total), orders (count)
    - Return array: `[{ date, sales, orders }, ...]`
    - Sort by date ascending
    - _Requirements: 6.2_
  
  - [ ] 3.5 Add `paymentBreakdownData` useMemo
    - Group `reportOrders` by `payment_method` field
    - Normalise payment method to title-case and map to Cash/UPI/Card/Online/Other
    - For each group, sum `order.total`
    - Return array: `[{ name, value }, ...]`
    - _Requirements: 7.2, 7.3_
  
  - [ ] 3.6 Add `filteredOrders` useMemo
    - Filter `reportOrders` by `searchQuery` (case-insensitive match on Invoice # via bill_number/order_number/formatted ID, Customer name, Order technical ID)
    - Further filter by `filterStatus`, `filterPayment`, `filterStaff`, `filterTable` (empty string means no filter)
    - Return filtered array
    - _Requirements: 10.2, 10.3_
  
  - [ ] 3.7 Add `paginatedOrders` useMemo
    - Slice `filteredOrders` based on `ordersPage` and `ordersPageSize`
    - Calculate start index: `(ordersPage - 1) * ordersPageSize`
    - Return slice from start to start + ordersPageSize
    - _Requirements: 12.1_
  
  - [ ] 3.8 Add `filteredTotal` useMemo
    - Sum `order.total` across all `filteredOrders` (not just current page)
    - Return total monetary value
    - _Requirements: 12.5_
  
  - [ ] 3.9 Add useEffect to reset page on filter changes
    - Listen to changes in `searchQuery`, `filterStatus`, `filterPayment`, `filterStaff`, `filterTable`, `ordersPageSize`
    - Reset `ordersPage` to 1 whenever any of these change
    - _Requirements: 12.3_

- [ ] 4. Checkpoint — Verify state and data layer
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Revamp the page header section and implement IST timezone handling
  - [ ] 5.1 Implement IST timezone utility functions and verify backend
    - **CRITICAL**: First, verify the backend `/reports/daily` endpoint is working correctly by checking MongoDB date storage format
    - Create `getISTDate()` utility function that returns current date/time in IST (UTC+5:30) timezone
    - Create `formatISTDate(date)` utility function that converts any date to IST and formats as YYYY-MM-DD
    - Replace existing `formatLocalDate()` with `formatISTDate()` throughout the component
    - Update all date preset calculations (today, yesterday, 7 days, etc.) to use IST as reference timezone
    - Test with backend to ensure dates sent match MongoDB date format expectations
    - _Requirements: 2.2, 2.3, 2.4, 2.5_
    - _Note: If backend dates are stored with timezone info (e.g., "2024-08-31T14:30:00+05:30"), ensure frontend sends dates in compatible format_
  
  - [ ] 5.2 Replace existing header JSX
    - Create new header row with: BarChart3 icon, "Reports & Analytics" title (text-3xl font-bold), subtitle "Track sales, inventory, and staff performance"
    - Add timezone selector: `<select>` with Asia/Kolkata (IST) as default, display "IST (UTC+5:30)"
    - Add Refresh button: `<Button>` with RefreshCw icon, onClick calls all data-fetch functions
    - Add Export button: `<Button>` with Download icon, onClick calls `handleExportCSV`
    - Use Tailwind flex layout: `flex items-center justify-between`
    - _Requirements: 2.1, 2.6, 2.7, 2.8_
  
  - [ ] 5.3 Make header responsive
    - Apply `flex-col sm:flex-row` to stack on mobile, row on desktop
    - Ensure no horizontal overflow on `< 640px` viewports
    - Title block and action controls each take appropriate space
    - _Requirements: 2.9_

- [ ] 6. Revamp the tab navigation
  - [ ] 6.1 Replace uncontrolled Tabs with controlled version
    - Set `value={activeTab}` and `onValueChange={setActiveTab}` on `<Tabs>`
    - Apply `overflow-x-auto whitespace-nowrap` to `<TabsList>` for horizontal scrolling on mobile
    - Remove any hard-coded tab state
    - _Requirements: 3.1, 3.2_
  
  - [ ] 6.2 Configure all 9 tab triggers
    - Add tab triggers in order: overview, sales-trends, best-sellers, stock-report, staff-performance, peak-hours, customer-balance, day-book, export
    - Apply active-tab styling: white background, shadow when selected
    - Each trigger has label and value matching tab identifier
    - _Requirements: 3.1, 3.3, 3.4_

- [ ] 7. Build the Date Preset Bar in Overview tab with IST timezone support
  - [ ] 7.1 Add date preset buttons row with IST calculations
    - Create buttons: Today, Yesterday, 7 Days, 15 Days, 30 Days, Custom Range
    - Each button calls `applyPreset(key)` function that updates `dateRange` and `activePreset`
    - All date calculations MUST use IST timezone (getISTDate, formatISTDate utilities from task 5.1)
    - Use Tailwind: `flex gap-2 flex-wrap`
    - _Requirements: 4.1, 4.2, 2.4, 2.5_
  
  - [ ] 7.2 Add custom date range picker
    - Two `<input type="date">` fields: start date and end date
    - Conditionally render when `activePreset === 'custom'`
    - Bind to `dateRange.start_date` and `dateRange.end_date`
    - Update `dateRange` state on change
    - _Requirements: 4.4_
  
  - [ ] 7.3 Apply active preset styling
    - Highlight active preset button with `bg-blue-600 text-white` (or indigo)
    - Inactive buttons use `bg-gray-200 text-gray-700`
    - _Requirements: 4.6_
  
  - [ ] 7.4 Display comparison label
    - Show text: "Compared to: [prior start date] – [prior end date]"
    - Calculate prior dates from current `dateRange`
    - Format dates using locale date format
    - Place below preset buttons or beside custom picker
    - _Requirements: 4.5_

- [ ] 8. Build the 8 KPI metric cards
  - [ ] 8.1 Create KPI card grid layout
    - Use `grid grid-cols-2 md:grid-cols-4 gap-4`
    - Responsive: 2 columns on `< md`, 4 columns on `>= md`
    - _Requirements: 5.1, 5.8_
  
  - [ ] 8.2 Render 8 KPI cards with icons and values
    - Row 1 (md:row-start-1): Total Sales (TrendingUp icon, purple), Total Orders (ShoppingCart icon, blue), Avg Order Value (Receipt icon, green), Items Sold (Package icon, orange)
    - Row 2 (md:row-start-2): Customers (Users icon, teal), Discounts (Tag icon, pink), Taxes (FileText icon, yellow), Net Revenue (DollarSign icon, emerald)
    - Each card: icon, label, formatted value (₹ for currency, count for others), trend indicator
    - Use `kpiCurrent` for values
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ] 8.3 Implement trend indicators
    - Calculate trend %: `trendPct(kpiCurrent[metric], kpiPrior[metric])`
    - Positive trend: green text, ArrowUp icon, "+X%"
    - Negative trend: red text, ArrowDown icon, "-X%"
    - Zero/no change: gray text, "—"
    - Position trend below main value
    - _Requirements: 5.4, 5.5, 5.6_
  
  - [ ] 8.4 Handle zero and loading states
    - When `reportOrders` is empty, display 0 for all metrics without errors
    - When `reportOrdersLoading` is true, show skeleton placeholders (optional)
    - Ensure no division by zero errors in avgOrderValue calculation
    - _Requirements: 5.7_

- [ ] 9. Build the Sales Trend Chart using Recharts
  - [ ] 9.1 Import Recharts components
    - Import: `ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer` from 'recharts'
    - _Requirements: 6.1_
  
  - [ ] 9.2 Render chart with dual Y-axes
    - Wrap chart in `<ResponsiveContainer width="100%" height={260}>`
    - Use `<ComposedChart data={salesTrendData}>`
    - Add `<XAxis dataKey="date" />` for X-axis
    - Add `<YAxis yAxisId="left" label={{ value: 'Sales (₹)', angle: -90, position: 'insideLeft' }} />`
    - Add `<YAxis yAxisId="right" orientation="right" label={{ value: 'Orders', angle: 90, position: 'insideRight' }} />`
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ] 9.3 Add data series (line and bar)
    - Add `<Line yAxisId="left" type="monotone" dataKey="sales" stroke="#8b5cf6" name="Sales (₹)" />`
    - Add `<Bar yAxisId="right" dataKey="orders" fill="#3b82f6" name="Orders" />`
    - _Requirements: 6.3_
  
  - [ ] 9.4 Add chart UI controls
    - Add `<CartesianGrid strokeDasharray="3 3" />`
    - Add `<Tooltip />` with custom formatter: ₹ for sales, count for orders
    - Add `<Legend />` to identify series
    - _Requirements: 6.4, 6.5_
  
  - [ ] 9.5 Handle edge cases
    - Empty data: `salesTrendData` is [], chart renders empty axes without error
    - Single data point: chart renders single point/bar without error
    - Responsive: chart occupies 100% width on all viewports
    - _Requirements: 6.6, 6.7, 6.8_

- [ ] 10. Build the Payment Breakdown Donut Chart using Recharts
  - [ ] 10.1 Import Recharts components
    - Import: `PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer` from 'recharts'
    - _Requirements: 7.1_
  
  - [ ] 10.2 Render donut chart with colour segments
    - Wrap chart in `<ResponsiveContainer width="100%" height={260}>`
    - Use `<PieChart>`
    - Add `<Pie data={paymentBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100}>`
    - Map `<Cell key={...} fill={colors[index % colors.length]} />` for each segment
    - Define color palette: Cash (green #10b981), UPI (blue #3b82f6), Card (orange #f59e0b), Online (purple #8b5cf6), Other (gray #6b7280)
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ] 10.3 Add centre label and legend
    - Calculate grand total: sum of all paymentBreakdownData values
    - Display centre label: use custom label function or absolute-positioned div showing "₹{grandTotal}"
    - Add `<Tooltip />` showing payment method and ₹ amount
    - Add `<Legend />` with payment method names and colours
    - _Requirements: 7.4, 7.5_
  
  - [ ] 10.4 Handle edge cases
    - Empty data: `paymentBreakdownData` is [], show "No data" message or empty donut without error
    - Single payment method: render full 360° circle without error
    - _Requirements: 7.6, 7.7_

- [ ] 11. Build the Top Selling Items table
  - [ ] 11.1 Render compact table with top items
    - Use `<table>` with columns: #, Item, Qty Sold, Revenue
    - Populate from `bestSelling.slice(0, 7)` (top 5–7 items)
    - Format revenue as ₹ currency
    - Apply table styling: border, padding, hover effects
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ] 11.2 Add "View All Best Sellers" button
    - Place button below table
    - Button text: "View All Best Sellers"
    - onClick: `setActiveTab('best-sellers')`
    - _Requirements: 8.4_
  
  - [ ] 11.3 Handle empty state
    - If `bestSelling` is empty or loading, show "No data available" row or skeleton
    - Ensure no runtime errors
    - _Requirements: 8.5_

- [ ] 12. Arrange the three-column chart layout
  - Create layout wrapper: `<div className="grid grid-cols-1 lg:grid-cols-[50%_25%_25%] gap-4">`
  - Place Sales Trend Chart (column 1), Payment Breakdown Chart (column 2), Top Selling Items Table (column 3) inside wrapper
  - On `< lg` viewports: each component stacks vertically (grid-cols-1)
  - _Requirements: 9.1, 9.2_

- [ ] 13. Checkpoint — Verify Overview tab rendering
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Build the Orders Table toolbar and filter controls
  - [ ] 14.1 Add text search input
    - Create `<input type="text" placeholder="Search invoice no., customer, order ID..." value={searchQuery} onChange={...} />`
    - Bind to `searchQuery` state
    - Apply debouncing if performance needed (optional)
    - _Requirements: 10.1, 10.3, 10.4_
  
  - [ ] 14.2 Add four filter dropdown selects
    - Status dropdown: `<select value={filterStatus} onChange={...}>` with options: "All Status", then distinct status values from `reportOrders`
    - Payment Methods dropdown: "All Payment Methods", then distinct payment_method values
    - Staff dropdown: "All Staff", then distinct waiter_name values
    - Tables dropdown: "All Tables", then distinct table_number values
    - Each dropdown bound to respective filter state variable
    - _Requirements: 10.1, 10.5, 10.6, 10.7, 10.8_
  
  - [ ] 14.3 Derive dropdown options dynamically with useMemo
    - `useMemo` to extract `Array.from(new Set(reportOrders.map(o => o.status)))` for status options
    - Same for payment_method, waiter_name, table_number
    - Filter out null/undefined values
    - _Requirements: 10.5, 10.6, 10.7, 10.8_
  
  - [ ] 14.4 Add export action buttons
    - Add Download icon button: onClick calls `handleExportCSV(filteredOrders)` (pass filtered data)
    - Add Export button (same action or opens format menu)
    - Position to right of filters using flexbox: `flex justify-between items-center`
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [ ] 14.5 Make toolbar responsive
    - On `< sm` viewports: wrap filter dropdowns in 2-column grid `grid grid-cols-2 gap-2`
    - Ensure no horizontal overflow
    - Search input full-width on mobile
    - _Requirements: 14.5_

- [ ] 15. Build the Orders Table with all columns
  - [ ] 15.1 Render horizontally-scrollable table with invoice numbering
    - Wrap table in `<div className="overflow-x-auto">`
    - Columns in order: Invoice #, Date & Time, Order ID, Table, Customer, Staff, Items, Subtotal, Discount, Tax, Charges, Total, Paid, Balance, Payment, Status, Actions
    - Invoice # column: display `order.bill_number` (if exists), else `order.order_number` (if exists), else format as `YYMMDD-NNNN` from `order.id` and `order.created_at`
    - Order ID column: display first 8 characters of `order.id` in uppercase (e.g., "A3B4C5D6") for technical reference
    - Populate rows from `paginatedOrders`
    - Format currency values with ₹ symbol
    - Format date/time using locale format
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.10_
  
  - [ ] 15.2 Render status badges with color coding
    - Status column: render coloured badge using `getStatusColor(order.status)` function
    - Pending: yellow, Preparing: blue, Ready: green, Completed: gray, Cancelled: red, Credit/Due: orange
    - Use Tailwind badge classes: `px-2 py-1 rounded text-xs font-medium`
    - _Requirements: 11.5_
  
  - [ ] 15.3 Render row action buttons
    - Actions column: render three icon buttons per row
    - View (Eye icon): onClick opens `viewOrderModal(order)`
    - Edit (Pencil icon): onClick opens `editOrderModal(order)`
    - Delete/More (Trash2 or MoreVertical icon): onClick opens `deleteConfirmModal(order)`
    - Use icon buttons with hover effects
    - _Requirements: 11.6, 11.7, 11.8, 11.9_
  
  - [ ] 15.4 Handle loading state
    - If `reportOrdersLoading` is true, render skeleton rows (3–5 rows with animated pulse)
    - Skeleton rows approximate table structure
    - _Requirements: 16.2_
  
  - [ ] 15.5 Handle empty state
    - If `filteredOrders` is empty after loading completes, render "No orders found for the selected date range" message in table body
    - Center message in empty table row
    - _Requirements: 16.3_

- [ ] 16. Build the Pagination footer controls
  - [ ] 16.1 Render pagination UI elements
    - Display "Showing X to Y of Z results" label (X = start index, Y = end index, Z = total filtered count)
    - Add rows per page selector: `<select value={ordersPageSize} onChange={...}>` with options: 10, 25, 50, 100
    - Add Previous button: `<Button disabled={ordersPage === 1} onClick={...}>`
    - Add Next button: `<Button disabled={ordersPage === totalPages} onClick={...}>`
    - Display page indicator: "Page {ordersPage} of {totalPages}"
    - _Requirements: 12.1, 12.2_
  
  - [ ] 16.2 Wire pagination state handlers
    - Rows per page onChange: set `ordersPageSize` to new value, reset `ordersPage` to 1
    - Previous button onClick: decrement `ordersPage` by 1 (if > 1)
    - Next button onClick: increment `ordersPage` by 1 (if < totalPages)
    - Calculate totalPages: `Math.ceil(filteredOrders.length / ordersPageSize)`
    - _Requirements: 12.2, 12.3_
  
  - [ ] 16.3 Implement pagination control behaviors
    - Disable Previous button when `ordersPage === 1`
    - Disable Next button when `ordersPage === totalPages`
    - Scroll to top of orders table when page changes (use `tableRef.current.scrollIntoView()` or similar)
    - _Requirements: 12.4, 12.6_
  
  - [ ] 16.4 Display filtered total monetary amount
    - Show "Total (Filtered): ₹{filteredTotal}" in footer
    - Use `filteredTotal` from useMemo (sum of all filtered orders, not just current page)
    - Position prominently in footer (e.g., top-right or beside pagination)
    - _Requirements: 12.5_

- [ ] 17. Build skeleton loading states
  - [ ] 17.1 Render initial page loading skeleton
    - While `initialLoading` is true, render skeleton UI approximating: header row, tab bar, 8 card slots (pulse animation), chart area placeholder
    - Use Tailwind `animate-pulse` on skeleton divs
    - Match approximate layout of final UI
    - _Requirements: 16.1_
  
  - [ ] 17.2 Render table-specific loading skeleton
    - While `reportOrdersLoading` is true (and initial load complete), show skeleton rows inside orders table
    - Render 5–10 skeleton rows with pulse animation
    - _Requirements: 16.2_

- [ ] 18. Preserve existing tab content and functions
  - [ ] 18.1 Verify non-Overview tabs unchanged
    - Confirm Sales Trends tab content unchanged
    - Confirm Best Sellers tab content unchanged
    - Confirm Stock Report tab content unchanged
    - Confirm Staff Performance tab content unchanged
    - Confirm Peak Hours tab content unchanged
    - Confirm Customer Balance tab content unchanged
    - Confirm Day Book tab content unchanged
    - Confirm Export tab content unchanged
    - _Requirements: 15.1_
  
  - [ ] 18.2 Verify all existing data-fetch functions preserved
    - Confirm `fetchDailyReport` still called
    - Confirm `fetchWeeklyReport` still called
    - Confirm `fetchMonthlyReport` still called
    - Confirm `fetchBestSelling` still called
    - Confirm `fetchStaffPerformance` still called
    - Confirm `fetchPeakHours` still called
    - Confirm `fetchCategoryAnalysis` still called
    - Confirm `fetchCustomerBalances` still called
    - Confirm `fetchStockReport` still called
    - Confirm `fetchStockCategories` still called
    - Confirm `fetchStockSuppliers` still called
    - Confirm `fetchForecast` still called
    - Confirm `fetchReportOrders` still called with same arguments/timing
    - _Requirements: 15.2_
  
  - [ ] 18.3 Verify all existing export functions preserved
    - Confirm `handleExportCSV` accessible and functional
    - Confirm `handleExportExcel` accessible and functional
    - Confirm `handleExportPDF` accessible and functional
    - Confirm `handlePrintReport` accessible and functional
    - Confirm `handleExportStockReport` accessible and functional
    - Confirm `handleExportCustomerBalances` accessible and functional
    - _Requirements: 15.3_

- [ ] 19. Final checkpoint — Ensure all tests pass
  - Run full test suite (if available)
  - Verify no console errors in browser
  - Test responsive behavior on mobile, tablet, desktop viewports
  - Ensure all existing functionality preserved
  - Ask the user if any issues or questions arise.

## Notes

- This implementation revamps only the rendering layer of `frontend/src/pages/ReportsPage.js`
- All existing data-fetch functions and API integrations are preserved — only JSX/UI changes
- Recharts is the only new dependency introduced
- This is a UI-focused feature without property-based testing requirements, so no test sub-tasks are marked optional
- The Orders Table uses client-side filtering and pagination for performance with typical data volumes (hundreds of orders)
- Responsive design ensures mobile usability with horizontal scrolling for wide tables and column-stacking for charts/cards
- Skeleton loading states prevent empty/broken UI during data loads and provide better UX
- All existing tab content (Sales Trends, Best Sellers, Stock Report, Staff Performance, Peak Hours, Customer Balance, Day Book, Export) remains unchanged
- Color palette matches design document specifications for visual consistency
- **CRITICAL TIMEZONE FIX**: All date calculations use IST (Indian Standard Time, UTC+5:30) to ensure "Today" reflects the current day in India, preventing sales from appearing under yesterday due to timezone mismatch. The `formatLocalDate` function is replaced with `formatISTDate` that explicitly converts to IST before formatting.

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
