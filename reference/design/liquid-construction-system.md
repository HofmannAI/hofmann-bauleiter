---
name: Liquid Construction System
colors:
  surface: '#f9f9fe'
  surface-dim: '#d9dade'
  surface-bright: '#f9f9fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f8'
  surface-container: '#ededf2'
  surface-container-high: '#e8e8ed'
  surface-container-highest: '#e2e2e7'
  on-surface: '#1a1c1f'
  on-surface-variant: '#5d3f3d'
  inverse-surface: '#2e3034'
  inverse-on-surface: '#f0f0f5'
  outline: '#926e6c'
  outline-variant: '#e7bdb9'
  surface-tint: '#c0001e'
  primary: '#b7001c'
  on-primary: '#ffffff'
  primary-container: '#e2162a'
  on-primary-container: '#fff7f6'
  inverse-primary: '#ffb3ae'
  secondary: '#5d5e5f'
  on-secondary: '#ffffff'
  secondary-container: '#e0dfe0'
  on-secondary-container: '#626364'
  tertiary: '#5a5a5a'
  on-tertiary: '#ffffff'
  tertiary-container: '#727272'
  on-tertiary-container: '#f8f8f8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3ae'
  on-primary-fixed: '#410004'
  on-primary-fixed-variant: '#930014'
  secondary-fixed: '#e3e2e3'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1d'
  on-secondary-fixed-variant: '#464748'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1b1b1b'
  on-tertiary-fixed-variant: '#474747'
  background: '#f9f9fe'
  on-background: '#1a1c1f'
  surface-variant: '#e2e2e7'
typography:
  nav-title:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.41px
  large-title:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 41px
    letterSpacing: 0.37px
  headline:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.41px
  body:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.41px
  callout:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 21px
    letterSpacing: -0.32px
  subheadline:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.24px
  footnote:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: -0.08px
  caption-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.06px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-main: 16px
  gutter: 12px
  stack-sm: 4px
  stack-md: 8px
  stack-lg: 16px
  stack-xl: 24px
  safe-area-bottom: 34px
---

## Brand & Style

This design system is engineered for the high-stakes environment of construction management, blending the precision of industrial engineering with the premium aesthetic of modern iOS interfaces. The brand personality is authoritative yet approachable, utilizing "Liquid Glass" effects to manage complex data density without overwhelming the user.

The style is a sophisticated evolution of **Glassmorphism**, specifically tailored for professional utility. It relies on multi-layered translucency to establish a clear spatial mental model, allowing users to maintain context as they navigate through blueprints, schedules, and site reports. The visual language conveys transparency and structural integrity—core values in the construction industry.

## Colors

The palette is derived from the structural elements of a modern job site. **Construction Red (#E2162A)** serves as the primary action color, used sparingly for critical CTAs, status alerts, and brand touchpoints to ensure high visibility against architectural backdrops.

**Dark Grey (#5B5C5D)** and **Black (#000000)** provide the foundation for typography and iconography, ensuring WCAG AA compliance. The background utilizes a soft iOS-style neutral grey to reduce eye strain during long site inspections. To achieve the "Liquid Glass" effect, the system employs semi-transparent white fills with high-saturation backdrop blurs, creating a sense of depth and hierarchy between the toolbars and the underlying content.

## Typography

This design system adopts the **Inter** font family for its exceptional legibility in varied lighting conditions found on construction sites. The typographic scale follows the iOS Human Interface Guidelines precisely, using dynamic Type sizes to ensure accessibility.

The hierarchy is structured to prioritize legibility of technical data. Large titles are used for page-level navigation, while tight, medium-weight subheadlines are utilized for field labels and data values. Tracking (letter-spacing) is slightly tightened for larger headers and opened up for small captions to maintain a clean, high-fidelity appearance.

## Layout & Spacing

The layout philosophy is based on a **Fluid Grid** that respects iOS safe areas. A standard 16px lateral margin is maintained across all mobile views, with internal gutters set to 12px for card-based layouts.

Spacing is applied using an 4px incremental scale to ensure vertical rhythm. In construction management views—such as Gantt charts or supply lists—the system allows for "Compact" density modes where padding is reduced to 8px to maximize information density. For standard management tasks, generous 16px padding within cards provides the necessary "breathing room" for the glass effects to be visible.

## Elevation & Depth

Depth in this design system is conveyed through **Backdrop Blurs** and **Ambient Shadows** rather than solid fills.

1. **Base Layer:** The background is a solid light neutral grey.
2. **Surface Layer (Cards):** Utilizes a subtle 20px blur with a white 70% opacity fill and a 0.5px inside stroke of pure white at 50% opacity to simulate a glass edge.
3. **Floating Layer (Modals/Action Sheets):** Higher elevation is indicated by an increased blur radius (30px) and a soft, diffused shadow (`0px 10px 30px rgba(0,0,0,0.08)`).
4. **Navigation:** The top Navigation Bar and bottom Tab Bar use a high-density "Material" blur (SystemUltraThin) that allows content to bleed through as it scrolls, maintaining the "Liquid" feel.

## Shapes

The shape language follows the **iOS Standard** for rounded rectangles (squircular appearance).

- **Primary Container (Cards):** 12px corner radius.
- **Buttons & Inputs:** 10px corner radius.
- **Outer Modals:** 16-20px corner radius.
- **Icon Enclosures:** 8px corner radius.

Consistent roundness is critical to maintain the professional, high-fidelity feel. Elements are never sharp; even "small" UI components like tags or chips maintain a 6px minimum radius to align with the soft, glass-like aesthetic.

## Components

### Buttons
Primary buttons use a solid **Construction Red (#E2162A)** fill with white text. Secondary buttons utilize the "Liquid Glass" effect: a translucent white background with a subtle border and dark grey text. Tap targets must be at least 44x44px.

### Cards
Cards are the primary container for site data. They feature a 12px radius, a 20px backdrop blur, and a 0.5px white border. Shadows are minimal, reserved for indicating that a card is "lifted" or draggable (e.g., reordering tasks).

### Input Fields
Inputs are styled as "Inset Groups." They feature a subtle grey background or a glass effect depending on the container. Labels are placed above the input in the `caption-caps` style for clarity.

### Chips & Badges
Used for status (e.g., "In Progress," "Delayed"). These use a lower opacity version of the status color with a high-contrast border and center-aligned text.

### Segmented Controls
Classic iOS-style controls used for switching between "List" and "Map" views. The selected segment is a solid white "glass" piece that appears to slide over the background track.

### Construction-Specific Components
- **Blueprint Viewer:** A full-screen modal with a light-to-dark toggle to improve visibility of CAD drawings.
- **Punch List Items:** High-density rows with a checkbox on the left and a red "Action Required" indicator on the right.
- **Daily Log Timeline:** A vertical track using the primary red color for the current time marker.
