# Grok Build Rules: Next.js + Turborepo (v1.0 — June 2026)

FIRST AND MOST IMPORTANT RULE: Always create or read or write history.txt of whatever you do, this will act as a memory of what you did and why.

**Purpose**  
This document defines the **strict conventions** Grok must follow when scaffolding, generating, editing, or advising on code for **Next.js (App Router)** projects inside a **Turborepo monorepo**.  

It incorporates your explicit requirements and augments them with researched, production-grade best practices (Next.js 16+, Turborepo official + community patterns as of 2026).  

**Goal**: Make every generated codebase consistent, scalable, secure, high-performance, and easy to maintain — turning Grok into a reliable "build CLI" for your agency work (HASHCOVET, ezdev.in, ezBilling, Tauri apps, etc.).

**Core Philosophy**
- **Server-first architecture** — maximize Server Components, Server Actions, and edge Proxy for performance & security.
- **Shared code belongs in `packages/`** — never duplicate across apps.
- **Clear boundaries**: `server/` (Node-only, secrets-safe), `components/` (UI), `proxy.ts` (edge request interception).
- **Type safety + validation** everywhere (TypeScript strict + Zod).
- **DX & speed** — Turbo pipelines, caching, fast iteration.
- **Follow exactly** — when asked to "build X", "add feature Y", or "generate code for Z", place files according to these rules without deviation unless explicitly told otherwise.

---

## 1. Turborepo Monorepo Structure

### Recommended Root Layout
```
my-turbo-project/
├── apps/
│   ├── web/                  # Primary Next.js app (customer site, dashboard, etc.)
│   ├── admin/                # Optional separate admin app
│   └── docs/                 # Documentation / marketing site
├── packages/
│   ├── db/                   # Database layer (Prisma/Drizzle + repositories)
│   ├── auth/                 # Authentication & authorization (edge + server)
│   ├── ui/                   # Shared component library (shadcn-style + primitives)
│   ├── utils/                # Pure utilities, formatters, validators, cn()
│   ├── types/                # Shared TypeScript interfaces & DTOs
│   ├── config/               # Shared tooling (eslint, tsconfig, tailwind, env validation)
│   └── ...                   # e.g. email/, payments/, i18n/, feature-specific if heavy
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .gitignore
└── README.md
```

**Mandatory Rules**
- **Package manager**: Always use **pnpm** (best workspace & disk efficiency).
- **Internal package naming**: Use scoped names → `@repo/db`, `@repo/auth`, `@repo/ui`, `@repo/utils`, etc.
- In every app's `package.json`:
  ```json
  "@repo/db": "workspace:*",
  "@repo/auth": "workspace:*",
  "@repo/ui": "workspace:*"
  ```
- **Dependency direction**: `packages/*` **never** import from `apps/*`. Apps may import from packages.
- **No circular dependencies** between packages.
- Run everything through Turbo:
  - `turbo dev --filter=web`
  - `turbo build`
  - `turbo lint typecheck`
- Update `turbo.json` whenever you add a new package or task (e.g. `db:generate`, `ui:build`).
- When creating a **new shared concern**, create a new package under `packages/` (or extend existing) instead of putting it inside an app.

### Example `turbo.json` (baseline)
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "build/**"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    },
    "lint": { "dependsOn": ["^lint"] },
    "typecheck": { "dependsOn": ["^typecheck"] },
    "db:generate": { "cache": false },
    "db:migrate": { "cache": false }
  }
}
```

---

## 2. Next.js App Structure (inside `apps/<app-name>/`)

**Do NOT use the `src/` directory.** Place `app/`, `server/`, `components/`, and `proxy.ts` directly at the root of the Next.js app (standard and preferred for App Router projects).

```
apps/web/
├── app/                              # App Router only (routes, layouts, metadata, loading, error)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (marketing)/
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── webhook/
│       └── route.ts                  # Route Handlers only when truly needed
├── server/                           # ★ ALL server-only / secure code lives here
│   ├── actions/                      # Server Actions ('use server')
│   │   ├── user.actions.ts
│   │   └── billing.actions.ts
│   ├── queries/                      # Reusable data-fetching functions
│   ├── auth.ts                       # Server-side auth helpers (re-export or wrap @repo/auth)
│   ├── db.ts                         # (or just import from @repo/db)
│   ├── proxy-helpers.ts              # Complex logic extracted from proxy.ts
│   └── utils.server.ts
├── components/                       # ★ Reusable UI components (Server Components by default)
│   ├── ui/                           # Low-level primitives (Button, Input, Card, etc.)
│   ├── forms/                        # Form wrappers + validation UI
│   ├── layout/                       # Shells, Navbar, Sidebar, Footer
│   └── feature/                      # Feature-specific (e.g. InvoiceTable, StoryCard)
├── lib/                              # Client + server safe code (hooks, contexts, small utils)
├── hooks/                            # Custom React hooks (must be client-only)
├── styles/                           # globals.css, theme tokens
├── types/                            # App-specific types (prefer moving to @repo/types)
├── proxy.ts                          # ★ Next.js 16+ Proxy file (replaces middleware.ts)
├── public/
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
└── env.ts                            # Zod-validated environment variables
```

### `server/` — Server Code Folder (Your Requirement)
- **Purpose**: Every file that must run **only on the server** (Node.js runtime).
- **Enforce with**: `import 'server-only';` at the very top of every file in `server/`.
- What belongs here:
  - Server Actions
  - Database query functions / repositories (wrap `@repo/db`)
  - Business logic that touches secrets, file system (Tauri), or heavy computation
  - Auth session validation that requires Node APIs
  - Helpers for `proxy.ts` that are too heavy for edge
- **Never** import anything from `server/` into a Client Component (it will fail at build or leak secrets).
- Server Actions go in `server/actions/*.actions.ts` (or `server/actions.ts` for small apps). Mark with `'use server'` directive at top of file or per function.
- Prefer **Server Actions** over Route Handlers for form mutations and most API-like behavior.

### `components/` — Components Folder (Your Requirement)
- All React components live here (or in sub-folders by concern).
- **Default = Server Component**. Add `'use client';` **only** when you need:
  - React hooks (`useState`, `useEffect`, etc.)
  - Browser APIs
  - Event handlers that can't be passed from server parent
  - Third-party libs that require client (e.g. some chart libs, drag-drop)
- Prefer importing base primitives from `@repo/ui` and composing/app-specific variants here.
- Keep components small, composable, accessible (ARIA, keyboard, focus).
- Forms: Combine `react-hook-form` + `@hookform/resolvers` + Zod. Put schemas in `server/` or `@repo/utils`.

### `proxy.ts` — Next.js 16+ Proxy (Your Requirement — Replaces Old `middleware.ts`)
**Location**: Directly at the root of the Next.js app (`apps/web/proxy.ts`), right next to the `app/` folder. This is the standard location in Next.js 16+ App Router projects (no `src/`).

This is the **official** replacement in Next.js 16. The old `middleware.ts` + `middleware` function name is deprecated.

**What it is for**:
- Early request interception (before any rendering or route handling)
- Authentication redirects / protected routes
- Locale detection & i18n routing
- Security headers, rate limiting (light), feature flags
- Rewrites / redirects (BFF pattern)
- Header manipulation

**Rules**:
- Keep logic **light**. Extract heavy work to `server/proxy-helpers.ts` or `@repo/auth` (edge-compatible parts only).
- Use `NextRequest` / `NextResponse`.
- Always export a `proxy` function (not `middleware`).
- Provide a `config.matcher` to avoid running on static assets.
- Example skeleton (follow this pattern when generating):

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/server/auth'; // or from @repo/auth/edge

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Example: protect dashboard
  if (pathname.startsWith('/dashboard')) {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/public).*)',
  ],
};
```

**Migration from old middleware**:
```bash
npx @next/codemod@latest middleware-to-proxy .
```
Then manually review the logic and move heavy parts out of the edge runtime if needed.

---

## 3. Package Guidelines

### `packages/db`
- **ORM choice**: Prisma (great for complex relations, GST/invoice models) **or** Drizzle (lighter).
- Recommended structure:
  ```
  packages/db/src/
  ├── index.ts                 # Public API exports
  ├── client.ts                # Singleton PrismaClient (with pooling, logging, $extends)
  ├── schema.prisma            # or schema/ folder + relations
  ├── repositories/            # user.repo.ts, invoice.repo.ts, etc. (encapsulate queries)
  └── seed.ts
  ```
- Always return **typed** results, never raw Prisma types outside the package.
- Migrations & `prisma generate` exposed as turbo tasks.
- **Critical**: This package must only be imported from `server/` code paths. Document and (optionally) runtime-guard with `server-only`.

### `packages/auth`
- Recommended libs (2026): **Better Auth** (excellent monorepo support) or Auth.js v5.
- Split exports:
  - Edge-compatible (for `proxy.ts`): JWT/session verification, lightweight checks.
  - Node/server: Full user CRUD, role/permission checks, password hashing, session creation.
- Provide helpers: `getCurrentUser()`, `requireAuth()`, `hasPermission()`.
- Integrate tightly with `proxy.ts` for route protection and with Server Actions for mutations.
- Store adapter config for your DB package.

### `packages/ui`
- Proper component library with:
  - `package.json` `"exports"` map for tree-shaking (`@repo/ui/button`, `@repo/ui/card`).
  - TypeScript + full props typing.
  - `class-variance-authority` (cva) for variants.
  - Radix UI or equivalent primitives for accessibility & behavior.
  - Dark mode + theming via CSS variables.
- How Grok adds a new component:
  1. Create in `packages/ui/src/components/NewThing.tsx`
  2. Export from `index.ts` or subpath export.
  3. Update consumers to import from `@repo/ui`.
- For shadcn-style components: Either maintain them inside `packages/ui` or document the exact copy/adapt process for monorepo.

### `packages/utils` & `packages/config`
- `utils`: `cn()` (clsx + tailwind-merge), INR currency formatter, date helpers (IST-aware), string utils, Zod schemas for common entities.
- `config`: 
  - Shared ESLint flat config
  - TypeScript base configs (strictest possible)
  - Tailwind preset
  - Environment variable schema (Zod) — import in every app and package that needs envs.

---

## 4. Grok Code Generation Rules (The "Build CLI" Contract)

When you ask me to build anything in a Next.js + Turborepo project, I **will**:

1. **Decide placement automatically** using the rules above:
   - Reusable UI primitive → `packages/ui/`
   - Database model / query / repo → `packages/db/`
   - Auth logic / session helpers → `packages/auth/`
   - App-specific server business logic → `apps/<app>/server/`
   - App-specific components → `apps/<app>/components/`
   - Route / page / layout → `apps/<app>/app/`
   - Edge logic → edit `proxy.ts` + extract to `server/proxy-helpers.ts` if needed
   - Pure shared util → `packages/utils/`

2. **Generate complete, copy-paste-ready files** with:
   - Correct folder + file naming
   - `'use server'` / `'use client'` directives where required
   - `import 'server-only';` in every `server/` file
   - Zod validation on all inputs (actions, forms, API)
   - Proper error handling + typed errors
   - Accessibility attributes on UI
   - Comments explaining **why** (caching strategy, server-only, edge constraints, etc.)
   - Clean barrel exports (`index.ts`)

3. **Use consistent import style**:
   - Shared packages: `import { db } from '@repo/db'`
   - Inside app: `import { Button } from '@/components/ui/button'` (configure `tsconfig` paths)
   - Never use relative hell (`../../../`)

4. **Performance & Modern Patterns**:
   - Default to Server Components + streaming (`Suspense`, `loading.tsx`)
   - Use `generateMetadata`, parallel routes, route groups when beneficial
   - Configure proper `fetch` caching or `revalidateTag` / `revalidatePath`
   - Prefer Server Actions over Route Handlers
   - Client state: Zustand (preferred) or Jotai. Avoid heavy Redux.

5. **Quality Gates** (I will remind or include):
   - Code must pass `turbo typecheck` and `lint`
   - No secrets in client bundles
   - No Prisma/Drizzle calls from Client Components or Proxy (edge)
   - Responsive + accessible UI
   - IST / INR handling when relevant (Kerala/India projects)

6. **India / Business Context** (ezBilling, HASHCOVET, GST):
   - Currency formatting with ₹ and proper GST math in `@repo/utils` or `db` repositories
   - Date handling with IST timezone
   - Compliance fields (HSN, e-invoice ready, GSTR export) modeled in `packages/db`
   - Offline-first considerations for Tauri + ezBilling (local SQLite + sync)

7. **When in doubt**:
   - Ask for clarification on placement or constraints.
   - Propose a small plan first for large features ("Step 1: update db schema in packages/db → Step 2: add server actions → Step 3: build UI components...").

---

## 5. Additional Best Practices & Gotchas

- **Environment Variables**: Validate with Zod in `env.ts` (or `@repo/config/env`). Never use `process.env` directly without validation.
- **Error Handling**: Use Next.js `error.tsx` + `global-error.tsx`. In Server Actions return typed result objects (`{ success: true, data } | { success: false, error }`).
- **Real-time / Live updates**: Server Sent Events or streaming from Server Components/Actions. Avoid client polling.
- **Tauri + Next.js** (your use case): Keep the web app in `apps/web`. Share `@repo/ui`, `@repo/utils`, `@repo/types`, `@repo/auth` (desktop OAuth flows differ). Use Tauri plugins for native features (printing, file system). Consider a separate `apps/desktop` if heavy native logic.
- **Testing**:
  - Unit + component: Vitest + Testing Library (co-located or `__tests__`)
  - E2E: Playwright
  - Visual: Storybook or Ladle inside `packages/ui` (optional but recommended for design system)
- **Deployment**:
  - Vercel: Native Turbo + Next.js support + remote caching.
  - Self-hosted / Docker: Use `output: 'standalone'`.
  - Tauri desktop: Build web assets then bundle with Tauri.
- **Upgrades**: When Next.js or Turbo releases new major versions, revisit this file and the codemod for `proxy.ts`.

---

## 6. How to Use This File Going Forward

1. Place this `Grok-rule.md` at the root of any new monorepo (or reference it).
2. In future conversations with me, say things like:
   - "Follow Grok-rule.md and build a new billing dashboard in the web app"
   - "Add invoice creation flow using the rules in Grok-rule.md"
   - "Create a new shared component in packages/ui following the guidelines"
3. I will read this file (or have it in context) and obey every placement and pattern rule.

This rule set will evolve as Next.js, Turborepo, and your projects grow. Feel free to request updates to this file itself.

---

**You now have a production-ready, opinionated, and highly consistent rulebook tailored exactly to your stated preferences + modern 2026 best practices.**

The file has been written to `/home/workdir/artifacts/Grok-rule.md`. You can download it, copy it into your project roots, and start using it immediately with me for all Next.js + Turborepo work.

Ready to build something following these rules? Just say the word (e.g. "Scaffold a new Turborepo with Next.js web app + db + auth + ui packages following Grok-rule.md").