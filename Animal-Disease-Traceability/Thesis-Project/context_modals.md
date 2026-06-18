# Modals and Charts Context

This document provides an overview of how modals and charts are used across the Animal Disease Traceability System (ADTS) project.

## Modals Context

Modals are extensively used in the **Veterinarian** and **Farmer** portals to provide detailed information without navigating away from the current context. They act as popups for logging, viewing, and diagnosing.

### Common Modals (Reusable Components)
Located in `src/components/common/`:
- **`AuditTrailModal`**: Used by Farmers (`MyLivestock.jsx`) to view the historical transaction/audit trail of an animal.
- **`MedicalLogModal`**: Used by both Vets (`HealthRecord.jsx`) and Farmers (`MyLivestock.jsx`) to display the health history of specific animals.
- **`QRCodeModal`**: Used by Farmers (`MyLivestock.jsx`) to display the QR code for a specific animal or transaction.

### Page-Specific Modals
- **Vet Portal (`VetTransactionLogs.jsx`, `MovementPermits.jsx`, `HealthRecord.jsx`)**:
  - *Diagnose Modal*: For entering diagnosis data for an animal.
  - *Update Modal*: For updating an existing transaction/record.
  - *Health Log Modal*: A simpler view of recent health logs.
  - *Animal List Modal*: For selecting or viewing a list of animals related to a specific health record.
  - *Movement Permit Modals*: Modals to view, approve, or reject movement requests.

- **Farmer Portal (`MyLivestock.jsx`)**:
  - *Risk Modal*: To alert farmers about potential biosecurity risks on their farm based on incoming alerts or recent outbreaks.

- **Public Landing Page (`LandingPage.jsx`)**:
  - *Alert History Modal*: Displays the historical broadcast archive of critical, warning, and informational biosecurity alerts.

---

## Charts Context

The application utilizes **`react-chartjs-2`** (Chart.js) for data visualization, providing real-time and historical analytics across different dashboards. 

### Chart Types Used
- **Bar Charts**: Used for quantitative distribution (e.g., number of animals per species).
- **Pie/Doughnut Charts**: Used for proportion/breakdown analysis (e.g., healthy vs. sick).
- **Line Charts**: Used for time-series and trend analysis (e.g., monthly outbreak occurrences).

### Where Charts are Implemented
- **Landing Page (`src/pages/public/LandingPage.jsx`)**:
  - *Species Distribution*: A Bar chart showing registered livestock counts by species.
  - *Disease Risk Analysis*: A Pie chart breaking down health conditions (Healthy, Mild, Dangerous, Unverified).
  - *Monthly Trend Analysis*: A Line chart showing the 12-month historical trend of confirmed sick cases.

- **Movement Map (`src/pages/public/MovementMap.jsx`)**:
  - Uses Bar and Pie charts for geographical distribution and population census per barangay.

- **Admin Reports (`src/pages/admin/Reports.jsx`) & Components**:
  - **`SummaryReport.jsx`**: Generates Line charts to analyze historical tracking data and provide long-term summaries.
  - **`OutbreakStats.jsx`**: Uses detailed Pie charts to break down specific mild and dangerous conditions, helping authorities quickly grasp the severity of regional outbreaks.

All charts on the public and admin side use the newly implemented **Clinical Chart Options**, which align the chart colors, typography (Inter & JetBrains Mono), and grid styles with the ADTS Clinical Authority design system.

---

## UI/UX Structure & Development Guidelines

This section outlines the standard structural classes and design tokens to use when developing or modifying Modals and Charts within the ADTS Clinical Authority design system.

### Modal UI Structure

Modals should follow a strict containerized layout to ensure readability and focus. They use the clinical z-index and spacing variables.

**1. Overlay / Backdrop**
- **Classes**: `fixed inset-0 z-[2000] flex items-center justify-center p-lg`
- **Backdrop element**: `<div className="absolute inset-0 bg-on-surface/60 backdrop-blur-md transition-opacity" onClick={closeFunction} />`

**2. Main Container**
- **Classes**: `relative w-full max-w-3xl max-h-[85vh] bg-surface-container-lowest rounded-xl shadow-2xl flex flex-col overflow-hidden border border-outline-variant`
- *Note*: Use `max-w-4xl` for data-heavy modals (like Medical Logs), and `max-w-3xl` for standard logs (like Alert History).

**3. Sticky Header**
- **Classes**: `px-lg py-lg border-b border-outline-variant flex items-center justify-between bg-surface-container-low sticky top-0 z-10`
- **Icon Block**: Enclose the leading icon in a primary square: `w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-on-primary`.
- **Title**: Use the tri-font strategy. Main title: `font-display text-headline-md font-bold text-on-surface`. Subtitle/meta: `font-mono text-label-caps text-on-surface-variant uppercase`.
- **Close Button**: `w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:text-error hover:bg-error-container transition-all`. Use the `close` Material Symbol.

**4. Scrollable Body**
- **Classes**: `flex-1 overflow-y-auto px-lg py-lg bg-surface`
- Empty states should be clearly defined using a faded outline icon and descriptive text.

### Chart UI Structure

Charts must be wrapped in clinical cards to separate them visually from the background and to house their specific controls/titles.

**1. Wrapper Card**
- **Classes**: `bg-surface-container-lowest border border-outline-variant rounded-lg clinical-shadow flex flex-col overflow-hidden`

**2. Chart Header (Inside Card)**
- **Classes**: `px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center`
- **Title**: `flex items-center gap-2` containing a `material-symbols-outlined` icon and a title in `font-mono text-label-caps uppercase`.
- **Status/Meta (Right-aligned)**: Use `font-mono text-label-caps text-on-surface-variant uppercase`.

**3. Chart Container**
- Provide a fixed height container for the canvas to prevent responsive layout shifts.
- **Classes**: `h-64 mb-md` (or `min-h-[300px]` depending on the layout space).

**4. Chart.js Clinical Options Standard**
When implementing a new chart using `react-chartjs-2`, always pass standard clinical options to ensure the grid and typography match the system:

```javascript
const clinicalChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { 
      position: "top", 
      labels: { color: "#3f484b", font: { family: 'Inter', weight: '600', size: 12 } } 
    } 
  },
  scales: {
    x: { 
      ticks: { color: "#6f797b", font: { family: 'JetBrains Mono', size: 11 } }, 
      grid: { display: false } 
    },
    y: { 
      ticks: { color: "#6f797b", font: { family: 'JetBrains Mono', size: 11 } }, 
      grid: { color: "rgba(190, 200, 203, 0.3)" } 
    }
  }
};
```
