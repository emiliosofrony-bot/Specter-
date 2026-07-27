---
name: Specter
colors:
  surface: '#121315'
  surface-dim: '#121315'
  surface-bright: '#38393b'
  surface-container-lowest: '#0d0e10'
  surface-container-low: '#1b1c1e'
  surface-container: '#1f2022'
  surface-container-high: '#292a2c'
  surface-container-highest: '#343537'
  on-surface: '#e3e2e4'
  on-surface-variant: '#e6beb2'
  inverse-surface: '#e3e2e4'
  inverse-on-surface: '#303033'
  outline: '#ac897e'
  outline-variant: '#5c4037'
  surface-tint: '#ffb59e'
  primary: '#ffb59e'
  on-primary: '#5e1700'
  primary-container: '#ff5717'
  on-primary-container: '#521300'
  inverse-primary: '#ad3300'
  secondary: '#c8c6c8'
  on-secondary: '#303032'
  secondary-container: '#474649'
  on-secondary-container: '#b6b4b7'
  tertiary: '#c8c6c5'
  on-tertiary: '#303030'
  tertiary-container: '#929090'
  on-tertiary-container: '#2a2a2a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59e'
  on-primary-fixed: '#3a0b00'
  on-primary-fixed-variant: '#842500'
  secondary-fixed: '#e4e2e4'
  secondary-fixed-dim: '#c8c6c8'
  on-secondary-fixed: '#1b1b1d'
  on-secondary-fixed-variant: '#474649'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474746'
  background: '#121315'
  on-background: '#e3e2e4'
  surface-variant: '#343537'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  sidebar-width: 280px
  max-content-width: 1200px
---

## Brand & Style
The design system is engineered for a high-end legal conversational workspace, prioritizing precision, authority, and elite performance. The aesthetic is rooted in **Modern Minimalism** with a sophisticated **3D-Layering** approach. It evokes a sense of "digital bespoke tailoring"—calculated, sharp, and expensive.

The UI avoids decorative clutter, using whitespace and subtle depth to guide the user through complex legal workflows. The emotional response is one of calm confidence and absolute clarity, reflecting the high-stakes nature of legal intelligence.

## Colors
This design system utilizes a high-contrast, dual-mode palette. The default state is **Dark Mode**, which uses a deep graphite black canvas to minimize eye strain during long-form document review. 

**Accent Logic:**
- **Copper Orange (#FF4F00):** Used sparingly for high-priority calls to action, active states, and critical indicators. In dark mode, it carries a subtle 8px-12px outer glow to simulate a luminous thread.
- **Surface Layering:** Depth is communicated through a shift from `#0F1012` (Canvas) to `#1C1C1E` (Primary Surface) and `#2B2B2B` (Interactive Elements/Overlays).
- **Light Mode:** Shifts to a warm chalk aesthetic, maintaining the copper orange accent for brand continuity while softening secondary text to a muted charcoal green-grey for readability.

## Typography
The system uses **Inter** exclusively to achieve a systematic, technical look. Elegance is achieved through precise tracking and generous line heights.

**Key Rules:**
- **Tracking:** Headlines use negative tracking (-1% to -2%) for a tighter, premium editorial feel. Labels use positive tracking (+2% to +5%) to ensure legibility at small sizes.
- **Hierarchy:** Use `Medium (500)` or `SemiBold (600)` for semantic headers. Body text remains `Regular (400)` to ensure maximum readability in dense legal transcripts.
- **Contrast:** Secondary information must always use the `text-secondary` color token to maintain a clear visual dip between content and metadata.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. The sidebar is a fixed 3D-layered component, while the main conversation workspace expands to fill the remaining width up to a `1200px` maximum to maintain optimal line lengths for reading.

**Grid Philosophy:**
- **4px Baseline:** All padding and margins are multiples of 4px.
- **Desktop:** 12-column grid with 24px gutters. The chat interface typically occupies the center 8 columns.
- **Mobile:** Single column with 16px margins. Sidebars transition to full-screen overlays with a backdrop blur.
- **Safe Areas:** Conversational bubbles are padded with 16px internally, with 32px vertical separation between user and AI responses.

## Elevation & Depth
This design system utilizes a "Step-Up" elevation model rather than traditional heavy shadows.

**Layering Logic:**
1.  **Level 0 (Canvas):** `#0F1012`. The base foundation.
2.  **Level 1 (Panels):** `#1C1C1E`. Used for sidebars and secondary containers.
3.  **Level 2 (Cards/Active Elements):** `#2B2B2B`. Elements that appear "closer" to the user.
4.  **Glassmorphism:** Navigation bars and hovering context menus use a `20px` backdrop blur with a `1px` border at 10% opacity white.

**Shadows:**
Shadows are minimal and sharp. Instead of blurs, use 1px inner borders (top and left) in a lighter shade to create a "beveled" 3D edge, making buttons and panels feel physically constructed.

## Shapes
The shape language is "Soft-Geometric." It avoids the playfulness of fully rounded corners, opting instead for a tailored, architectural look.

- **Small Components:** Checkboxes and small tags use a `4px` radius.
- **Standard Components:** Input fields, buttons, and cards use an `8px` radius (`rounded-lg`).
- **Large Components:** Workspace panels or modals use a `12px` radius (`rounded-xl`).
- **Icons:** Linear, 1.5px stroke weight, with sharp terminals to match the typography.

## Components
Consistent styling across the workspace:

- **Buttons:**
    - *Primary:* Copper Orange (#FF4F00) background, white text, subtle orange outer glow (10px blur).
    - *Secondary:* Ghost style with `#2E2E30` border and 5% white hover fill.
- **Conversational Bubbles:**
    - *AI Response:* Surface Level 1 (#1C1C1E) with a distinct 1px left-border of Copper Orange to denote the "active intelligence."
    - *User Input:* Subtle Level 2 (#2B2B2B) with right-alignment.
- **Sidebar:** Collapsible, Level 1 elevation, featuring linear icons. Active states use a vertical copper bar (2px wide) on the far left edge.
- **Input Field:** Minimalist bar at the bottom. Transparent background, 1px border at `#2E2E30`, expanding vertically. The "Submit" button is an icon-only copper-glow circle.
- **Chips/Tags:** Small `label-sm` text, dark grey background, 4px radius, used for legal citations or case categories.
- **Lists:** Clean rows separated by 1px borders (#2E2E30). Hover states should lift the item slightly using Level 2 elevation (#2B2B2B).