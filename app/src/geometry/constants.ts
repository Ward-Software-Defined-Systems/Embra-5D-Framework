// Load-bearing constants of the Embra 5D Framework (README §15.2–15.4).
// Notebook units: c = 1, σ = 24. Keep these in sync with the theory + verify/.

/** Daily angular frequency ω = 2π/24. */
export const OMEGA = (2 * Math.PI) / 24

/** Z_origin constant z₀ = κ·180/π = 44,378.678. */
export const Z0 = 44378.678

/** Time↔length conversion c (≈ 1 in the notebook's Earth-bound units). */
export const C = 1

/** Cycle↔length conversion σ = 24c. The load-bearing "null rest" axiom lives here. */
export const SIGMA = 24

/** Light cylinder radius ρ = 1/ω = 24/2π ≈ 3.8197 (framework units). */
export const RHO_LIGHT_CYLINDER = 1 / OMEGA
