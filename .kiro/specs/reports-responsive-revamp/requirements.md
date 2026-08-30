# Requirements Document

## Introduction

The Reports & Analytics page (`ReportsPage.js`) of BillByteKOT is a data-heavy dashboard that currently works well on desktop but lacks proper responsiveness for mobile and tablet viewports. The revamp must preserve all existing functionality while making every visual layer — the page header, tab navigation, date-range controls, KPI summary cards, charts section, the orders/bills data table, and all sub-tabs — fully responsive across three breakpoints: mobile (< 640 px), tablet (640 px – 1023 px), and desktop (≥ 1024 px).

This is a purely front-end, layout and styling concern. No API endpoints or data models change.

## Glossary

- **Reports_Page**: The React component `ReportsPage` rendered at the `/reports` route.
- **Page_Header**: The top bar containing the "Reports & Analytics" title, timezone selector, Refresh button, and Export button.
- **Tab_Bar**: The horizontal `<TabsList>` containing the nine tab triggers: Overview, Sales Trends, Best Sellers, Stock Report, Staff Performance, Peak Hours, Customer Balance, Day Book, Export.
- **Date_Filter_Bar**: The row of preset-range buttons (Today, Yesterday, 7 Days, 15 Days, 30 Days, Custom Range) and the date-picker inputs.
- **KPI_Card**: One of the eight summary metric cards (Total Sales, Total Orders, Average Order Value, Items Sold, Customers, Discounts, Taxes, Net Revenue), each showing a value and a period-comparison indicator.
- **KPI_Grid**: The container that lays out all eight KPI_Cards.
- **Chart_Section**: The area containing the Sales Trend line chart, Payment Breakdown donut chart, and Top Selling Items table.
- **Bills_Table**: The full data table at the bottom of the Overview tab, showing bill/order rows with columns: Bill#, Date & Time, Order#, Table, Customer, Staff, Items, Subtotal, Discount, Tax, Charges, Total, Paid, Balance, Payment, Status, Actions.
- **Mobile_Breakpoint**: Viewport width less than 640 px.
- **Tablet_Breakpoint**: Viewport width between 640 px (inclusive) and 1023 px (inclusive).
- **Desktop_Breakpoint**: Viewport width 1024 px and above.
- **Touch_Target**: An interactive element that must meet the minimum 44 × 44 px tap area requirement.
- **Overflow_Scroll_Container**: A wrapper that hides horizontal overflow on the page level but allows horizontal scrolling within the element itself (e.g., the Tab_Bar on mobile, the Bills_Table on narrow screens).
- **Card_Row_Drawer**: A mobile-friendly alternate representation of a Bills_Table row, displayed as a stacked card instead of a table row when the viewport is at Mobile_Breakpoint.
- **Layout**: The surrounding shell component (`Layout.js`) that includes the sidebar navigation.

## Requirements

---

### Requirement 1: Page Header Responsiveness

**User Story:** As a restaurant manager using a mobile phone, I want the page header to reflow cleanly so that the title and action buttons are accessible without horizontal scrolling.

#### Acceptance Criteria

1. WHILE the viewport is at Mobile_Breakpoint, THE Page_Header SHALL stack the title block above the action controls in a single column.
2. WHILE the viewport is at Tablet_Breakpoint or Desktop_Breakpoint, THE Page_Header SHALL display the title block and action controls side by side on one row.
3. THE Page_Header SHALL render the "Reports & Analytics" heading at a minimum font-size of 1.25rem on Mobile_Breakpoint and at a minimum font-size of 1.75rem on Tablet_Breakpoint and above.
4. WHILE the viewport is at Mobile_Breakpoint, THE Reports_Page SHALL ensure the Refresh button and Export button are each at least 44 px tall (Touch_Target compliant).
5. WHILE the viewport is at Mobile_Breakpoint, the timezone selector in THE Page_Header SHALL occupy the full available width of its container.
6. WHEN the Export button is tapped on any viewport size, THE Reports_Page SHALL trigger the same CSV export behavior as the existing desktop implementation.

---

### Requirement 2: Tab Bar Responsiveness

**User Story:** As a user on a phone or tablet, I want to swipe or scroll through all nine analytics tabs without any tab label being clipped or hidden.

#### Acceptance Criteria

1. THE Tab_Bar SHALL be contained in an Overflow_Scroll_Container that scrolls horizontally when tab labels exceed the viewport width.
2. THE Tab_Bar SHALL NOT wrap tab triggers onto a second line at any viewport size.
3. WHILE the viewport is at Mobile_Breakpoint, each tab trigger in THE Tab_Bar SHALL display an abbreviated label of no more than 10 characters.
4. WHILE the viewport is at Tablet_Breakpoint or Desktop_Breakpoint, each tab trigger in THE Tab_Bar SHALL display its full label.
5. THE Tab_Bar SHALL hide the horizontal scrollbar visually while remaining scrollable (using `scrollbar-width: none` and `-webkit-scrollbar` suppression).
6. WHEN a tab is marked active, THE Tab_Bar SHALL scroll that tab trigger into the visible area of the Overflow_Scroll_Container automatically.
7. THE Tab_Bar SHALL remain sticky at the top of the scrollable content area so that it does not scroll out of view while the user reads tab content.

---

### Requirement 3: Date Filter Bar Responsiveness

**User Story:** As a manager on a tablet or phone, I want the date range presets and custom date inputs to be easy to tap and clearly laid out.

#### Acceptance Criteria

1. WHILE the viewport is at Mobile_Breakpoint, THE Date_Filter_Bar SHALL display the preset buttons in a two-column grid instead of a single horizontal row.
2. WHILE the viewport is at Tablet_Breakpoint or Desktop_Breakpoint, THE Date_Filter_Bar SHALL display the preset buttons in a single horizontal row with wrapping permitted.
3. THE Date_Filter_Bar SHALL render each preset button with a minimum height of 44 px on all viewport sizes (Touch_Target compliant).
4. WHILE the viewport is at Mobile_Breakpoint, THE Date_Filter_Bar SHALL stack the start-date input, end-date input, and the "Selected Total" summary panel into a single column.
5. WHILE the viewport is at Tablet_Breakpoint or Desktop_Breakpoint, THE Date_Filter_Bar SHALL display the start-date input, end-date input, and "Selected Total" panel in a three-column row.
6. WHEN a preset button is selected, THE Date_Filter_Bar SHALL visually highlight the active preset with a distinct border and background color consistent with the existing violet design system.

---

### Requirement 4: KPI Card Grid Responsiveness

**User Story:** As a manager on any device, I want to see the KPI summary cards arranged in a readable grid that fits the screen without text truncation.

#### Acceptance Criteria

1. WHILE the viewport is at Mobile_Breakpoint, THE KPI_Grid SHALL use a 2-column layout so that no KPI_Card is wider than 50 % of the viewport.
2. WHILE the viewport is at Tablet_Breakpoint, THE KPI_Grid SHALL use a 2-column or 4-column layout based on available width.
3. WHILE the viewport is at Desktop_Breakpoint, THE KPI_Grid SHALL use a 4-column layout.
4. THE KPI_Card SHALL NOT truncate the metric label or the period-comparison indicator on Mobile_Breakpoint.
5. WHEN a KPI value exceeds 8 digits (e.g., ₹1,23,45,678), THE KPI_Card SHALL scale the font size down using `clamp()` or equivalent so that the value remains fully visible within the card.
6. THE KPI_Card SHALL render with equal height within each row of THE KPI_Grid regardless of content length.

---

### Requirement 5: Chart Section Responsiveness

**User Story:** As a user on a phone, I want to see the sales trend chart, payment breakdown chart, and top items table without horizontal scrolling and with sufficient detail to be useful.

#### Acceptance Criteria

1. WHILE the viewport is at Mobile_Breakpoint, THE Chart_Section SHALL stack the Sales Trend chart, Payment Breakdown chart, and Top Selling Items table in a single column.
2. WHILE the viewport is at Tablet_Breakpoint, THE Chart_Section SHALL display the Sales Trend chart at full width and place the Payment Breakdown chart and Top Selling Items table side by side below it.
3. WHILE the viewport is at Desktop_Breakpoint, THE Chart_Section SHALL display the Sales Trend chart, Payment Breakdown chart, and Top Selling Items table in the three-column desktop layout from the reference screenshot.
4. THE Sales Trend chart container SHALL have a minimum height of 200 px on Mobile_Breakpoint and 260 px on Tablet_Breakpoint and above.
5. WHEN the viewport width prevents a chart legend from fitting on one line, THE Chart_Section legend SHALL wrap onto multiple lines rather than overflow its container.
6. THE Top Selling Items table inside THE Chart_Section SHALL truncate item names longer than 24 characters with an ellipsis on Mobile_Breakpoint to prevent horizontal overflow.

---

### Requirement 6: Bills / Orders Table Responsiveness

**User Story:** As a manager reviewing individual orders on a phone, I want to see order data in a readable format without having to scroll the full 17-column table horizontally.

#### Acceptance Criteria

1. WHILE the viewport is at Mobile_Breakpoint, THE Bills_Table SHALL render each order as a Card_Row_Drawer stacked card that shows: Bill#, Date & Time, Total, Paid, Balance, Status, and an Actions menu — hiding the remaining columns.
2. WHILE the viewport is at Tablet_Breakpoint, THE Bills_Table SHALL render as a horizontally scrollable table inside an Overflow_Scroll_Container showing at minimum the columns: Bill#, Date & Time, Table, Total, Payment, Status, and Actions.
3. WHILE the viewport is at Desktop_Breakpoint, THE Bills_Table SHALL render all 17 columns in the full horizontal table as per the reference design.
4. THE Bills_Table header row SHALL remain sticky (frozen) at the top of the Overflow_Scroll_Container so that it does not scroll out of view when the user scrolls the table body vertically.
5. WHEN a Card_Row_Drawer is displayed, THE Bills_Table SHALL provide a "View Details" button within each card that expands or navigates to the full order detail.
6. THE Bills_Table filter controls (search input, status, payment method, staff, tables dropdowns) SHALL reflow into a stacked layout at Mobile_Breakpoint with each control occupying full width.
7. THE Bills_Table SHALL display a row count and pagination control that remains accessible at all viewport sizes.

---

### Requirement 7: Typography and Spacing Scale

**User Story:** As a developer, I want all typography and spacing in the Reports page to use a consistent responsive scale so that the page looks polished across all breakpoints.

#### Acceptance Criteria

1. THE Reports_Page SHALL use a fluid heading size via `clamp()` for the main "Reports & Analytics" h1 so that it scales continuously between 1.25rem on a 320 px viewport and 2.25rem on a 1440 px viewport.
2. THE Reports_Page SHALL use a minimum body font-size of 0.875rem (14 px) on all viewport sizes to maintain readability.
3. WHILE the viewport is at Mobile_Breakpoint, THE Reports_Page SHALL reduce padding/margin of cards to a minimum of 0.75rem (12 px) on all sides.
4. WHILE the viewport is at Desktop_Breakpoint, THE Reports_Page SHALL use padding/margin of at least 1.25rem (20 px) for cards.
5. THE Reports_Page SHALL NOT use fixed pixel widths on any container or component that could cause horizontal overflow at Mobile_Breakpoint or Tablet_Breakpoint.

---

### Requirement 8: Touch Interaction and Accessibility

**User Story:** As a restaurant manager using a touchscreen device, I want all interactive elements to be large enough to tap reliably and the page to be fully navigable by keyboard and screen reader.

#### Acceptance Criteria

1. THE Reports_Page SHALL ensure every interactive element (buttons, tabs, filter dropdowns, date inputs, table action icons) has a minimum Touch_Target of 44 × 44 px on Mobile_Breakpoint and Tablet_Breakpoint.
2. THE Reports_Page SHALL provide visible focus indicators on all interactive elements for keyboard users, using the existing `outline: 2px solid #7c3aed` focus style.
3. WHEN a touch user swipes horizontally on the Tab_Bar, THE Tab_Bar SHALL respond to native touch scroll without triggering page-level navigation or any unintended side effects.
4. THE KPI_Card components SHALL be announced correctly by screen readers, with each card's label and value exposed as a labelled group.
5. THE Bills_Table SHALL provide ARIA attributes (`role="table"`, `scope="col"` on headers) on both the full-table and Card_Row_Drawer representations so that screen readers can parse the data.
6. IF the user's device indicates `prefers-reduced-motion`, THEN THE Reports_Page SHALL disable all CSS transitions and animations on the page without affecting functionality.

---

### Requirement 9: Sub-Tab Content Responsiveness

**User Story:** As a user, I want each of the nine sub-tabs (Overview, Sales Trends, Best Sellers, Stock Report, Staff Performance, Peak Hours, Customer Balance, Day Book, Export) to be fully usable on mobile.

#### Acceptance Criteria

1. WHILE the viewport is at Mobile_Breakpoint, THE Reports_Page "Staff Performance" tab content SHALL display each staff member's data as a stacked card row rather than in a multi-column table row.
2. WHILE the viewport is at Mobile_Breakpoint, THE Reports_Page "Peak Hours" tab content SHALL display each hour's progress bar and metrics in a stacked single-column layout with the full hour label visible.
3. WHILE the viewport is at Mobile_Breakpoint, THE Reports_Page "Customer Balance" tab content SHALL display each customer's balance as a Card_Row_Drawer with name, outstanding balance, and a "Pay Now" or action button.
4. WHILE the viewport is at Mobile_Breakpoint, THE Reports_Page "Stock Report" tab content SHALL stack all four overview stat cards in a 2 × 2 grid and render the inventory list as stacked cards.
5. WHILE the viewport is at Mobile_Breakpoint, THE Reports_Page "Export" tab content SHALL stack the export format selector, date range inputs, and export action buttons in a single column with full-width controls.
6. THE Reports_Page "Day Book" sub-component SHALL apply the same responsive breakpoint rules as the main Bills_Table (see Requirement 6) for its own data table.

---

### Requirement 10: Performance and No-Regression

**User Story:** As a developer, I want the responsive changes to not introduce layout shifts, reflow loops, or degraded performance compared to the current desktop implementation.

#### Acceptance Criteria

1. THE Reports_Page SHALL NOT introduce any new horizontal scrollbar on the document body at Mobile_Breakpoint or Tablet_Breakpoint.
2. THE Reports_Page SHALL preserve all existing data-fetching behavior, state management, and export functionality unchanged after the responsive layout changes are applied.
3. WHEN the viewport is resized from Desktop_Breakpoint to Mobile_Breakpoint (or vice versa) in the same browser session, THE Reports_Page SHALL reflow to the correct layout without requiring a page reload.
4. THE Reports_Page SHALL NOT use `!important` overrides on width or display properties beyond those already present in the existing `App.css` reports section, to prevent specificity conflicts.
5. IF a chart library (e.g., Recharts, Chart.js) is used for the Sales Trend or Payment Breakdown charts, THEN THE chart containers SHALL use `width: 100%` and `height` set via a responsive prop or CSS variable so that the charts resize correctly when the viewport changes.
