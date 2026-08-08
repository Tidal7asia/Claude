# Lens — by Tidal7

Upload a spreadsheet (CSV, XLS, XLSX) and get an accurate, traceable, interactive dashboard: automatic
data-type detection, a pre-dashboard validation gate, KPIs and charts you can trace back to source
rows, filters, a rule-based AI insights/assistant layer, a drag-and-resize dashboard builder, and
export to PNG/PDF/PPTX/CSV/Excel.

## Stack

- **Frontend:** Next.js (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI
  primitives) · Framer Motion · Recharts · TanStack Table · react-grid-layout · Zustand
- **Parsing:** SheetJS (`xlsx`) for Excel, PapaParse for CSV — all in the browser, no upload to a server
- **Backend (opt-in):** Next.js Route Handlers · Prisma 7 · PostgreSQL, for centralizing saved
  dashboards. The app works fully without it (see [Persistence](#persistence) below).

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000, drop in a spreadsheet, and the dashboard builds itself.

No environment variables or database are required to use the app — everything (parsing, detection,
charts, filters, saved dashboards) runs client-side.

## How it works

1. **Upload** (`src/components/upload`) — drag-and-drop or browse, `.csv`/`.xls`/`.xlsx`, multi-sheet
   workbooks supported.
2. **Parse** (`src/lib/data/parse.ts`) — PapaParse / SheetJS turn the file into rows of typed cells per
   sheet. Header detection scans the first rows for the densest one rather than assuming row 1 is
   always the header (handles title rows / section labels above the real headers), and duplicate
   header names are disambiguated (`Months`, `Months (2)`) so no column is ever silently dropped.
3. **Detect** (`src/lib/data/detect.ts`) — profiles every column: data type (text, number, currency,
   percentage, date, category, boolean), role (dimension / measure / time / geo / identifier), missing
   values, duplicates, distinct counts, and summary stats. Original header text, casing, and values are
   never altered.
4. **Validate** (`src/lib/data/validate.ts`, `src/components/validation`) — before any chart is built,
   a review screen shows exactly what was detected (file/sheet facts, every column's type and role,
   missing/date/numeric ranges) and flags mixed-type columns, duplicate rows, and high-missing columns
   with a **✓ Data successfully loaded** / **⚠ Review required** status — each issue links to the exact
   affected rows via an inspector dialog. Nothing is auto-cleaned; the user decides whether to proceed.
5. **Generate** (`src/lib/charts/recommend.ts`, `src/lib/charts/kpi.ts`) — turns the column profile into
   an initial set of KPI cards and a recommended chart layout (auto grid-positioned). Every KPI card has
   a "View source rows" link that opens the exact underlying rows it was computed from.
6. **Render** (`src/components/charts`) — a dispatcher (`chart-renderer.tsx`) maps a `ChartConfig` to one
   of 20 chart implementations (bar, column, line, area, pie, donut, stacked bar, treemap, heatmap,
   scatter, bubble, histogram, box plot, radar, waterfall, funnel, gauge, calendar heatmap, geo
   breakdown, timeline) plus a pivot table and a full interactive data table.
7. **Filter** (`src/components/filters`, `src/lib/data/aggregate.ts`) — date range, dropdown,
   multi-select, search, and numeric-range filters recompute every chart on the active tab instantly;
   a "Showing X of Y records" bar plus Clear Filters / Reset Dashboard controls keep the current scope
   visible.
8. **Insights** (`src/lib/ai/insights.ts`) — a deterministic statistical engine (no external API key
   needed) surfaces top/bottom performers, growth %, seasonality, outliers (z-score), and correlations
   (Pearson), plus a plain-English summary — grounded only in computed values, no invented explanations.
9. **Assistant** (`src/lib/ai/assistant.ts`) — a lightweight intent parser maps prompts like *"show
   monthly revenue"* or *"top 10 customers"* to a chart spec using column-name/keyword matching, then
   adds the chart to the dashboard.
10. **Build** (`src/components/dashboard/dashboard-canvas.tsx`) — `react-grid-layout` powers drag,
    resize, duplicate, rename, recolor, and tabs; state lives in a Zustand store
    (`src/lib/store/dashboard-store.ts`).
11. **Replace Dataset** (`src/components/layout/replace-dataset-flow.tsx`, `src/lib/data/schema-diff.ts`)
    — re-uploading a new version of the same report keeps the dashboard's layout, charts, filters, and
    calculated fields; only the data swaps in. A diff dialog shows exactly what changed (rows/columns
    before → after, added/removed columns) before you confirm, and a Version History panel keeps a log
    of every upload. A filter pointing at a column that no longer exists is dropped automatically
    (rather than silently matching zero rows) and reported to you.
12. **Field Dictionary** (in the left sidebar) — every detected column's type and role, editable: if the
    auto-detection gets a column wrong, correct it directly rather than fighting the default.
13. **Export** (`src/lib/export/export.ts`) — PNG/PDF/PPTX via `html-to-image` + `jsPDF` +
    `pptxgenjs`; CSV/Excel via SheetJS.

## Persistence

Saved dashboards default to `localStorage` (`src/lib/store/persistence.ts`) so the app is fully
functional with zero setup. A Prisma/PostgreSQL schema and REST route handlers are included and ready
to wire in for centralized/shared storage:

```bash
cp .env.example .env        # set DATABASE_URL
npx prisma migrate dev      # creates the Dashboard/Dataset tables
```

Routes: `GET/POST /api/dashboards`, `GET/PUT/DELETE /api/dashboards/[id]` (`src/app/api/dashboards`).
Swap `src/lib/store/persistence.ts`'s functions to call these instead of `localStorage` to move saves
server-side — the store and UI don't need to change.

Note: this project uses **Prisma 7**, which generates the client to `src/generated/prisma` (not
`node_modules`) and connects via an explicit driver adapter (`@prisma/adapter-pg`) rather than the
classic engine binary. Run `npx prisma generate` after any schema change.

## Design system

Chart colors follow a validated, colorblind-safe categorical palette (fixed hue order, never
per-chart-cycled) with light/dark variants — see `src/lib/charts/theme.ts`. UI components are shadcn/ui
generated against [Base UI](https://base-ui.com) primitives (not Radix): triggers compose via a
`render` prop rather than `asChild`.

## What's simplified / roadmap

Given the enormous scope of the spec, a few items are intentionally simplified rather than fully built
out, so the rest of the app could be genuinely complete and working end-to-end:

- **Geographic map** — renders as a ranked, color-scaled breakdown by geo column rather than an actual
  choropleth/world map (no map-tile/topojson dependency is wired in). Swapping in `react-simple-maps` at
  `src/components/charts/matrix-charts.tsx#GeoBreakdown` is the natural next step.
- **AI insights/assistant** are rule-based (statistics + keyword matching), not LLM-backed — this keeps
  the app fully functional with zero API keys and grounds every statement in a computed value rather
  than a generated one. `src/lib/ai/*` is the seam where a real LLM call would slot in.
- **Very large files (500k+ rows)** parse and profile on the main thread with a `setTimeout` yield
  between sheets; a Web Worker would keep the UI fully responsive on very large uploads. The data table
  itself is pagination-based (not virtualized), which already keeps rendering cheap regardless of row
  count.
- **Calculated fields** support `+ − × ÷` and parentheses over `[Column Name]` references (a small
  hand-rolled parser, deliberately not `eval`/`Function`) — no conditional/text functions yet.
- **Sharing** ("Copy share link") copies a URL shape but doesn't yet publish a dashboard to a public
  endpoint; that's the natural use for the `/api/dashboards/[id]` route once persistence is server-side.
- **Chart auto-repair on Replace Dataset** — when a re-uploaded file removes a column a chart depends
  on, that chart isn't automatically deleted or rewired (the diff dialog tells you which columns
  vanished and that dependent charts may show no data); you edit or remove the chart yourself in Chart
  Settings. Filters are the one exception — a filter pointing at a vanished column is dropped
  automatically, since silently keeping it would make every chart look like it has zero matching rows
  with no visible explanation.
- **Version history** lives in the same per-browser localStorage as saved dashboards, not the
  Prisma/PostgreSQL backend — consistent with the rest of the app's zero-setup default. The `Dataset`
  Prisma model is already shaped to hold this server-side once persistence moves there.
- **Mobile/tablet reorganization** is responsive (grid reflows, sidebars collapse) but not yet a
  purpose-built mobile layout that reprioritizes KPIs/insights/table above charts, as the spec's
  responsive section calls for.
