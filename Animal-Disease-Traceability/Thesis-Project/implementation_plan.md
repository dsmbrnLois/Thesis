# UI Overhaul: ADTS Clinical Authority Design System

Migrate the entire frontend from the current basic green/emoji-based theme to the professional **ADTS Clinical Authority** design system defined in the reference folders.

## User Review Required

> [!IMPORTANT]
> This is a **major visual overhaul** affecting every layout, the public landing page, and all dashboard sidebars. **All existing functionality and API calls will be preserved** — only the visual layer (CSS, Tailwind classes, layout structure, icons) changes.

> [!WARNING]
> The current `npm run dev` server is running. Changes will hot-reload as files are saved, which may cause brief visual disruption during the migration.

## Open Questions

> [!IMPORTANT]
> **Google Fonts loading**: The reference designs use **DM Sans**, **Inter**, and **JetBrains Mono** via Google Fonts, plus **Material Symbols Outlined** for icons (replacing the current emoji icons). These will be loaded from `index.html`. Is that acceptable, or do you want the fonts self-hosted?

> [!IMPORTANT]
> **Scope of page-level redesign**: The reference designs show redesigned *dashboard overview* screens for Admin, Vet, and Farmer. Should I also apply the clinical design tokens to the *inner* pages (e.g., `LivestockDatabase.jsx`, `UserManagement.jsx`, `Reports.jsx`, etc.), or focus only on the layouts + dashboard overviews first?

## Proposed Changes

### 1. Design Foundation (Tokens, Fonts, Global CSS)

---

#### [MODIFY] [index.html](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/index.html)
- Add Google Fonts preconnects and stylesheet links for **DM Sans**, **Inter**, **JetBrains Mono**
- Add **Material Symbols Outlined** icon font link
- Update `<title>` to "ADTS | Animal Disease Traceability System"

#### [MODIFY] [tailwind.config.js](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/tailwind.config.js)
- Add the full ADTS Clinical Authority color palette (primary `#005460`, surface `#f7f9ff`, error `#ba1a1a`, tertiary `#005835`, etc.)
- Add custom font families: `display` (DM Sans), `body` (Inter), `mono` (JetBrains Mono)
- Add custom font sizes: `display-lg`, `headline-md`, `body-lg`, `body-md`, `label-caps`, `data-mono`
- Add custom spacing: `base`, `xs`, `sm`, `md`, `lg`, `xl`, `sidebar-width`, `gutter`
- Add custom border radii: `DEFAULT`, `lg`, `xl`, `full`

#### [MODIFY] [index.css](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/assets/styles/index.css)
- Update base `body` font-family to `Inter, sans-serif`
- Set background to `#f7f9ff` and text color to `#0d1d2b`
- Add Material Symbols icon configuration CSS
- Add utility classes: `.clinical-shadow`, `.zebra-table`, `.status-badge`, `.status-pulse`
- Add custom scrollbar styling (thin 6px thumb)
- Remove old `--green`, `--light-green` CSS vars

#### [MODIFY] [App.css](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/assets/styles/App.css)
- Replace old CSS variables with new clinical design tokens
- Update `#root` styles to remove `text-align: center`

---

### 2. Public Layout & Landing Page

---

#### [MODIFY] [App.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/App.jsx)
- **PublicLayout**: Replace the inline green header/footer with the clinical ADTS top navigation bar:
  - Fixed 64px top navbar with `surface-bright` background and `outline-variant` bottom border
  - Logo: shield icon + "ADTS Public" text in primary teal
  - Nav links in `label-caps` typography (TRACEABILITY, RESOURCES, PARTNER LOGIN, SUPPORT)
  - Mobile burger menu with Material Symbols
- **Footer**: Dark institutional footer (`#0D1B2B` background) with 3-column link grid and system version info

#### [MODIFY] [LandingPage.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/pages/public/LandingPage.jsx)
- Replace existing content with the clinical hero section (teal gradient overlay, large title, CTA buttons)
- Add metrics grid section (Total Livestock Tracked, Active Clearances, Monitored Zones, Lab Throughput)
- Add "Technological Oversight Protocols" feature cards (Real-time Traceability, Health Surveillance, Blockchain Verification)
- Add "Authoritative Disease Oversight" information block
- **Note**: This will be adapted to show ADTS-specific content, not the generic national reference text

---

### 3. Admin Portal Layout

---

#### [MODIFY] [AdminLayout.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/components/layout/AdminLayout.jsx)
- **Sidebar**: Replace green emoji sidebar with dark admin sidebar (`#0D1B2A` background)
  - Title: "ADTS Admin" / "System Infrastructure" in `secondary-fixed` color
  - Nav items use Material Symbols icons with `outline-variant` text
  - Active state: `#1A2B3A` background + 4px left `primary-fixed-dim` border
  - User profile section at bottom with avatar, name, and clearance level
  - "Network Status" and "Logout" links at bottom
- **Header**: Replace plain "Welcome, Admin" with a clinical header showing page title and "NODES ONLINE" status badge
- **Main content area**: Remove cubes background pattern, use `clinical-grid` dot pattern + `#f7f9ff` background
- Preserve all existing `<Outlet />` routing

---

### 4. Veterinarian Portal Layout

---

#### [MODIFY] [VetLayout.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/components/layout/VetLayout.jsx)
- **Sidebar**: Replace green emoji sidebar with clinical white sidebar (`surface` background)
  - Title: "ADTS Portal" / "Veterinary Oversight" in primary teal
  - Nav items use Material Symbols icons (dashboard, pets, health_and_safety, map, biotech)
  - Active state: 4px left `primary` border + `surface-container-high` background
  - "NEW OUTBREAK REPORT" CTA button at bottom
  - SETTINGS and LOGOUT links
- **Header**: Sticky 64px header with page title + user profile (name, role, avatar)
- **Footer**: Technical status bar with portal version, session status, and sync info
- **Main content**: Clean `surface` background, 12-column grid layout
- Preserve all `<Outlet />` routing and mobile responsiveness

---

### 5. Farmer Portal Layout

---

#### [MODIFY] [FarmerLayout.jsx](file:///c:/Users/Paulo/Documents/GitHub/Thesis/Animal-Disease-Traceability/Thesis-Project/src/components/layout/FarmerLayout.jsx)
- **Sidebar**: Replace green emoji sidebar with clinical white sidebar (`surface` background)
  - Title: "Farmer Portal" / "Veterinary Oversight" in primary teal
  - Nav items with Material Symbols icons (dashboard, pets, health_and_safety, map, biotech)
  - Active state: 4px left `primary` border + `surface-container-high` background
  - "New Report" CTA button at bottom
  - Settings and Logout links
- **Main content**: Clean background with proper spacing
- Preserve all `<Outlet />` routing and mobile responsiveness

---

## Verification Plan

### Manual Verification
1. After each layout change, visually confirm the dev server renders correctly at `localhost:5173`
2. Navigate through all routes to confirm no broken imports or rendering errors
3. Test mobile responsive behavior (burger menu still works)
4. Verify all sidebar links navigate to the correct routes
5. Confirm logout functionality still works on all portals

### Automated Tests
- No automated tests exist; verification is visual and functional via the running dev server.
