# Requirements Document

## Introduction

This feature revamps the existing Reports & Analytics page (`frontend/src/pages/ReportsPage.js`) to match a rich dashboard design. The revamp replaces the current simple card layout with a full-featured analytics dashboard: a sticky header with timezone selector and export actions, horizontally-scrollable tabs, a date-preset bar that drives KPI metrics, 8 KPI metric cards with trend indicators, charts (dual-axis line chart and donut chart), a top-selling items table, and a fully-featured orders table with advanced filters, row-level actions, and pagination. Recharts is introduced as the only new dependency; all other UI is implemented with the existing Tailwind CSS, shadcn/ui, and lucide-react stack. All existing data-fetch functions and API integrations are preserved — only the rendering layer changes.

## Glossary

- **ReportsPage**: The React component at `frontend/src/pages/ReportsPage.js` that owns all reporting UI.
- **Overview Tab**: The first tab inside the Reports page, housing the date-preset bar, KPI cards, charts, top-items table, and orders table.
- **Date Preset Bar**: The row of preset buttons (Today, Yesterday, 7 Days, 15 Days, 30 Days) and a custom date-range picker that sets `dateRange` state and drives KPI metrics.
- **IST (Indian Standard Time)**: UTC+5:30 timezone used as the default for all date calculations in the Reports page to ensure consistency. Today's date is calculated in IST, not browser local time.
- **KPI Card**: A metric summary card showing a label, formatted value, trend arrow, and trend percentage vs. the prior period.
- **Sales Trend Chart**: A dual-axis Recharts `ComposedChart` (line + bar or two lines) with Sales (₹) on the left Y-axis and Orders count on the right Y-axis, plotted by day.
- **Payment Breakdown Chart**: A Recharts `PieChart` rendered as a donut, showing proportions of Cash / UPI / Card / Online / Other payment methods with a legend and centre total.
- **Top Selling Items Table**: An inline table showing rank, item name, quantity sold, and revenue for the top items in the selected range, with a "View All Best Sellers" button.
- **Orders Table**: The full data table of bills/orders in the selected date range, with search, filter dropdowns, row actions, and pagination.
- **Invoice #**: A human-readable identifier for customer-facing invoices, displayed as `bill_number` (e.g., "INV-0001234"), `order_number` (e.g., "ORD-0001234"), or formatted date-based sequence (e.g., "241222-0042" for the 42nd order on Dec 22, 2024). This is the primary identifier for tracking bills.
- **Order ID**: A shortened technical identifier (first 8 characters of the UUID in uppercase, e.g., "A3B4C5D6") for internal tracking and support/debugging purposes.
- **Trend %**: Percentage change of a metric vs. the prior period of equal length (e.g., comparing "last 7 days" to the 7 days before that).
- **Payment Breakdown Data**: Derived client-side from `reportOrders` by grouping on the `payment_method` field and summing totals.
- **Items Sold**: Derived client-side from `reportOrders` by summing `quantity` across all items in each order.
- **recharts**: The charting library to be added as a new dependency (`recharts@^2.12.7`).
- **Prior Period**: The date range immediately preceding the selected range, of equal length, used for trend % calculation.

---

## Requirements

### Requirement 1: Dependency Addition

**User Story:** As a developer, I want recharts added as a project dependency, so that I can render line charts and donut charts within the existing React/CRA build without introducing additional UI libraries.

#### Acceptance Criteria

1. THE Frontend Package SHALL list `recharts` at version `^2.12.7` (or a compatible semver range) in the `dependencies` section of `frontend/package.json`.
2. WHEN the frontend build is run after adding recharts, THE Build Tool SHALL complete successfully with no recharts-related import or module-not-found errors.

---

### Requirement 2: Page Header and Timezone Handling

**User Story:** As a restaurant manager in India, I want a clear header with contextual actions at the top of the Reports page and consistent IST timezone handling, so that I can immediately identify the page, select my timezone, refresh data, export reports without scrolling, and see today's sales accurately reflected in today's date (not yesterday due to timezone issues).

#### Acceptance Criteria

1. THE ReportsPage SHALL render a header row containing: the page title "Reports & Analytics", a subtitle, a timezone selector, a Refresh button, and an Export button.
2. THE ReportsPage SHALL use Indian Standard Time (IST, UTC+5:30) as the default timezone for all date calculations and display.
3. THE `formatLocalDate` utility function SHALL be replaced with `formatISTDate` that converts dates to IST timezone before formatting them as YYYY-MM-DD strings, ensuring consistency regardless of the user's browser timezone.
4. WHEN the "Today" preset is selected, THE ReportsPage SHALL calculate today's date in IST (not browser local time), so sales from the current IST day appear under "Today" and not shifted to yesterday.
5. WHEN date presets (Yesterday, 7 Days, 15 Days, 30 Days) are calculated, THE ReportsPage SHALL use IST as the reference timezone for all date arithmetic.
6. THE Frontend SHALL send date strings to the backend `/reports/export` endpoint in ISO format compatible with MongoDB's date storage (either "YYYY-MM-DD" or full ISO timestamp with timezone).
7. THE Implementation SHALL verify backend date comparison logic works correctly with the date format sent by the frontend, and fix backend bugs if dates are not matching correctly.
8. THE Timezone Selector SHALL default to "Asia/Kolkata" (IST) and allow users to change the display timezone if needed (future enhancement).
9. WHEN the Refresh button is clicked, THE ReportsPage SHALL reload all report data by re-invoking the existing data-fetch functions.
10. WHEN the Export button is clicked, THE ReportsPage SHALL trigger the existing CSV export function (`handleExportCSV`).
11. WHEN the viewport width is less than 640px, THE Header Row SHALL stack the title block above the action controls and both SHALL remain fully visible without horizontal overflow.

---

### Requirement 3: Horizontally-Scrollable Tab Navigation

**User Story:** As a user on a mobile device, I want the tab bar to scroll horizontally, so that all nine tabs are accessible without wrapping or truncating on small screens.

#### Acceptance Criteria

1. THE Tab Navigation SHALL render nine tabs in order: Overview, Sales Trends, Best Sellers, Stock Report, Staff Performance, Peak Hours, Customer Balance, Day Book, Export.
2. WHEN the viewport width is less than 640px, THE Tab Navigation SHALL be horizontally scrollable and no tab label SHALL wrap to a second line.
3. WHEN a tab is selected, THE Tab Navigation SHALL visually highlight the active tab with a white background and a shadow indicator.
4. WHEN the viewport width is 640px or wider, THE Tab Navigation SHALL display all tab labels in full without scrolling.

---

### Requirement 4: Date Preset Bar

**User Story:** As a restaurant manager, I want a row of date-preset buttons and a custom date picker inside the Overview tab, so that I can quickly switch the reporting period and see all KPI metrics update accordingly.

#### Acceptance Criteria

1. THE Date Preset Bar SHALL display the following preset buttons: Today, Yesterday, 7 Days, 15 Days, 30 Days, and a Custom Range option with a date-range picker.
2. WHEN a preset button is clicked, THE ReportsPage SHALL update `dateRange` state to the corresponding date range and set `activePreset` to identify the selected preset.
3. WHEN `dateRange` state changes, THE ReportsPage SHALL re-fetch `reportOrders` via the existing `fetchReportOrders` function so that KPI metrics, charts, and the orders table all reflect the new range.
4. WHEN the Custom Range option is used and the user selects start and end dates, THE ReportsPage SHALL update `dateRange` state with those dates and set `activePreset` to `'custom'`.
5. THE Date Preset Bar SHALL display a "Compared to" label indicating the prior period dates that are used for trend % calculations.
6. WHEN a preset button represents the active preset, THE Date Preset Bar SHALL visually distinguish that button from inactive presets.

---

### Requirement 5: KPI Metric Cards

**User Story:** As a restaurant manager, I want eight KPI metric cards that show current-period values and trend arrows, so that I can instantly assess business performance relative to the prior period.

#### Acceptance Criteria

1. THE Overview Tab SHALL render eight KPI cards arranged in two rows of four columns (desktop) and two columns (mobile): Total Sales, Total Orders, Average Order Value, Items Sold (row 1); Customers, Discounts, Taxes, Net Revenue (row 2).
2. WHEN `reportOrders` is populated, THE KPI Cards SHALL derive their values from `reportOrders` as follows:
   - **Total Sales**: sum of `order.total` for all orders in range.
   - **Total Orders**: count of orders in range.
   - **Average Order Value**: Total Sales ÷ Total Orders (or 0 if no orders).
   - **Items Sold**: sum of `item.quantity` across all items in all orders in range.
   - **Customers**: count of distinct non-empty `customer_name` values (or total orders if names unavailable).
   - **Discounts**: sum of `order.discount` (or 0 if field absent).
   - **Taxes**: sum of `order.tax` for all orders in range.
   - **Net Revenue**: Total Sales minus Discounts minus Taxes.
3. THE KPI Cards SHALL display a colored icon appropriate to the metric (e.g., `TrendingUp` for Sales, `ShoppingCart` for Orders).
4. THE KPI Cards SHALL display a trend percentage and an up/down arrow comparing the current period value to the prior period value.
5. WHEN the trend is positive, THE Trend Indicator SHALL render in green with an upward arrow icon.
6. WHEN the trend is negative, THE Trend Indicator SHALL render in red with a downward arrow icon.
7. WHEN `reportOrders` is empty or loading, THE KPI Cards SHALL render with zero/placeholder values without throwing a runtime error.
8. WHEN the viewport is less than 640px wide, THE KPI Card Grid SHALL display two columns.

---

### Requirement 6: Sales Trend Chart

**User Story:** As a restaurant manager, I want a dual-axis line chart showing daily sales and order counts for the selected period, so that I can spot sales patterns and volume trends together.

#### Acceptance Criteria

1. THE Overview Tab SHALL render a "Sales Trend (by Day)" chart using the Recharts `ComposedChart` component (or equivalent Recharts composite).
2. THE Sales Trend Chart SHALL aggregate `reportOrders` by calendar day, producing a series of `{ date, sales, orders }` data points.
3. THE Sales Trend Chart SHALL render Sales (₹) as a line plotted against the left Y-axis, and Orders count as a line or bar plotted against the right Y-axis.
4. THE Sales Trend Chart SHALL include a `Tooltip` showing date, sales amount, and order count on hover.
5. THE Sales Trend Chart SHALL include a `Legend` identifying the Sales and Orders series.
6. WHEN `reportOrders` contains data for only one day, THE Sales Trend Chart SHALL still render without error (single data point).
7. WHEN `reportOrders` is empty, THE Sales Trend Chart SHALL render a chart with no data lines (empty axes) without throwing a runtime error.
8. WHEN the viewport is less than 640px wide, THE Sales Trend Chart SHALL occupy 100% of the available width through responsive Recharts containers.

---

### Requirement 7: Payment Breakdown Donut Chart

**User Story:** As a restaurant manager, I want a donut chart showing the breakdown of payment methods, so that I can understand which payment types customers prefer.

#### Acceptance Criteria

1. THE Overview Tab SHALL render a "Payment Breakdown" donut chart using the Recharts `PieChart` component with `innerRadius` set to create a donut shape.
2. THE Payment Breakdown Chart SHALL derive its data client-side from `reportOrders` by grouping on `order.payment_method` (normalised to title-case) and summing `order.total` per group.
3. THE Payment Breakdown Chart SHALL categorise payment methods into: Cash, UPI, Card, Online, and Other (any unrecognised values map to "Other").
4. THE Payment Breakdown Chart SHALL display a `Legend` listing each payment method with its colour swatch.
5. THE Payment Breakdown Chart SHALL render the grand total amount (₹) in the centre of the donut.
6. WHEN all orders share one payment method, THE Payment Breakdown Chart SHALL render a full circle for that single segment without error.
7. WHEN `reportOrders` is empty, THE Payment Breakdown Chart SHALL render an empty donut or a "No data" message without throwing a runtime error.

---

### Requirement 8: Top Selling Items Table

**User Story:** As a restaurant manager, I want a compact "Top Selling Items" table alongside the charts, so that I can see the best performers at a glance without switching tabs.

#### Acceptance Criteria

1. THE Overview Tab SHALL render a "Top Selling Items" table with columns: Rank (#), Item Name, Qty Sold, Revenue.
2. THE Top Selling Items Table SHALL be populated from the existing `bestSelling` state (already fetched).
3. THE Top Selling Items Table SHALL display a maximum of 5–7 items.
4. THE Top Selling Items Table SHALL include a "View All Best Sellers" button that switches the active tab to the "Best Sellers" tab.
5. WHEN `bestSelling` is empty or loading, THE Top Selling Items Table SHALL display a loading skeleton or "No data" row without a runtime error.

---

### Requirement 9: Three-Column Chart Layout

**User Story:** As a restaurant manager using a desktop browser, I want the Sales Trend chart, Payment Breakdown donut, and Top Selling Items table to appear side by side, so that I can view all three at once without scrolling.

#### Acceptance Criteria

1. WHEN the viewport is 1024px or wider, THE Chart Layout Section SHALL display the Sales Trend Chart, Payment Breakdown Chart, and Top Selling Items Table in a three-column layout (approximately 50% / 25% / 25% widths).
2. WHEN the viewport is less than 1024px, THE Chart Layout Section SHALL stack all three components vertically, each occupying full width.

---

### Requirement 10: Orders Table with Advanced Filters

**User Story:** As a restaurant manager, I want to filter the orders table by status, payment method, staff, and table, so that I can quickly find specific bills within the selected date range.

#### Acceptance Criteria

1. THE Orders Table Section SHALL render a filter toolbar containing: a text search input, an "All Status" dropdown, an "All Payment Methods" dropdown, an "All Staff" dropdown, and an "All Tables" dropdown.
2. WHEN a value is selected in any filter dropdown, THE ReportsPage SHALL filter `reportOrders` in-memory (client-side) and update the displayed rows without re-fetching from the API.
3. WHEN text is entered in the search input, THE ReportsPage SHALL filter rows where Invoice # (bill_number, order_number, or formatted ID), Customer name, or Order technical ID contains the search text (case-insensitive).
4. THE Search Input SHALL have placeholder text "Search invoice no., customer, order ID..." to guide users on searchable fields.
5. THE Status Dropdown SHALL derive its options from the distinct `status` values present in `reportOrders`.
6. THE Payment Methods Dropdown SHALL derive its options from the distinct `payment_method` values present in `reportOrders`.
7. THE Staff Dropdown SHALL derive its options from the distinct `waiter_name` values present in `reportOrders`.
8. THE Tables Dropdown SHALL derive its options from the distinct `table_number` values present in `reportOrders`.
9. WHEN all filters are set to "All …", THE Orders Table SHALL display all orders in the selected date range with no filtering applied.

---

### Requirement 11: Orders Table Columns and Row Actions

**User Story:** As a restaurant manager, I want the orders table to show complete bill details with clear invoice numbers and provide quick row-level actions, so that I can review, edit, or take action on any order without leaving the page.

#### Acceptance Criteria

1. THE Orders Table SHALL display the following columns for each order: Invoice #, Date & Time, Order ID, Table, Customer, Staff, Items (item count or summary), Subtotal, Discount, Tax, Charges, Total, Paid, Balance, Payment Method, Status (coloured badge), Actions.
2. THE Invoice # Column SHALL display a human-readable invoice number in the format:
   - IF `order.bill_number` exists: display `order.bill_number` (e.g., "INV-0001234")
   - ELSE IF `order.order_number` exists: display `order.order_number` formatted with prefix (e.g., "ORD-0001234")
   - ELSE: display a formatted ID using date-based sequence (e.g., "241222-0042" for 42nd order on Dec 22, 2024)
3. THE Order ID Column SHALL display a shortened technical identifier for support/debugging purposes:
   - Display the first 8 characters of `order.id` in uppercase (e.g., "A3B4C5D6")
   - This provides traceability to the database record without cluttering the UI
4. THE Invoice # SHALL be prominently displayed as the primary identifier (bold, colored) for easy invoice tracking.
5. THE Status Badge SHALL use colour coding consistent with the existing `getStatusColor` function (pending = yellow, preparing = blue, ready = green, completed = grey, cancelled = red, credit/due = orange).
6. THE Actions Column SHALL provide three icon buttons per row: View (eye icon), Edit (pencil icon), and a More/Delete action.
7. WHEN the View action is clicked, THE ReportsPage SHALL open the existing view-order modal for that order.
8. WHEN the Edit action is clicked, THE ReportsPage SHALL open the existing `EditOrderModal` for that order.
9. WHEN the Delete/More action is triggered, THE ReportsPage SHALL open the existing delete-confirm modal for that order.
10. THE Orders Table SHALL be horizontally scrollable on viewports narrower than 1024px so all columns remain accessible.

---

### Requirement 12: Orders Table Pagination

**User Story:** As a restaurant manager, I want paginated orders with a rows-per-page selector and a total filtered amount, so that I can navigate large result sets efficiently and see the financial summary at a glance.

#### Acceptance Criteria

1. THE Orders Table SHALL implement client-side pagination, splitting filtered `reportOrders` into pages.
2. THE Pagination Controls SHALL include: a "Rows per page" selector with options [10, 25, 50, 100], previous-page and next-page buttons, and a current-page indicator showing "Page X of Y".
3. WHEN the rows-per-page value changes, THE ReportsPage SHALL reset to page 1 and re-slice the filtered results accordingly.
4. WHEN the active page changes, THE Orders Table SHALL scroll to the top of the table.
5. THE Pagination Footer SHALL display the total monetary amount (`order.total` sum) of all currently filtered orders (not just the current page).
6. WHEN the filtered result set is empty, THE Pagination Controls SHALL show "Page 0 of 0" and the previous/next buttons SHALL be disabled.

---

### Requirement 13: Download and Export Controls in Orders Table

**User Story:** As a restaurant manager, I want Download and Export buttons above the orders table, so that I can quickly save the current filtered result set without navigating to a separate export section.

#### Acceptance Criteria

1. THE Orders Table Toolbar SHALL include a Download icon button and an Export button placed to the right of the filter controls.
2. WHEN the Download button is clicked, THE ReportsPage SHALL export the currently-filtered `reportOrders` (respecting active filter state) to a CSV file using the existing export logic.
3. WHEN the Export button is clicked, THE ReportsPage SHALL export the currently-filtered `reportOrders` to CSV (same behaviour as the Download button for the MVP, or open an export-format menu).

---

### Requirement 14: Responsive Layout — Charts and Cards

**User Story:** As a restaurant manager using a mobile device, I want the KPI cards, charts, and orders table to reflow into a single-column layout, so that all data is readable without zooming.

#### Acceptance Criteria

1. WHEN the viewport is less than 640px, THE KPI Card Grid SHALL display two columns (4 cards per row becomes 2 cards per row).
2. WHEN the viewport is less than 1024px, THE Sales Trend Chart and Payment Breakdown Chart SHALL each be full-width, stacked vertically.
3. WHEN the viewport is less than 1024px, THE Top Selling Items Table SHALL be full-width, below the charts.
4. THE Orders Table SHALL be horizontally scrollable at all viewport widths to preserve all columns.
5. WHEN the viewport is less than 640px, THE Orders Table Toolbar filter dropdowns SHALL be arranged in a two-column grid or wrapping flex row, not overflow the screen.

---

### Requirement 15: Preserve Existing Tab Content

**User Story:** As a restaurant manager, I want all non-Overview tabs (Sales Trends, Best Sellers, Stock Report, Staff Performance, Peak Hours, Customer Balance, Day Book, Export) to retain their existing content and functionality, so that no existing features are broken by the revamp.

#### Acceptance Criteria

1. THE Sales Trends Tab, Best Sellers Tab, Stock Report Tab, Staff Performance Tab, Peak Hours Tab, Customer Balance Tab, Day Book Tab, and Export Tab SHALL each continue to render the same content they render in the current implementation after the revamp.
2. THE All Existing Data-Fetch Functions (fetchDailyReport, fetchWeeklyReport, fetchMonthlyReport, fetchBestSelling, fetchStaffPerformance, fetchPeakHours, fetchCategoryAnalysis, fetchCustomerBalances, fetchStockReport, fetchStockCategories, fetchStockSuppliers, fetchForecast, fetchReportOrders) SHALL be preserved and called with the same arguments and timing as in the current implementation.
3. THE All Existing Export Functions (handleExportCSV, handleExportExcel, handleExportPDF, handlePrintReport, handleExportStockReport, handleExportCustomerBalances) SHALL be preserved and callable from the UI.

---

### Requirement 16: Loading and Error States

**User Story:** As a user, I want to see a skeleton loader while data is loading and an informative message when data is unavailable, so that the page never appears broken or empty.

#### Acceptance Criteria

1. WHILE `initialLoading` is true, THE ReportsPage SHALL render a skeleton placeholder that matches the approximate shape of the dashboard (header, tab bar, card grid, chart area).
2. WHILE `reportOrdersLoading` is true, THE Orders Table Section SHALL display a loading indicator in place of the table rows.
3. IF `reportOrders` is empty after loading, THEN THE Orders Table Section SHALL display a "No orders found for the selected date range" message.
4. IF `reportOrders` is empty after loading, THEN THE KPI Cards SHALL render zero values without any JavaScript runtime error.
5. IF `reportOrders` is empty after loading, THEN THE Sales Trend Chart and Payment Breakdown Chart SHALL render empty states without any JavaScript runtime error.
