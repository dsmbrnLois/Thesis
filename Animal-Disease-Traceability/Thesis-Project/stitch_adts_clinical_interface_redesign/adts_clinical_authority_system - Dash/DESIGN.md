---
name: ADTS Clinical Authority System
colors:
  surface: '#f7f9ff'
  surface-dim: '#ccdcf0'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4ff'
  surface-container: '#e3efff'
  surface-container-high: '#daeafe'
  surface-container-highest: '#d4e4f8'
  on-surface: '#0d1d2b'
  on-surface-variant: '#3f484b'
  inverse-surface: '#233241'
  inverse-on-surface: '#e8f1ff'
  outline: '#6f797b'
  outline-variant: '#bec8cb'
  surface-tint: '#006876'
  primary: '#005460'
  on-primary: '#ffffff'
  primary-container: '#0a6e7c'
  on-primary-container: '#9feefe'
  inverse-primary: '#84d2e2'
  secondary: '#436085'
  on-secondary: '#ffffff'
  secondary-container: '#b6d4ff'
  on-secondary-container: '#3e5b80'
  tertiary: '#005835'
  on-tertiary: '#ffffff'
  tertiary-container: '#007347'
  on-tertiary-container: '#8ff6bb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a0efff'
  primary-fixed-dim: '#84d2e2'
  on-primary-fixed: '#001f25'
  on-primary-fixed-variant: '#004e59'
  secondary-fixed: '#d3e4ff'
  secondary-fixed-dim: '#abc9f3'
  on-secondary-fixed: '#001c38'
  on-secondary-fixed-variant: '#2a486c'
  tertiary-fixed: '#90f7bc'
  tertiary-fixed-dim: '#74daa1'
  on-tertiary-fixed: '#002111'
  on-tertiary-fixed-variant: '#005231'
  background: '#f7f9ff'
  on-background: '#0d1d2b'
  surface-variant: '#d4e4f8'
typography:
  display-lg:
    fontFamily: DM Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: DM Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: DM Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  sidebar-width: 240px
  grid-columns: '12'
  gutter: 16px
  margin-page: 24px
---

## Brand & Style
The design system is engineered for the high-stakes environment of animal disease traceability and public health oversight. The brand personality is rooted in **institutional trust, sterile precision, and operational clarity**. It eschews decorative flair in favor of "clinical flatness"—a style that prioritizes data density and rapid legibility.

The visual direction targets government officials, veterinarians, and laboratory technicians. By utilizing a high-contrast, structured layout with subtle depth, the UI evokes a sense of rigorous scientific oversight. Every element is designed to feel permanent and verified, minimizing cognitive load during critical outbreak scenarios.

## Colors
The palette is divided into functional tiers to ensure immediate situational awareness:
- **Foundational:** `--clinical-white` provides a cool, anti-glare base for long-duration data entry, while `--sterile-white` distinguishes elevated surfaces.
- **Brand & Action:** `--deep-teal` represents the authority of the institution; `--slate-blue` is used for secondary navigation and structural grouping.
- **Semantic Health States:** These colors are reserved strictly for status communication. `--verified-green` indicates compliance, while the progression from `--amber-watch` to `--quarantine-crimson` signals escalating epidemiological risk.
- **Typography:** `--charcoal` is the standard for high-legibility body text; `--ash` is used for metadata and placeholder states.

## Typography
The typographic system uses a tri-font strategy to separate intent:
1.  **DM Sans (Headings):** Provides a clean, authoritative geometric structure for page titles and section headers.
2.  **Inter (UI/Body):** Chosen for its exceptional legibility in complex forms and dense data tables.
3.  **JetBrains Mono (Metadata/IDs):** Applied to all technical data—such as RFID tags, blockchain transaction hashes, and animal identifiers—to ensure distinct character recognition (e.g., distinguishing '0' from 'O').

Use `label-caps` specifically for status badges and table headers. Scale headlines down for mobile viewports to maintain information density without horizontal overflow.

## Layout & Spacing
This design system utilizes a rigid **4px base unit** to maintain mathematical alignment across complex dashboard layouts. 

- **Grid:** A 12-column fluid grid is used for the primary content area, with 16px gutters.
- **Sidebar:** A fixed 240px left-hand navigation is standard. In administrative views, the sidebar shifts to a dark theme (`#0D1B2A`) to provide a clear visual mode-switch.
- **Breakpoints:** 
  - **Mobile (<768px):** Sidebar collapses to a hamburger menu; 12-column grid collapses to 1 column; margins reduce to 16px.
  - **Tablet (768px - 1024px):** 12-column grid spans; margins 24px; sidebar remains fixed or becomes a narrow icon rail.
  - **Desktop (>1024px):** Standard 240px sidebar with full grid width.

## Elevation & Depth
To maintain a "clinical" feel, the system avoids heavy drop shadows. Depth is achieved through:
1.  **Layering:** Surfaces (`--sterile-white`) sit atop the clinical background (`#F7F9FC`).
2.  **Borders:** Physicality is defined by 1px solid borders in `--mist` (#D8E3ED). This creates a "blueprint" aesthetic that feels structural and precise.
3.  **Interactive States:** Subtle 2px inner strokes or slight value shifts are preferred over elevation changes for hover and active states.
4.  **Shadows:** When necessary for modals, use a "Hard-Neutral" shadow: `0 2px 4px rgba(28, 43, 58, 0.08)`.

## Shapes
The shape language is conservative and professional. 
- **Standard Cards/Inputs:** Use an 8px (`rounded-md`) radius to soften the clinical edge while remaining efficient for space.
- **Status Badges:** Use a full pill shape (100px radius) to distinguish them clearly from interactive buttons or input fields.
- **Buttons:** Match the 8px radius of cards for a cohesive modular appearance.

## Components
- **Status Badges:** Must use `JetBrains Mono`, uppercase, with high-contrast backgrounds corresponding to the health status palette.
- **Data Tables:** Implement zebra-striping using `--clinical-white` for even rows. The "Status" column must be pinned to the left or right edge for immediate visibility.
- **Cards:** Defined by a 1px `--mist` border. Header sections within cards should have a subtle bottom border.
- **Sidebar (Standard):** Background: `--sterile-white`; Active indicator: 4px vertical bar of `--deep-teal` on the left edge.
- **Sidebar (Admin):** Background: `#0D1B2A`; Text: `--mist`; Active state: `#1A2B3A`.
- **Input Fields:** 1px `--mist` border, 8px padding. On focus, the border shifts to `--deep-teal` with a 2px outer glow of the same color at 10% opacity.
- **Buttons:** Primary buttons use `--deep-teal` with white text. Secondary buttons use a `--mist` border with `--charcoal` text. No gradients.