# Embra 5D — Visualizer

**Live:** [embra-5d.ward-software-defined-systems.workers.dev](https://embra-5d.ward-software-defined-systems.workers.dev)

Interactive 3D visualization of the [Embra 5D Framework](../README.md)'s geometry. The default render plots **the now-point**: the present date/time, measured from the chosen epoch, riding the worldline helix in real time — with the framework's thesis live in the HUD: coordinate time τ ticks forward while proper arc length **Δs holds at exactly 0.000** on the stationary worldline, and begins accruing at ≈ ρω the moment the ρ slider leaves zero (§15.6 — "rest is null").

Spec of record: [`VISUALIZER_BUILD_BRIEF.md`](../VISUALIZER_BUILD_BRIEF.md). Geometry of record: the theory paper as reconciled to [`5D_FRAMEWORK_REVIEW.md`](../5D_FRAMEWORK_REVIEW.md) (ζ-chart induced metric).

## Stack

Vite + TypeScript + React + React Three Fiber, leva controls, deployed as a **Cloudflare Worker with static assets** (`wrangler.jsonc`; v1 is fully static — the Worker only falls through for future `/api/*`).

## Commands

Node 22 (`fnm use`), then:

```
npm run dev        # vite dev server
npm test           # vitest — the geometry/time/Δs invariants (mirrors ../verify/)
npm run build      # tsc -b && vite build
npm run deploy     # build && wrangler deploy
npm run lint       # oxlint
```

## Layout

```
src/geometry/   closed-form core (pure, tested): constants, spiral embedding,
                ζ-chart induced metric + proper-time rate, τ/calendar pipeline
src/sim/        mutable sim singleton + Δs accumulator (pure integration, tested)
src/geodesic/   RK4 geodesic integrator (pure, tested) + the browser Web Worker
                shell — integrates in the inertial Cartesian chart (τ, X, Y, ζ),
                regular through the axis; chart equivalence with the review's
                ζ-chart h_μν is itself under test
src/scene/      R3F scene: floating-origin frame, SimDriver (writes sim each
                frame), worldline helix + day ticks, now-marker + phase dial,
                date-label sprites, polar grid, constraint-surface helicoid
                (colored by dΔs/dτ — the rate = 1 band is the light cylinder
                at present-day τ), light cylinder at ρ = 1/ω
src/hud/        DOM overlay — τ/clock/date/ζ/φ/signature/Δs readout
                (imperative, no per-frame React renders)
src/controls.ts leva panel → sim (datum D2 · basis+λ D3 · ρ/ψ/ζ₀ D4 · speed/scrub
                · deep scrub to epoch · window · overlays · geodesic fan)
src/urlState.ts shareable state in the URL hash (§8) — short keys, defaults
                omitted, sanitized on parse; no backend state
worker/         Cloudflare Worker entry (static-assets fallthrough only in v1)
```

Display frame (brief §6): the event plane (ρ, φ) maps to x/z, the ζ-climb to y, **recentered on the marker every frame** — all positions are computed in f64 on the CPU and only small recentered coordinates reach the GPU. One helix winding = one day = one ζ-unit of climb.

## Milestones

- [x] M1 — scaffold (Workers + Vite + React + R3F + leva)
- [x] M2 — geometry + time core with tests (D1–D4 semantics)
- [x] M3 — floating-origin helix window, live marker, Δs HUD centerpiece
- [x] M4 — constraint-surface patch (rate-colored helicoid), light cylinder
- [x] M5 — RK4 geodesic integrator in a Web Worker (release-fan overlay)
- [x] M6 — overlays (signature locus + Riemannian-pocket tint, null helices,
      ζ slice), scrub-to-early-epoch, URL-shareable state

v1 feature-complete per the build brief and deployed to Cloudflare Workers
(static assets; the Worker script only falls through for future `/api/*`).
