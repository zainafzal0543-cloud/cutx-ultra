# CUTX ULTRA — Phase 1

> AI-powered industrial sheet cutting optimizer for furniture factories, CNC shops, woodworkers, acrylic manufacturers, and aluminum fabricators.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Canvas | Konva.js / react-konva |
| State | Zustand |
| Local DB | IndexedDB (via `idb`) |
| Backend | Supabase (PostgreSQL) |
| Deployment | Vercel |
| PWA | next-pwa |

---

## Folder Structure

```
cutx-ultra/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout, fonts, metadata
│   │   ├── globals.css           # Global styles + CSS vars
│   │   ├── page.tsx              # Loading splash → /workspace
│   │   ├── workspace/
│   │   │   └── page.tsx          # Main 3-column workspace
│   │   └── api/
│   │       └── health/route.ts   # Health check endpoint
│   ├── components/
│   │   ├── layout/
│   │   │   ├── WorkspaceLayout.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── LeftSidebar.tsx
│   │   │   └── RightSidebar.tsx
│   │   ├── canvas/
│   │   │   ├── CenterCanvas.tsx       # Canvas shell + toolbar
│   │   │   ├── OptimizationCanvas.tsx # Konva renderer
│   │   │   ├── EmptyCanvasState.tsx   # Illustrated empty state
│   │   │   └── OptimizingOverlay.tsx  # Loading animation
│   │   ├── cutting/
│   │   │   ├── SheetSpecPanel.tsx     # Material + dimensions form
│   │   │   └── CuttingListPanel.tsx   # Excel-style parts table
│   │   ├── metrics/
│   │   │   └── MetricsPanel.tsx       # Efficiency + stats
│   │   └── projects/
│   │       └── ProjectsModal.tsx      # Project CRUD modal
│   ├── hooks/
│   │   ├── useOptimization.ts
│   │   ├── useLocalDB.ts
│   │   └── useCanvasControls.ts
│   ├── lib/
│   │   ├── optimization/
│   │   │   └── guillotine.ts     # Guillotine cutting algorithm
│   │   ├── db/
│   │   │   └── local.ts          # IndexedDB persistence
│   │   ├── supabase/
│   │   │   └── client.ts         # Supabase browser client
│   │   └── utils/
│   │       ├── index.ts          # cn(), generateId(), helpers
│   │       ├── units.ts          # mm/cm/in/ft conversion
│   │       └── presets.ts        # Sheet size presets
│   ├── store/
│   │   └── index.ts              # Zustand global store
│   └── types/
│       └── index.ts              # All TypeScript interfaces
├── public/
│   ├── manifest.json             # PWA manifest
│   └── icons/                    # PWA icons (add your own)
├── supabase/
│   └── schema.sql                # PostgreSQL schema + RLS
├── .env.local.example
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## Local Development

### 1. Install dependencies

```bash
npm install
# or
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` — for Phase 1 local-only mode, the Supabase keys are optional:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Supabase Setup

### 1. Create a project at [supabase.com](https://supabase.com)

### 2. Run the schema

In your Supabase SQL Editor, paste and run the contents of `supabase/schema.sql`.

This creates:
- `projects` table with RLS policies
- `sheets` table
- `cutting_items` table
- `optimization_results` table
- Auto-updating `updated_at` trigger

### 3. Enable Auth (optional for Phase 1)

Go to **Authentication → Providers** and enable Email or any OAuth provider.

### 4. Get your keys

From **Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key (server-side only)

---

## Vercel Deployment

### 1. Push to GitHub

```bash
git init && git add . && git commit -m "CUTX ULTRA Phase 1"
git remote add origin https://github.com/yourname/cutx-ultra.git
git push -u origin main
```

### 2. Import to Vercel

Go to [vercel.com/new](https://vercel.com/new), import the repository.

### 3. Set environment variables in Vercel dashboard

Add all variables from `.env.local.example`.

### 4. Deploy

Vercel auto-deploys on every push to `main`.

---

## PWA Icons

Generate icons for all sizes and place them in `public/icons/`:

```
icon-72x72.png
icon-96x96.png
icon-128x128.png
icon-144x144.png
icon-152x152.png
icon-192x192.png
icon-384x384.png
icon-512x512.png
apple-touch-icon.png  (180x180)
```

Use [maskable.app](https://maskable.app) or [pwa-image-generator](https://www.pwabuilder.com/imageGenerator) to generate from the SVG in `public/icons/icon.svg`.

---

## Usage

### Creating a project
1. Click **CUTX ULTRA** logo in the top bar
2. Click **New Project**, enter a name
3. The workspace opens with a default 2440×1220mm plywood sheet

### Configuring the sheet
- **Left sidebar → Sheet tab**
- Select a material preset or configure manually
- Set width, height, thickness, blade kerf
- Choose unit system (mm / cm / inches / feet)

### Adding parts
- **Left sidebar → Cutting List tab**
- Click **Add Part** or paste directly from Excel (Tab-separated: Label, Width, Height, Qty, Rotation, Section)
- Import a CSV file with the upload button

### Running optimization
- Click the **Optimize** button in the top bar
- The guillotine algorithm places all parts
- Navigate sheets using the bottom toolbar
- View efficiency metrics in the **right sidebar**

### Keyboard shortcuts
| Shortcut | Action |
|---|---|
| `⌘ +` | Zoom in |
| `⌘ -` | Zoom out |
| `⌘ 0` | Reset zoom |

---

## Phase 1 Capabilities

| Feature | Status |
|---|---|
| Project CRUD | ✅ |
| Local IndexedDB persistence | ✅ |
| Sheet specification + presets | ✅ |
| Excel-style cutting list | ✅ |
| CSV import | ✅ |
| Excel paste | ✅ |
| Guillotine optimization | ✅ |
| Konva.js canvas renderer | ✅ |
| Zoom + pan | ✅ |
| Multi-sheet navigation | ✅ |
| Metrics panel | ✅ |
| PWA manifest | ✅ |
| Supabase schema + RLS | ✅ |
| Responsive 3-column layout | ✅ |
| Framer Motion animations | ✅ |

---

## Phase 2 Preview (not yet built)

- MaxRects advanced packing algorithm
- AI-powered layout suggestions
- Grain direction locking
- Supabase cloud sync
- User authentication
- PDF/DXF export
- Cost estimation engine
- Multi-material optimization
- Part color coding by section
- Shareable project links

---

*CUTX ULTRA — Phase 1 complete. Awaiting Phase 2 instructions.*
