---
name: Stark Precision
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#4c4546'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001e2f'
  on-tertiary-container: '#008cc7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.04em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-bold:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-max: 1280px
  gutter: 20px
---

## Brand & Style

This design system is built for mission-critical operations where clarity and speed of response are paramount. It adopts a **Corporate / Modern** aesthetic with heavy influences from **Minimalism**, focusing on high-contrast data visualization and functional density.

The brand personality is authoritative, reliable, and urgent. By utilizing a monochrome base with strategic, high-intensity semantic accents, the UI ensures that critical "BLOQUANT" (Blocking) issues are impossible to ignore while routine tasks remain calm and structured. The overall mood is one of an efficient, high-tech command center.

## Colors

The palette is anchored in a stark "Ink & Paper" philosophy.
- **Primary Black (#000000):** Reserved for primary text, main action buttons, and active UI states to ensure maximum legibility and dominance.
- **Pure White (#FFFFFF):** The standard background for all containers to maximize contrast.
- **Neutral Grays:** Used for structural borders (#E2E8F0) and secondary metadata (#64748B).
- **Semantic Accents:** 
    - **Pure Red (#EF4444):** Exclusively for "BLOQUANT" and critical alerts.
    - **Emerald Green (#10B981):** For "Résolu" and positive status indicators.
    - **Soft Blue (#0EA5E9):** Subtle interaction highlights and focus states.

## Typography

This design system utilizes **Geist** for its technical, monospaced-influenced geometry which fits the developer-centric/SaaS aesthetic. 

- **Hierarchy:** Use `display-lg` for dashboard stats (KPIs). Headlines use tighter letter-spacing to feel more "engineered."
- **Data Tables:** Use `body-md` for primary row content and `body-sm` for secondary metadata (e.g., timestamps, user names).
- **Status Labels:** Use `label-bold` with slight tracking for all-caps status badges to ensure they are distinct from flowing text.

## Layout & Spacing

The layout follows a **Fixed Grid** model for the central content area (max-width: 1280px) to maintain predictable scanning patterns for operators.

- **Grid:** 12-column system on desktop, collapsing to a single column on mobile. 
- **Rhythm:** An 8px linear scale (with a 4px half-step for tight components). 
- **Density:** High density is preferred. Information should be tightly packed but separated by clean 1px borders rather than expansive whitespace.
- **Mobile:** Margins reduce to 16px. Large interactive elements (like the "Prendre en charge" button) transition to full-width.

## Elevation & Depth

Depth is achieved primarily through **Tonal Layers** and **Low-contrast Outlines** rather than traditional shadows.

- **Surfaces:** The base page is a very light gray (#F8FAFC). Primary cards and containers are Pure White (#FFFFFF).
- **Borders:** A consistent 1px solid border (#E2E8F0) defines all interactive zones.
- **Shadows:** Use a single "Focus Shadow" for primary cards: `0 1px 3px 0 rgba(0, 0, 0, 0.05)`. This adds just enough lift to separate a card from the background without creating a "floating" effect.
- **Interactive State:** On hover, borders may darken to #CBD5E1 to indicate clickability.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a professional "work tool" feel that isn't as aggressive as sharp corners but avoids the playfulness of highly rounded systems.

- **Standard Elements:** Inputs, buttons, and cards use 4px (`rounded`).
- **Large Components:** Dashboard containers use 8px (`rounded-lg`).
- **Badges:** Use a higher radius (12px) to differentiate them from functional buttons.

## Components

- **Buttons:** 
    - *Primary:* Solid Black background, White text. No border.
    - *Secondary:* White background, 1px Gray border, Black text.
    - *Action (Card):* Full-width buttons inside cards use a top-border separator and centered text with an icon.
- **Status Badges:**
    - "BLOQUANT": Solid Red background, White text, Bold weight.
    - "En cours": Light Gray border, Black text, accompanied by a hollow circle icon.
    - "Résolu": Light Green background (low opacity), Green text, checkmark icon.
- **Input Fields:** 
    - 1px Gray border, subtle inner shadow. 
    - Search icons are placed internally on the left, using #94A3B8 for the icon color.
- **Incident Cards:** 
    - Use a vertical stack for mobile and a horizontal row for desktop tables.
    - Group "INC-ID" and "Tag" at the top left to establish immediate context.
- **Avatars:** 
    - Small circles (24px) with initials or high-contrast photos, often paired with the user's name in `body-sm`.