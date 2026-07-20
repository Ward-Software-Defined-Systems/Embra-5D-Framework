// Color field for the constraint-surface patch: the proper-time accrual rate
// dΔs/dτ = √(ρ²ω² + z_τ²) (README §15.6). The ramp tells the framework's
// story — black where rest is null, brightening as proper time flows, a crisp
// light band at rate = 1 (the light-speed sweep: exactly the light cylinder
// ρ = 1/ω at present-day τ, detaching inward as the cone steepens at small τ),
// and amber beyond it.
const STOPS: Array<[rate: number, r: number, g: number, b: number]> = [
  [0.0, 0.031, 0.055, 0.11], // #080e1c — the null axis, barely above background
  [0.6, 0.204, 0.314, 0.431], // #34506e — steel
  [0.96, 0.373, 0.831, 0.941], // #5fd4f0 — cyan, approaching light speed
  [1.0, 0.92, 1.0, 1.0], // #ebffff — the rate = 1 band
  [1.06, 0.373, 0.831, 0.941], // back through cyan…
  [1.6, 1.0, 0.706, 0.329], // #ffb454 — superluminal amber
]

/** Piecewise-linear ramp; writes [r, g, b] into `out` at offset i. */
export function rateToColor(rate: number, out: Float32Array | number[], i = 0): void {
  const t = Number.isFinite(rate) ? Math.max(0, rate) : STOPS[STOPS.length - 1][0]
  let lo = STOPS[0]
  let hi = STOPS[STOPS.length - 1]
  if (t <= lo[0]) {
    hi = lo
  } else if (t < hi[0]) {
    for (let s = 1; s < STOPS.length; s++) {
      if (t <= STOPS[s][0]) {
        lo = STOPS[s - 1]
        hi = STOPS[s]
        break
      }
    }
  } else {
    lo = hi
  }
  const f = hi[0] === lo[0] ? 0 : (t - lo[0]) / (hi[0] - lo[0])
  out[i] = lo[1] + (hi[1] - lo[1]) * f
  out[i + 1] = lo[2] + (hi[2] - lo[2]) * f
  out[i + 2] = lo[3] + (hi[3] - lo[3]) * f
}
