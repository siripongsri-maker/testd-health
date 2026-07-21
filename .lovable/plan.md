
# Bundle & PWA cache audit — implementation plan

## Findings from the current build

Measured `dist/assets` after `vite build`:

```text
2255 KB  HIVSelfTest-*.js       ← single-page monster (self-test flow)
 671 KB  index-*.js             ← main entry, everything shared
 341 KB  generateCategoricalChart (recharts)
 315 KB  HarmReduction-*.js
 168 KB  VirtualMode-*.js
 146 KB  leaflet-*.js
 238 KB  index-*.css            ← Tailwind bundle
Total: ~13 MB of JS+CSS in /assets
```

Two orphaned service worker files (`public/sw.js`, `public/service-worker.js`) still ship the old kill-switch. `vite-plugin-pwa` and `workbox-window` are installed but **not** used anywhere in `src/` — they add nothing at runtime but bloat `node_modules`. No `NetworkFirst` policy for HTML exists, so caching relies entirely on Lovable's revalidation headers.

## Goals

1. Get the initial JS (`index-*.js` + first route chunk) under ~350 KB gzip on mobile.
2. Split HIVSelfTest into request / submit / admin-support sub-chunks so a user reporting a result no longer downloads the entire self-test surface.
3. Make sure returning visitors on old installed builds always get the current HTML, and remove dead PWA code.
4. Verify with Lighthouse before/after on `/th` and `/th/hiv-selftest`.

## Work items

### 1. Split the HIVSelfTest 2.2 MB chunk
- Convert the step components inside `src/pages/HIVSelfTest.tsx` (request flow, `LeanResultSubmissionFlow`, `SelftestPii` capture, admin/case history views) to `React.lazy` boundaries wrapped in `Suspense` with a light skeleton.
- The `?action=submit` path should load only the result submission bundle, not the request flow, and vice versa.

### 2. Split shared heavies out of `index-*.js` (671 KB)
- Add a small `manualChunks` policy in `vite.config.ts`:
  - `react-vendor`: react, react-dom, react-router-dom
  - `radix`: all `@radix-ui/*`
  - `charts`: recharts (already isolates categorical chart, extend to whole lib)
  - `supabase`: `@supabase/supabase-js`
  - `forms`: react-hook-form + zod + hookform/resolvers
- Keeps admin/staff bundles from re-importing these on every route change.

### 3. Route-level lazy loading audit
- Confirm every top-level route in `src/App.tsx` uses `React.lazy` (spot check shows some do, but a few admin panels may be eager). Convert any that aren't.
- Preload the next likely route on hover for the three homepage CTAs (uses existing `src/lib/routePrefetch.ts`).

### 4. CSS
- 238 KB CSS is mostly Tailwind + hand-written RTL rules. Enable `content` scanning to prune unused RTL selectors, and move the `index.css` RTL block behind `[dir="rtl"]` selectors (already partly done) so Tailwind's JIT can drop unused variants.

### 5. PWA / cache hygiene
- **Keep** `public/sw.js` and `public/service-worker.js` as the kill-switch cleanup workers — they're the only thing that evicts stale installs. Do not delete.
- Remove unused `vite-plugin-pwa` and `workbox-window` from `package.json` (nothing imports them; confirmed).
- Add a small runtime check in `src/hooks/useVersionCheck.ts` (already exists) to log & report cache-reset events consistently.

### 6. Measurement
- Add `tests/e2e/lighthouse.spec.ts` that drives Chromium via Playwright, runs a Lighthouse audit against `/th` and `/th/hiv-selftest?action=submit`, and asserts:
  - Performance ≥ 75 mobile
  - Total JS transfer ≤ 900 KB on `/th`
  - Largest chunk ≤ 500 KB
- Record baseline vs. post-change in the PR summary.

## Out of scope

- Image optimization (separate audit).
- Any server-side rendering.
- Changes to the translator DOM walker (already optimized last week).

## Technical details (for the record)

`vite.config.ts` addition:

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        "react-vendor": ["react", "react-dom", "react-router-dom"],
        "radix": [/* enumerate @radix-ui/* actually used */],
        "charts": ["recharts"],
        "supabase": ["@supabase/supabase-js"],
        "forms": ["react-hook-form", "zod", "@hookform/resolvers"],
      },
    },
  },
  chunkSizeWarningLimit: 600,
},
```

`HIVSelfTest.tsx` skeleton:

```tsx
const LeanResultSubmissionFlow = lazy(() => import("@/components/hiv-selftest/LeanResultSubmissionFlow"));
const KitRequestFlow = lazy(() => import("@/components/hiv-selftest/KitRequestFlow"));
// ...
<Suspense fallback={<StepSkeleton />}>
  {step === "photo-result" ? <LeanResultSubmissionFlow ... /> : <KitRequestFlow ... />}
</Suspense>
```

## Expected outcome

- Homepage first-load JS: ~670 KB → ~300 KB gzip.
- Self-test submit page first-load: ~2.9 MB → ~600 KB gzip.
- LCP on mid-tier Android over 4G: ~3.5s → ~2.0s (target).
- No behavioral change; kill-switch SW remains in place so already-installed users pick up the new hashed chunks on next visit.

Approve to proceed, or tell me which of the six items to drop or reorder.
