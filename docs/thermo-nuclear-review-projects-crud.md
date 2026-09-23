# Thermo-nuclear review — projects CRUD & project topbar

**Scope:** commits `380a627` (Add projects CRUD and rebuild the project topbar) and `838ffa5` (remove log time button), against `f204485`.
**Date:** 2026-09-23
**Typecheck:** clean.

**Verdict: changes requested.** The feature works and the file layout is sane, but the diff plants four patterns that will metastasize as the other three entities (clients, estimates, tasks) land, and it commits 3.2k lines of generated mockup bundle into the repo.

---

## 1. `PROJECT_VIEWS` is an array pretending to be a map — and it costs a `!`, a `??`, and a duplicated type

[project-capsule.tsx:33-69](../src/features/projects/project-capsule.tsx#L33-L69) declares `ProjectView` as a hand-written union *and* a parallel `as const` array. They can drift silently. Then every read has to search it:

- [project-capsule.tsx:139](../src/features/projects/project-capsule.tsx#L139) — `PROJECT_VIEWS.find((v) => v.key === view)!` — a non-null assertion papering over a lookup that is total by construction.
- [project-capsule.tsx:188](../src/features/projects/project-capsule.tsx#L188) — `find(...) ?? PROJECT_VIEWS[0]` — a silent fallback for a value that came out of `PROJECT_VIEWS` one line earlier.
- [projects.$projectId.tsx:20-23](../src/routes/projects.$projectId.tsx#L20-L23) — a third `find` with a third fallback.

The judo move: make the table a record and derive the type from it.

```ts
export const PROJECT_VIEWS = {
  panel: { label: "Panel", icon: IconGauge, to: "/projects/$projectId", action: null },
  board: { label: "Board", icon: IconColumns3, to: "/projects/$projectId/board", action: "New task" },
  gantt: { ... },
  docs:  { ... },
} as const

export type ProjectView = keyof typeof PROJECT_VIEWS
export const PROJECT_VIEW_KEYS = Object.keys(PROJECT_VIEWS) as ProjectView[]
```

`PROJECT_VIEWS[view]` is then total. The `!` disappears, both `??` fallbacks disappear, the duplicated union disappears, and the route layout's `find` becomes a keyed lookup. Three fallbacks and a cast deleted, zero behavior change.

Same pattern, same fix, in [project-status.tsx:4-12](../src/features/projects/project-status.tsx#L4-L12): `PROJECT_STATUSES.find(...)?.label ?? s` is a linear scan plus a fallback over an exhaustive `ProjectStatus` union. A `Record<ProjectStatus, string>` makes the `??` unreachable and lets the compiler catch a missing status when `ProjectStatus` grows.

## 2. `fullBleed` is dead config shipped with a justifying comment

[project-capsule.tsx:42-43](../src/features/projects/project-capsule.tsx#L42-L43) declares `fullBleed` on all four views, with a comment explaining the SVAR-canvas rationale. Nothing reads it — `grep -rn fullBleed src/` returns only the four declarations. Delete it. Speculative config with an explanatory comment attached is the worst kind of dead code: the next reader assumes it's load-bearing and preserves it.

Likewise `action: "New task" | "Upload"` drives a button at [projects.$projectId.tsx:62-67](../src/routes/projects.$projectId.tsx#L62-L67) that has no `onClick`. A label-only button isn't a feature; either wire it or drop it until the board exists.

## 3. `ProjectFormDialog` grew a controlled/uncontrolled dual mode for exactly one caller

[project-form-dialog.tsx:48-51](../src/features/projects/project-form-dialog.tsx#L48-L51):

```ts
const isControlled = controlledOpen !== undefined
const open = isControlled ? controlledOpen : uncontrolledOpen
const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setUncontrolledOpen
```

Four props, two of them optional and mutually exclusive with a third, a shadow state that's dead half the time, and a silent no-op setter for the "controlled but forgot `onOpenChange`" case that should never compile in the first place. This is a state machine invented to serve one call site ([project-menu.tsx:51](../src/features/projects/project-menu.tsx#L51)).

Pick one mode. Controlled-only is the cleaner one — the two `trigger` call sites in [projects.index.tsx](../src/routes/projects.index.tsx#L21-L29) can hold a boolean, or export a tiny `NewProjectButton` that owns it. That deletes `isControlled`, `uncontrolledOpen`, the noop fallback, the `trigger` prop and the `DialogTrigger` import.

**And then the bigger judo move:** the reset effect at [project-form-dialog.tsx:62-69](../src/features/projects/project-form-dialog.tsx#L62-L69) exists only because the form state outlives the dialog. Split the body into an inner `ProjectForm` rendered *inside* `DialogContent`, with `useState(project?.name ?? "")` initializers. Radix unmounts the content on close, so "reset from the project each time it opens" becomes free. The `useEffect`, its dependency array, and four `setX` calls all vanish. Net: ~20 lines and one synchronization hazard deleted from a 181-line component.

## 4. `SiteHeader` now type-sniffs a `ReactNode` at runtime

[site-header.tsx:26-30](../src/components/layout/site-header.tsx#L26-L30):

```tsx
{typeof title === "string" ? <h1 className="...">{title}</h1> : title}
```

This is feature logic ("the project capsule needs to replace the `h1`") leaking into the app-wide shared header as a value-shape check. It is also an accessibility trap: pass a component and the page silently loses its `<h1>`. Make the boundary explicit instead — `title: ReactNode` always rendered, with plain pages passing `<PageTitle>Projects</PageTitle>`, or a separate `heading` vs `titleSlot` prop. The union-of-shapes-plus-`typeof` is the magic this codebase doesn't need.

## 5. Copy-pasted page shell and empty state, six times over

The dashed empty-state block —

```tsx
<div className="flex flex-1 items-center justify-center rounded-xl border border-dashed">
  <div className="max-w-sm px-6 py-16 text-center">
    <p className="text-sm font-medium">…</p>
    <p className="mt-1 text-sm text-muted-foreground">…</p>
```

— is duplicated verbatim in [index.tsx](../src/routes/index.tsx#L14), [projects.index.tsx](../src/routes/projects.index.tsx#L48), [projects.$projectId.index.tsx](../src/routes/projects.$projectId.index.tsx#L8), [board](../src/routes/projects.$projectId.board.tsx#L5), [gantt](../src/routes/projects.$projectId.gantt.tsx#L5) and [docs](../src/routes/projects.$projectId.docs.tsx#L5). The page shell `flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6` is pasted into five more, and this diff is what pasted it into [clients.tsx](../src/routes/clients.tsx), [estimates.tsx](../src/routes/estimates.tsx) and [settings.tsx](../src/routes/settings.tsx).

Two components — `<EmptyState title description action? />` and `<PageBody>` — collapse three of those route files to four lines each and make a padding change a one-line edit instead of an eleven-file sweep. This is the cheapest win in the diff and it should land before any more routes are added.

## 6. The project layout re-renders its own header three times

[projects.$projectId.tsx:25-53](../src/routes/projects.$projectId.tsx#L25-L53) has three returns, each re-stating `<SiteHeader title="Project" />` and each re-stating the `p-4 md:p-6` wrapper. Render the header once and switch only the body. Three exits through a component that is 77 lines is already hard to scan; it won't get easier once the panel has real content.

## 7. Boundary: four `as ProjectRow` casts against an untyped Supabase client

[queries.ts](../src/features/projects/queries.ts) casts on every one of the four calls, and [clients/queries.ts:18](../src/features/clients/queries.ts#L18) does the same. `ProjectRow extends Project` with a hand-written `clients: { id, name } | null` shape that must be kept in sync with the `select("*, clients(id, name)")` string by hand — nothing checks that. `supabase/migrations` exists; run `supabase gen types typescript` and type `createClient<Database>` in [lib/supabase.ts](../src/lib/supabase.ts). Every cast in the data layer becomes an inference, and a column rename becomes a compile error instead of a runtime `undefined`. Worth doing now, with five query functions, rather than at fifty.

## 8. 3,256 lines of generated mockup bundle committed to the repo

`docs/mockups/support.js` is 1,911 lines and its first line reads `// GENERATED from dc-runtime/src/*.ts — do not edit.` Alongside it, three `.dc.html` files and two `.tsx` mockups total another ~1,350. Build output whose source isn't in this repo doesn't belong in version control — it can't be reviewed, can't be regenerated here, and will show up in every future `git log -p` and every repo-wide grep. Keep the two `.tsx` mockups if they're a design reference; gitignore the generated runtime and the `.dc.html` shells, or move the whole thing out of the repo.

---

## Smaller, but fix them

- **⌘P binds over browser print**, globally, from a feature component ([project-capsule.tsx:88-97](../src/features/projects/project-capsule.tsx#L88-L97)). It also fires while the user is typing in the project name input. If a shortcut registry is coming, this belongs there; at minimum guard against editable targets.
- **`err instanceof Error ? err.message : "…"`** is duplicated in [project-form-dialog.tsx:90](../src/features/projects/project-form-dialog.tsx#L90) and [project-menu.tsx:25](../src/features/projects/project-menu.tsx#L25). One `errorMessage(err, fallback)` in `lib/`.
- **Stale comment**: [queries.ts:33](../src/features/projects/queries.ts#L33) says "The sidebar calls this on every route" — the sidebar doesn't call `useProject` at all; the only caller is the route, which always has an id. Either the `enabled` guard is unnecessary optionality or the comment is wrong. Both are misleading.
- `ProjectCapsule` at 207 lines is carrying three jobs (shortcut, switcher, view nav). Not over any line, but once the switcher grows recent-projects or a create action, split the popover out.

---

## Bar for approval

Items 1–5 are presumptive blockers — a non-null assertion over a total lookup, dead config with a justifying comment, a dual-mode dialog invented for one caller, runtime type-sniffing added to the shared header, and six-way copy-paste. None of them require rethinking the feature; all of them are deletions. Do 1, 2, 3 and 5 and the diff gets meaningfully smaller than it is now.
