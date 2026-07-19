# Symbolic verification of the Embra 5D geometry

`verify_geometry.py` proves — symbolically, with [sympy](https://www.sympy.org) —
every core geometric identity of the framework as stated in the root
[`README.md`](../README.md) (§15.2–15.8):

- the induced-metric components in both the comoving (ζ₀) and bulk (ζ) charts;
- the **Lorentzian** signature `(−,+,+,+)` and its sharp pointwise criterion
  `z_τ² ⋛ 1 + z_ρ²`;
- the fixed-ζ₀ slice determinant `det h⁽³⁾ = ρ² z_τ²`;
- the **exact** large-τ reduction to rotating-frame Minkowski ⊗ a flat ζ-line;
- the **null-rest axiom** `σ = 24c` (rest is a null curve of the bulk);
- the closed forms of the embedding partials `z_τ`, `z_ρ`.

It is a regression guard for the living theory: if a future edit to the core math
breaks one of these identities, the run fails (non-zero exit). It complements — and
precedes — the visualizer's numerical unit tests, which check that the *code* matches
these *proven* closed forms.

## Run

```sh
cd verify
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
./.venv/bin/python verify_geometry.py
```

The script prints a `PASS`/`FAIL` line per check and exits non-zero if any fail.
