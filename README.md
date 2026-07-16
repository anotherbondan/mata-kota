# mata-kota

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Self, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **tRPC** - End-to-end type-safe APIs
- **Prisma** - TypeScript-first ORM
- **PostgreSQL + PostGIS-ready schema** - Database engine for incident, evidence, personnel, BWC, assignment, and audit data
- **Authentication** - Better-Auth
- **Maps and geospatial UI** - Mapbox GL JS, Deck.gl, and Turf.js
- **Charts** - Apache ECharts
- **Operational updates** - 10-second polling with idempotent simulated report and BWC feeds
- **Media and reports** - Cloudinary and pdf-lib
- **AI service boundary** - FastAPI scaffold for severity classification and incident summaries
- **Biome** - Linting and formatting
- **Husky** - Git hooks for code quality
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses PostgreSQL with Prisma. The MVP schema follows the PRD tables for
incidents, raw reports, CV events, personnel, BWC devices, assignments, evidence,
AI summaries, and status audit logs.

1. Make sure you have a PostgreSQL database set up.
2. Copy `apps/web/.env.example` to `apps/web/.env` and fill in your connection details.

3. Apply the schema to your database:

```bash
pnpm run db:push
```

4. Load idempotent demo incidents, personnel, evidence, and BWC positions:

```bash
pnpm --filter @mata-kota/db run db:seed
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the fullstack application.

## Operator Workflow

The implemented non-AI MVP flow is:

1. Sign in with an eight-digit NRP and password.
2. Monitor database-backed incidents on the clustered heatmap and latest-incidents panel.
3. Open the shared incident detail dialog from either the map, dashboard, or history.
4. Review evidence and the status timeline, then verify the incident.
5. Open personnel assignment, search by name or badge number, or run the on-demand nearest calculation.
6. Assign up to three officers, using an audited override reason when selecting busy personnel.
7. Read the generated dispatch card and manually confirm En Route.

`NEXT_PUBLIC_MOCK_FEEDS_ENABLED=true` enables one idempotent mock incident per minute and simulated BWC movement every ten seconds. Set it to `false` when connecting real feeds.

## AI Service

The PRD separates the AI processing engine from the web app. A FastAPI scaffold lives in
`apps/ai` and exposes a deterministic placeholder endpoint for severity/summary generation.

```bash
cd apps/ai
python -m venv .venv
.venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload --port 8000
```

Point the web/API layer at it with `AI_SERVICE_URL`.

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@mata-kota/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Git Hooks and Formatting

- Initialize hooks: `pnpm run prepare`
- Run checks: `pnpm run check`

## Project Structure

```
mata-kota/
├── apps/
│   ├── web/         # Fullstack application (Next.js)
│   └── ai/          # FastAPI AI service scaffold
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:generate`: Generate database client/types
- `pnpm run db:migrate`: Run database migrations
- `pnpm run db:studio`: Open database studio UI
- `pnpm --filter @mata-kota/db run db:seed`: Seed reproducible demo data
- `pnpm --filter @mata-kota/api run test`: Run API unit tests
- `pnpm run check`: Run Biome formatting and linting
