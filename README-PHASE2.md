# CUTX ULTRA — Phase 2 Additions

> Extends Phase 1 with advanced optimization, exports, remnants, analytics, sharing, and mobile UX.

---

## New Files (Phase 2)

```
src/
├── types/
│   └── phase2.ts                  # OptimizationMode, Remnant, ExportOptions, ShareLink, Analytics
├── lib/
│   ├── optimization/
│   │   └── advanced.ts            # MaxRects BSSF + 4 optimization modes
│   ├── db/
│   │   └── remnants.ts            # IndexedDB v2: remnants + analytics stores
│   ├── export/
│   │   └── engine.ts              # CSV, DXF, PNG, JSON export engines
│   ├── analytics/
│   │   └── engine.ts              # Snapshot capture + global analytics compute
│   └── sharing/
│       └── index.ts               # Share link CRUD + token generation
├── store/
│   └── phase2.ts                  # Advanced optimizer runner + Phase2 settings hook
├── hooks/
│   └── usePerformance.ts          # Memoized metrics, debounced updates, touch gestures
├── components/
│   ├── cutting/
│   │   └── VirtualizedCuttingList.tsx  # Virtual scroll, search, filter, sort, bulk select
│   ├── canvas/
│   │   ├── OptimizationModeSelector.tsx # 4 modes + advanced options
│   │   └── SheetGrid.tsx               # Multi-sheet thumbnail grid overview
│   ├── remnants/
│   │   └── RemnantsPanel.tsx           # Inventory view with material filter
│   ├── export/
│   │   └── ExportPanel.tsx            # CSV / PNG / DXF / JSON with options
│   ├── sharing/
│   │   └── SharePanel.tsx             # Link generation + expiry + revoke
│   └── layout/
│       └── MobileBottomSheet.tsx      # Mobile floating controls + bottom sheet
├── app/
│   ├── analytics/
│   │   └── page.tsx                   # Analytics dashboard page
│   └── share/
│       └── [token]/
│           └── page.tsx               # Read-only shared project view
└── supabase/
    └── schema-phase2.sql              # Remnants, analytics, share_links, export_jobs tables
```

---

## Phase 2 Features

### Advanced Optimization Engine
- **4 optimization modes**: Minimum Wastage, Minimum Cuts, Fast Cutting, Grain Safe
- **MaxRects BSSF** (Best Short Side Fit) algorithm — superior to Phase 1 guillotine
- **5 sort strategies**: Area, Width, Height, Perimeter — mode-aware auto-selection
- **Grain direction locking** — disables rotation when grain must be preserved
- **Progress callbacks** — yields to UI every 5 sheets for smooth experience
- **Auto-saves remnants** after every optimization

### Remnant Inventory
- Detects large free rectangles after packing (configurable min size)
- Stored in IndexedDB with material, dimensions, source project
- Filterable by material, searchable by project
- "Use This Remnant" hook for future Phase 3 integration
- Visual aspect-ratio preview per remnant

### Export Engine
- **CSV** — full cutting list + optimization report in Excel-compatible format
- **DXF** — CNC-ready vector geometry with SHEET / PIECES / LABELS / DIMS layers
- **PNG** — high-res canvas render (150 DPI default) with labels & dimensions
- **JSON** — complete project backup for import

### Analytics Dashboard
- `/analytics` route with KPI cards
- Efficiency trend bar chart (last 14 optimizations)
- Top materials horizontal bar chart
- Weekly activity breakdown
- IndexedDB-persisted snapshots after every optimization

### Sharing System
- Generates shareable read-only tokens (12-char URL-safe)
- Configurable expiry: 24h / 7d / 30d / never
- View counter per link
- `/share/[token]` read-only page with cutting list + metrics
- Revocable links

### Virtualized Cutting List
- Virtual scroll handles 1000+ rows at 40px/row with 8-row overscan
- Column sort (label, width, height, quantity)
- Live search + section filter
- Bulk select + bulk delete
- Memoized rows with `React.memo` for zero re-render on unchanged rows

### Mobile / Tablet
- Desktop sidebars hidden on `< md` breakpoint
- `MobileBottomSheet` — floating action bar + swipe-up panel
- Touch pan + pinch-to-zoom via `useTouchGestures`
- Sheet grid overview with thumbnail SVGs

### Performance
- `useOptimizationMetrics` — memoized, only recomputes when result changes
- `useDebouncedUpdate` — 300ms debounce on cutting item field changes
- `usePieceColorMap` — stable color mapping memoized per sheet
- `useVisibleCanvas` — IntersectionObserver for off-screen canvas pause

---

## Running Phase 2

No additional install steps — same `npm install && npm run dev`.

### New Supabase tables

```bash
# In Supabase SQL Editor, run after phase 1 schema:
supabase/schema-phase2.sql
```

### New environment variables

None required — all Phase 2 features work offline via IndexedDB.

---

## Phase 2 Complete. Awaiting Phase 3 instructions.
