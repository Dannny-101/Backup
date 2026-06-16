# Ten&See — UI/UX Roadmap

Runs **in parallel** with ROADMAP.md.  
Label format: `UI-N`. One item per session. Mark done: `[ ]` → `[x]`.

> **Coordination lock-ins** with main ROADMAP.md:
> - UI footer work (UI-7) must land **before** Day 27 (PDPA/consent)
> - All public-page UI work should land **before** Day 30 (deploy)
> - UI-18 (admin lead board) coordinates with Day 38 (CRM kanban)
> - UI-6 (WhatsApp CTA) coordinates with Day 40 (click-to-WhatsApp)

---

## Phase A — Audit & Foundation

- [ ] UI-1 — **Full visual audit**: open all 5 pages in browser preview (landing, listings,
  listing detail, property, admin). Screenshot every visual issue — spacing breaks,
  overflow, wrong colours, broken mobile layout. Output: numbered issue list we execute against.
  Verify: issue list committed as `UI_ISSUES.md`.

- [ ] UI-2 — **Design-system health check**: audit `theme.css` tokens vs actual usage in
  `styles.css` and `admin/admin.css`. Ensure dark-mode `[data-theme=dark]` overrides exist
  for every token. Fix any hardcoded hex colours in CSS that should use a var.
  Verify: no hardcoded brand colours remain outside `theme.css`.

---

## Phase B — Landing Page (`index.html` + `styles.css` + `app.js`)

- [ ] UI-3 — **Hero section**: tighten headline hierarchy, CTA button prominence, slideshow
  crossfade timing, hero card sizing on mobile (currently likely clipped). Add a
  `fetchpriority="high"` hint to the first slide image.
  Verify: hero renders correctly at 375px, 768px, 1280px.

- [ ] UI-4 — **Search / filter bar**: improve placeholder copy, button contrast ratio (gold
  on dark must ≥ 4.5:1), keyboard submission (Enter key), and mobile stacking order.
  Verify: search bar usable on phone in one hand.

- [ ] UI-5 — **University cards + "How it works" + Features sections**: fix card image
  aspect-ratio lock, hover lift effect consistency, section heading spacing, and the
  Features grid collapsing correctly at tablet breakpoint (768px).
  Verify: all sections look intentional at all 3 breakpoints.

- [ ] UI-6 — **Chat panel + WhatsApp QR section**: inline chat widget sizing, QR code
  display/hide logic, WhatsApp `wa.me` link prefill text.
  Coordinates with Day 40 (click-to-WhatsApp entry points).
  Verify: QR visible on desktop, link tappable on mobile.

- [ ] UI-7 — **Navbar + Footer**: mobile hamburger nav (links accessible at 375px), footer
  columns collapse to single column, add Privacy Policy link (placeholder href for now —
  Day 27 will add the actual page). Add social icon links.
  Coordinates with Day 27 (PDPA). Must be done BEFORE Day 27.
  Verify: nav opens/closes on mobile; footer has privacy link.

---

## Phase C — Listings Page (`listings.html`)

- [ ] UI-8 — **Filter panel UX**: on mobile, move filters into a bottom-sheet drawer
  (toggle button + overlay). On desktop, sticky sidebar. Add active-filter pills
  that appear above the grid showing applied filters with × dismiss.
  Verify: filter drawer opens/closes; active pill appears and dismisses filter.

- [ ] UI-9 — **Listing cards**: lock image aspect ratio to 4:3 (no stretch/crop variance),
  tighten badge placement, add skeleton loader while cards are fetching,
  subtle hover-lift (translateY -4px + shadow). Unify card height.
  Verify: cards look identical regardless of image size; skeleton shows on slow network.

- [ ] UI-10 — **Empty + error states**: if no listings match the filter, show an illustrated
  empty state (icon + copy + "Clear filters" button). If API fails, show a retry card.
  Verify: empty state appears when filter matches nothing; retry works.

---

## Phase D — Listing Detail (`listing.html`)

- [ ] UI-11 — **Photo gallery**: add a thumbnail strip below the main image (click to switch).
  On mobile, make thumbnails horizontally scrollable. Add a lightbox (click main image
  → fullscreen overlay with prev/next arrows).
  Verify: lightbox opens/closes; keyboard arrow navigation works.

- [ ] UI-12 — **Info card + enquiry sidebar**: make sidebar sticky on desktop (
  `position: sticky; top: 2rem`). On mobile, sidebar moves below the info card and
  the "Enquire Now" button stays floating at the bottom (fixed position).
  Verify: sticky sidebar on desktop; floating CTA on mobile.

- [ ] UI-13 — **Contact buttons + availability block**: WhatsApp button more prominent
  (full-width on mobile, icon + text). WeChat ID shown as copyable chip. Availability
  dates styled as a clean timeline rather than table rows.
  Verify: WhatsApp button opens wa.me correctly on mobile.

---

## Phase E — Property Page (`property.html`)

- [ ] UI-14 — **Hero + info strip**: hero overlay gradient tuned so text is readable over
  any image. Info strip (room count, price range, features) uses icon+text chips.
  "Back to listings" breadcrumb visible.
  Verify: white text readable over bright hero images.

- [ ] UI-15 — **Room cards grid**: cards match the style of listing cards (from UI-9).
  Add a "Filter by type" tab strip (All / Single / Shared / Studio) above the grid.
  Verify: tab filter updates grid without page reload.

---

## Phase F — Admin Dashboard (`admin/index.html` + `admin/admin.css` + `admin/admin.js`)

- [ ] UI-16 — **Sidebar navigation**: active-state highlight for current section, collapse
  to icon-only on screens < 1200px, hamburger toggle on mobile. Fix any sections where
  the sidebar overlaps content.
  Verify: sidebar collapses on tablet; all nav items accessible.

- [ ] UI-17 — **Leads & Bookings tables**: on mobile, switch from full table to card-per-row
  layout. Add column sort headers. Row hover highlight. "Actions" dropdown (view, edit,
  delete) via a kebab menu instead of inline buttons eating column space.
  Verify: table readable and actionable at 768px.

- [ ] UI-18 — **Chat interface**: agent message bubbles left-aligned (vs visitor right-aligned),
  timestamps visible on hover, unread badge on session list items, "typing" indicator.
  Coordinates with Day 38 (CRM board — lead stage visible in chat sidebar).
  Verify: chat looks like a modern messaging UI.

- [ ] UI-19 — **Analytics panel + Settings**: placeholder charts replaced with working
  Chart.js or SVG sparklines for leads-per-day and booking conversion. Settings form
  uses consistent input/label components.
  Verify: chart renders with real data; settings save with toast feedback.

---

## Phase G — Cross-cutting Polish

- [ ] UI-20 — **Mobile responsiveness pass**: run all 4 public pages through Chrome DevTools
  at 375px, 414px, 768px. Fix every overflow-x, clipped button, or unreadable text.
  Priority order: landing → listings → listing detail → property.
  Verify: no horizontal scroll on any public page at 375px.

- [ ] UI-21 — **Dark mode completeness**: toggle dark mode on every page and section. Fix
  any component where text goes invisible, backgrounds don't switch, or images lack
  a slight dark overlay. All colours must come from `theme.css` vars.
  Verify: every page looks intentional in dark mode.

- [ ] UI-22 — **Transitions & micro-interactions**: page-entry fade-in (CSS only, 200ms),
  button press ripple or scale effect, smooth filter panel open/close, card hover lift
  (already on listing cards — ensure consistent across all cards site-wide).
  Verify: interactions feel snappy, not janky (check on low-end Android emulation).

- [ ] UI-23 — **404 page + global error boundary**: create `frontend/404.html` with
  on-brand design (logo, friendly message, "Go Home" CTA). Wire it up in `server.js`
  catch-all. Add a JS `window.onerror` handler in `app.js` that shows the toast error
  component instead of a silent fail.
  Verify: navigate to `/bogus-url` → branded 404 page.

---

## Execution order (recommended)

```
UI-1 → UI-2                          # foundation first
↓
UI-3 → UI-4 → UI-5 → UI-6 → UI-7   # landing page (most visible)
↓
UI-8 → UI-9 → UI-10                  # listings
↓
UI-11 → UI-12 → UI-13                # listing detail
↓
UI-14 → UI-15                         # property page
↓
UI-16 → UI-17 → UI-18 → UI-19       # admin (internal, lower urgency)
↓
UI-20 → UI-21 → UI-22 → UI-23       # final polish pass
```

---

## Files each phase touches

| Phase | HTML | CSS | JS |
|-------|------|-----|----|
| A | — | theme.css, styles.css, admin.css | — |
| B (Landing) | index.html | styles.css | app.js |
| C (Listings) | listings.html | listings inline / styles.css | listings inline |
| D (Listing detail) | listing.html | listing inline | listing.html script |
| E (Property) | property.html | property inline | property.html script |
| F (Admin) | admin/index.html | admin/admin.css | admin/admin.js |
| G (Polish) | all | all | app.js, admin.js |
