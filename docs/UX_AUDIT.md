# UX-Audit & Refinement-Strategie

Ziel: von "funktional" zu "premium". Vorbild: iOS 17 Settings, Linear, Things 3, Cron-Calendar, DocMa MM.

---

## 0. UX-Vokabular (Tokens für die ganze App)

### Spacing-Skala (4-Multiples)
`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 72`. Keine ad-hoc-Werte mehr.

### Typo-Skala (SF-Pro-style)
- `caption-xs` 11 / -0.005em / mono — IDs, Datum, technical labels
- `caption-sm` 13 / -0.005em — secondary text
- `body` 15 / 0 — paragraph
- `body-lg` 17 / 0 — list-item titles
- `title-3` 22 / -0.015em — section-titles, card-heroes
- `title-2` 28 / -0.02em — page-titles
- `title-1` 34 / -0.025em — hero-titles
- `display` 41 / -0.03em — first-screen ("Bauleiter-Cockpit")
- `numeric` 56 / -0.04em — big metrics
- `numeric-xl` 72 / -0.05em — splash

### Easing
- `ease-out-expo` `cubic-bezier(0.16, 1, 0.3, 1)` — open animations
- `ease-out-quint` `cubic-bezier(0.22, 1, 0.36, 1)` — exit animations
- `ease-spring` `cubic-bezier(0.34, 1.56, 0.64, 1)` — bouncy emphasis
- Durations: `120ms` micro, `220ms` standard, `400ms` page-transitions

### Blur / Glass
- `bg-glass` `rgba(255,255,255,0.72) backdrop-filter: saturate(180%) blur(20px)`
- `bg-glass-dark` `rgba(15,15,16,0.72) backdrop-filter: saturate(180%) blur(20px)`
- `bg-glass-frost` `rgba(255,255,255,0.55) backdrop-filter: blur(28px)` — sheets

### Depth-Layer
- L0: `bg` (`#F6F4F1`) — page
- L1: `paper` (`#FFFFFF`) — card on page
- L2: `paper-tint` (`#FAF8F4`) — section inside card / hover
- L3: `paper-deep` (gradient overlay 4% black) — input wells, callouts
- Borders: `--line` 8% black, `--line-strong` 16% black, `--line-active` 100% red

### Reduced-Motion
Alle Spring-Animationen über `@media (prefers-reduced-motion: reduce)` auf
`200ms ease-out` reduzieren. Kein Bouncing.

---

## 1. Per-Page Audit

### Dashboard (`/[projectId]/dashboard`)

**Schwächen**
- Hero ist OK, aber die Progress-Ring hat einen statisch "0%"-Label. Wirkt tot.
- Quick-Cards sind generic, zu kompakt — Linear nutzt 80px+ height mit subtiler Beschreibung.
- Activity-Feed ohne Avatar; nur "Jonas hat …" Text. iOS Messages-Look fehlt.

**Verbesserungen**
- Animierte Progress-Ring mit Counter-Animation auf Mount.
- Quick-Cards größer, mit "n offen" Stat-Inline und Hover-Lift (translateY -3px + shadow-up).
- Activity-Feed: Avatar-Bubble (Initialen mit Gewerk-Color), Time-Ago animiert geupdated.

### Checklisten-Liste (`/checklisten`)

**Schwächen**
- Cards sind solide aber statisch. Kein Hover-Polish.
- Keine Sektion-Headers (z.B. "Ausstehend" / "In Arbeit" / "Erledigt"-Gruppierung).
- Filter-Chips ohne Animation beim Wechseln.

**Verbesserungen**
- Cards mit Hover-Glow (Shadow expand statt nur lift).
- Smart-Sort: "Heute aktiv" oben, dann "Pending", dann "Done" zusammengeklappt.
- Filter-Chips mit Layout-Shift-Animation wenn count sich ändert.

### Checklisten-Detail (`/checklisten/[id]`)

**Schwächen**
- Pills sehen nicht "tappbar" aus auf den ersten Blick.
- Viel vertikaler Scroll bei vielen Items + Häusern — kein Anker.
- Sheet schlie&szlig;t per Klick auf Scrim, aber Drag-down zum Schlie&szlig;en fehlt.

**Verbesserungen**
- Pills mit subtiler shadow und stärkerem Active-Press-Feedback.
- Floating-Section-Indicator (sticky pill an der Seite) zeigt "Sektion 3/9".
- Sheet drag-to-close mit Spring-Snap.

### Bauzeitenplan (`/bauzeitenplan`)

**Schwächen**
- Today-Line ist statisch.
- Bar-Hover ist plain, kein Tooltip mit Datum/Dauer.
- Drag-Preview: harter Sprung beim Loslassen.
- Wochenenden subtil aber nicht erkennbar als "anders".

**Verbesserungen**
- Pulsierender Dot auf Today-Line.
- Bar-Hover: Tooltip mit Start/Ende/Dauer/Gewerk fades in.
- Drag mit Snap-to-Day-Linien (semi-transparente vertikale Linien).
- Wochenenden mit diagonal-Hatch-Pattern (subtle, max 4% black).
- Critical-Path-Toggle: smooth color-transition (alle Bars 300ms).

### Aufgaben (`/aufgaben`)

**Schwächen**
- Cards alle gleich aussehend; keine visuelle Hierarchie nach Priorität.
- "Überfällig"-Group hat roten Header aber Cards selbst nicht visualisert.
- Kein Empty-State pro Group.

**Verbesserungen**
- Überfällige Cards: zusätzlicher roter linker Border (3px) + sehr subtiler red-soft tint.
- Priorität-1 Cards: dezent fett gedruckter Titel.
- Empty pro Group: "✓ Nichts überfällig.", "Noch frei diese Woche."
- Gruppen-Headers: count-Badge animiert beim Filter-Wechsel.

### Mängel-Liste (`/maengel`)

**Schwächen**
- Liste ist linear, keine sticky-Header pro Status.
- Status-Pill und Mangel-Color-Stripe sind gut, aber kein Foto-Thumbnail.
- Bulk-Aktionen fehlen (Multi-Select).

**Verbesserungen**
- Sticky-Group-Headers ("OFFEN · 12", "GESENDET · 4", "ERLEDIGT · 8").
- Erstes Foto als Thumbnail links neben Color-Stripe (40×40px).
- Long-Press → Multi-Select-Mode mit Bulk-Bar unten (Status, Versenden, Archivieren).
- Swipe-Actions auf Mobile (links: schnell-Status; rechts: archivieren).

### Mängel-Detail (`/maengel/[id]`)

**Schwächen**
- Status-Action-Buttons sind plain `btn-ghost` — wirken nicht wie Decision-Action.
- Foto-Tiles sind quadratisch-statisch.
- History-Feed mit `clock`-Icon für alles — eintönig.

**Verbesserungen**
- Status-Buttons: jeweils mit subtler Status-Farbe als Pill statt Ghost-Button.
- Foto-Tiles: Tap → Lightbox-Zoom (smooth scale-fade).
- History: Icon variiert (created, status_changed, photo_added, sent).
- "Annotation"-Button auf Foto-Tile → Edit-Mode.

### Plan-Viewer (`/maengel/plaene/[id]`)

**Schwächen**
- Pins zeigen nur shortId — kein Status farbig, kein Cluster bei Zoom-out.
- Klick auf Pin: keine Inline-Vorschau, springt sofort weg.
- Kein Filter ("nur Maler-Mängel").

**Verbesserungen**
- Pins farbig nach Status: open=red, sent=amber, resolved=green.
- Tap-Pin: Floating-Card mit Foto-Vorschau + Title + Status; Tap erneut → navigate.
- Long-Press-Pin: Quick-Actions-Menu (Status ändern, Foto, Löschen).
- Filter-Layer-Bar oben: Toggle pro Gewerk; deaktivierte Pins fade-out.
- Cluster-Bubbles bei Zoom-out (10+ Pins in 50px-Radius werden "12").

### Settings / Kontakte (`/kontakte`)

**Schwächen**
- Liste ohne Gruppierung nach Gewerk.
- Kein Foto/Avatar pro Kontakt.
- Search trennt nicht zwischen "Match in Firma" und "Match in Email".

**Verbesserungen**
- Gruppierung nach Gewerk mit sticky-Header.
- Initialen-Avatar (Firmen-Initiale) als bunter Kreis (Gewerk-Color).
- Search-Match-Highlighting (gelbe Markierung).

### Empty-States generell

**Schwäche**
- Aktuell: "·"-Emoji + grauer Text. Trist.

**Verbesserung**
- Custom-SVG-Illustration pro Page (Hofmann-Style, rote Akzente, line-art).
- Kontextueller CTA ("Mangel hier anlegen", "Plan hochladen").

---

## 2. Globale Verbesserungen

### Topbar
- Glass-Effect: `bg-glass-dark` (translucent ink + 20px blur)
- Project-Name mit smooth-shrink wenn gescrollt (32px → 14px font-size)
- Tab-Indicator-Bar (3px rote Linie unter aktivem Tab) animiert sliden zwischen Tabs

### Tabbar (Mobile)
- Glass-Effect statt opaque white
- Active-Tab: Indicator-Pill (rounded rect mit red-soft Hintergrund)
- Tap-Feedback: Scale-Down 0.92 + leichter Vibrate (`navigator.vibrate(8)`)

### Sheets (Bottom-Sheets)
- Frosted Top (Handle-Bar-Region: bg-glass-frost statt opaque)
- Drag-to-Close: Touch-Drag nach unten > 100px → close (Spring zurück sonst)
- Open-Animation: spring statt cubic-bezier (custom JS oder Svelte transition mit elastic)

### Toasts
- Glass-Background, kein Solid
- Slide-Up + Fade-In (220ms ease-out-expo)
- Nicht 2200ms Timeout sondern: 1500ms für Success, 3500ms für Errors

### Cards
- Hover: `transform: translateY(-2px); box-shadow: shadow-2`
- Active/Press: `transform: scale(0.98)`
- Border: zero by default, appears on hover (subtle)

### Buttons
- Press-State: Scale 0.97 + leichtes inner-shadow
- Disabled: opacity 0.4 + cursor not-allowed
- Loading: Spinner inline statt Text-Replacement

### Form Inputs
- Floating-Label-Style optional (Material 3-vibe)
- Focus: red-border + subtle red-glow (box-shadow)
- Validation-State: border + helper-text farbig

### Photos
- Tap-Animation: Scale-Down zu 0.96 (50ms) → Scale-Up zu 1.0 (220ms ease-spring)
- Lightbox: Backdrop fade + image scale from origin to fit

### Skeleton-Screens
- Statt Spinner bei Initial-Load: graue Placeholder-Cards mit Pulse-Animation
- Aufgaben, Mängel, Checklisten Listen, Plan-Viewer

### Pull-to-Refresh (Mobile)
- Touch-Drag-Down auf Top der Liste
- Threshold ~80px → Refresh (invalidateAll)
- Visual: drehender Indicator (rote Linie krümmt sich zum Kreis)

---

## 3. Was wir BEWUSST nicht machen

- Keine 3D-Tilt-Effekte auf Hover (lenkt ab, eats CPU).
- Keine globale Confetti-Animation bei Erfolg (würde eine Baustelle nicht ernst nehmen).
- Keine Dark-Mode-Variante in v1.0 — Hofmann-Brand ist auf hellem BG, dark erfordert komplette Token-Erweiterung. Phase 5+.
- Keine Voice-Commands für Nav (nur Voice-to-Text in Defect-Description).

---

## 4. Reihenfolge der Implementierung (Loop 2)

Nach Hebelwirkung (visual impact pro Code-Aufwand):

1. **Tokens-Refactor** — neue Skala in app.css + tailwind.config (keine Component-Änderung, aber Foundation)
2. **Topbar Glass + Tab-Indicator** (allgegenwärtig, sofort sichtbar)
3. **Sheet Frosted-Top + Drag-to-Close** (auf allen Detail-Pages aktiv)
4. **Spring-Animationen** (universelle Util `lib/motion.ts`)
5. **Card-Hover-Polish + Press-States** (alle Listen profitieren)
6. **Pin-Workflow Plan-Viewer** (Killer-Feature für Mängel)
7. **Photo-Annotation in Mangel-Detail** (DocMa-Killer)
8. **Bulk-Actions + Multi-Select Mängel** (Pro-User-Feature)
9. **Bauzeit-Polish** (Tooltip, Snap, Hatch-Pattern)
10. **Skeleton-Screens** (Perceived-Performance)
11. **Pull-to-Refresh** (Mobile-Native-Feel)
12. **Keyboard-Shortcuts + Command-Palette** (Power-User)
13. **Toast-Glass** (Detail-Polish)
14. **Empty-State-Illustrations** (Brand-Polish, last)

Realistic time-box: ~3h. Falls eng: 6, 9, 11, 14 vereinfachen oder verschieben.
