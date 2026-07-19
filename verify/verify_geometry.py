#!/usr/bin/env python3
"""
Symbolic verification of the Embra 5D Framework geometry (root README.md, §15.2–15.8).

Every substantive geometric claim in the framework reduces to a finite symbolic
identity. This script proves them with sympy, so that any future revision of the
core math is caught immediately if it breaks one. It is the theory-side counterpart
to the visualizer's (numerical) unit tests: sympy proves the identities exactly,
rather than spot-checking values at sample points.

Run (from inside verify/):
    python3 -m venv .venv
    ./.venv/bin/pip install -r requirements.txt
    ./.venv/bin/python verify_geometry.py

Exits non-zero if any check fails.

Notation (README §15.2–15.4): bulk coordinates (τ, ρ, φ, z, ζ), signature
(−,+,+,+,+), bulk metric ds² = −c²dτ² + dρ² + ρ²dφ² + dz² + σ²dζ² with c = 1, σ = 24.
The constraint surface M is parameterized by (τ, ρ, ψ, ζ₀) [comoving "ζ₀-chart"]
or by (τ, ρ, ψ, ζ) [bulk "ζ-chart"]. Embedding: φ = ωτ + ψ, ζ = τ/24 + ζ₀, z = z(τ, ρ).
z_τ ≡ ∂z/∂τ, z_ρ ≡ ∂z/∂ρ; the metric-structure checks hold for free symbols z_τ, z_ρ,
and the closed forms of z_τ, z_ρ are verified separately at the end.
"""
import sys
import sympy as sp

tau, rho, psi = sp.symbols('tau rho psi', real=True)
z0 = sp.symbols('z0', positive=True)
c, sigma, omega = sp.symbols('c sigma omega', positive=True)
zt, zr = sp.symbols('z_tau z_rho', real=True)   # z_τ, z_ρ as free symbols

_fails = []


def check(name, got, expected):
    ok = sp.simplify(sp.expand(got) - sp.expand(expected)) == 0
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    if not ok:
        _fails.append(name)
        print("        got     :", sp.simplify(got))
        print("        expected:", sp.simplify(expected))


# basis 1-forms in coords (τ, ρ, ψ, X), where X = ζ₀ (comoving chart) or ζ (bulk chart)
e_tau, e_rho, e_psi, e_X = (sp.Matrix(v) for v in
                            ([1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]))


def outer(a, b):
    return a * b.T


print("Embra 5D geometry — symbolic verification (README §15.2–15.8)\n")

# --- ζ₀-chart induced metric (README §15.4), c = 1, σ = 24 ---
dphi = omega * e_tau + e_psi
dzeta = e_tau / 24 + e_X                 # dζ = dτ/24 + dζ₀
dz = zt * e_tau + zr * e_rho
G = (-outer(e_tau, e_tau) + outer(e_rho, e_rho) + rho**2 * outer(dphi, dphi)
     + outer(dz, dz) + 24**2 * outer(dzeta, dzeta))

print("§15.4  induced metric components (ζ₀-chart)")
check("h_tau,tau  = ρ²ω² + z_τ²", G[0, 0], rho**2 * omega**2 + zt**2)
check("h_tau,rho  = z_τ z_ρ",     G[0, 1], zt * zr)
check("h_tau,psi  = ρ²ω",         G[0, 2], rho**2 * omega)
check("h_tau,zeta0 = 24",         G[0, 3], 24)
check("h_rho,rho  = 1 + z_ρ²",    G[1, 1], 1 + zr**2)
check("h_psi,psi  = ρ²",          G[2, 2], rho**2)
check("h_zeta0,zeta0 = 576",      G[3, 3], 576)

print("\n§15.5  signature is Lorentzian (−,+,+,+), not Riemannian")
u = sp.Matrix([1, 0, 0, sp.Rational(-1, 24)])            # ∂_τ − (1/24)∂_ζ₀
check("h(u,u) = ρ²ω² + z_τ² − 1  (= −1 at ρ=0)",
      (u.T * G * u)[0], rho**2 * omega**2 + zt**2 - 1)
Gblk = G[[0, 3], [0, 3]]
check("det[(τ,ζ₀) block] = 576(ρ²ω² + z_τ² − 1)",
      Gblk.det(), 576 * (rho**2 * omega**2 + zt**2 - 1))
v7 = sp.Matrix([1, -zt * zr / (1 + zr**2), -omega, sp.Rational(-1, 24)])
check("sharp criterion inf = z_τ²/(1+z_ρ²) − 1",
      sp.simplify((v7.T * G * v7)[0]), zt**2 / (1 + zr**2) - 1)
v8 = sp.Matrix([1, 0, -omega, sp.Rational(-1, 24)])
check("explicit timelike curve norm = z_τ² − 1", (v8.T * G * v8)[0], zt**2 - 1)

print("\n§15.4  ζ-chart (bulk cycle-count ζ): manifestly Lorentzian")
Gz = (-outer(e_tau, e_tau) + outer(e_rho, e_rho) + rho**2 * outer(dphi, dphi)
      + outer(dz, dz) + 576 * outer(e_X, e_X))
check("h_tau,tau = −(1 − ρ²ω² − z_τ²)", Gz[0, 0], -(1 - rho**2 * omega**2 - zt**2))
check("h_rho,rho = 1 + z_ρ²",           Gz[1, 1], 1 + zr**2)
check("h_psi,psi = ρ²",                 Gz[2, 2], rho**2)
check("h_zeta,zeta = 576",              Gz[3, 3], 576)
check("h_tau,psi = ρ²ω",                Gz[0, 2], rho**2 * omega)
check("h_tau,rho = z_τ z_ρ",            Gz[0, 1], zt * zr)

print("\n§15.6/§15.8  fixed-ζ₀ slice and the exact 4D reduction")
H3 = G[[0, 1, 2], [0, 1, 2]]
check("det h⁽³⁾ = ρ² z_τ²", H3.det(), rho**2 * zt**2)
Gz_lim = Gz.subs({zt: 0, zr: 0})
Gz_expect = (-outer(e_tau, e_tau) + outer(e_rho, e_rho)
             + rho**2 * outer(dphi, dphi) + 576 * outer(e_X, e_X))
check("large-τ limit = rotating Minkowski ⊗ 576 dζ²",
      sp.Matrix(4, 4, lambda i, j: Gz_lim[i, j] - Gz_expect[i, j]).norm(), 0)

print("\n§15.2  null-rest axiom (σ = 24c)")
rest_coeff = -c**2 + sigma**2 * sp.Rational(1, 24)**2     # ρ=0 rest helix, dζ=dτ/24
check("rest-helix bulk norm = ((σ/24)² − c²) dτ²", rest_coeff, (sigma / 24)**2 - c**2)
check("...vanishes exactly at σ = 24c", rest_coeff.subs(sigma, 24 * c), 0)

print("\n§15.3/§15.4  embedding partials of z = z₀√(1 + ρ²/τ²)")
taup, rhop = sp.symbols('tau rho', positive=True)
zfun = z0 * sp.sqrt(1 + rhop**2 / taup**2)
zt_x = sp.diff(zfun, taup)
zr_x = sp.diff(zfun, rhop)
check("z_τ = −z₀ρ²/(τ²√(τ²+ρ²))", zt_x, -z0 * rhop**2 / (taup**2 * sp.sqrt(taup**2 + rhop**2)))
check("z_ρ =  z₀ρ/(τ√(τ²+ρ²))",   zr_x,  z0 * rhop / (taup * sp.sqrt(taup**2 + rhop**2)))
check("relation z_τ² = z_ρ²·ρ²/τ²", sp.simplify(zt_x**2 - zr_x**2 * rhop**2 / taup**2), 0)

print()
if _fails:
    print(f"FAILED — {len(_fails)} check(s) did not hold:")
    for f in _fails:
        print("  -", f)
    sys.exit(1)
print("All checks passed — the README geometry (§15.2–15.8) is internally consistent.")
