// Shareable state in the URL hash (brief §8): every control value round-trips
// through `#k=v&…` with short keys, defaults omitted, and hard sanitization on
// parse — no backend state at all. Pure parse/serialize core (node-tested);
// thin DOM wrappers at the bottom.

export interface ShareState {
  /** datum date 'YYYY-MM-DD' (D2) */
  d: string
  /** time basis (D3) */
  b: 'mst' | 'civil'
  /** longitude λ °E (D3) */
  l: number
  /** speed multiplier (allowed preset set) */
  s: number
  /** marker offset from live now, hours */
  o: number
  /** exploration ρ, ψ, ζ₀, window ±days (D4/§6) */
  r: number
  p: number
  z0: number
  w: number
  /** toggles: grid, surface, cylinder, signature, nulls, slice, geodesic fan */
  g: boolean
  cs: boolean
  lc: boolean
  sg: boolean
  nh: boolean
  zs: boolean
  gf: boolean
  /** geodesic fan: rays, kick speed, horizon hours */
  gr: number
  gs: number
  gh: number
}

export const SHARE_DEFAULTS: ShareState = {
  d: '2000-01-01',
  b: 'mst',
  l: 0,
  s: 1,
  o: 0,
  r: 0,
  p: 0,
  z0: 0,
  w: 3,
  g: true,
  cs: true,
  lc: true,
  sg: false,
  nh: false,
  zs: false,
  gf: false,
  gr: 7,
  gs: 0.3,
  gh: 12,
}

export const ALLOWED_SPEEDS = [0, 1, 60, 3600, 86400, 604800, -3600, -86400]

type NumKey = 'l' | 'o' | 'r' | 'p' | 'z0' | 'w' | 'gr' | 'gs' | 'gh'
const NUM_RANGES: Record<NumKey, [min: number, max: number]> = {
  l: [-180, 180],
  o: [-1e7, 1e7],
  r: [0, 10],
  p: [0, 6.2832],
  z0: [-1e4, 1e4],
  w: [1, 30],
  gr: [1, 15],
  gs: [0.02, 1],
  gh: [1, 72],
}
const INT_KEYS = new Set<NumKey>(['w', 'gr'])
const BOOL_KEYS = ['g', 'cs', 'lc', 'sg', 'nh', 'zs', 'gf'] as const
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Decimal places kept when serializing each numeric key. */
const NUM_DECIMALS: Record<NumKey, number> = { l: 2, o: 3, r: 3, p: 3, z0: 0, w: 0, gr: 0, gs: 2, gh: 0 }

export function parseHash(hash: string): Partial<ShareState> {
  const out: Partial<ShareState> = {}
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const d = params.get('d')
  if (d !== null && DATE_RE.test(d) && Number.isFinite(Date.parse(`${d}T00:00:00Z`))) out.d = d
  const b = params.get('b')
  if (b === 'mst' || b === 'civil') out.b = b
  const s = params.get('s')
  if (s !== null && ALLOWED_SPEEDS.includes(Number(s))) out.s = Number(s)
  for (const key of Object.keys(NUM_RANGES) as NumKey[]) {
    const raw = params.get(key)
    if (raw === null) continue
    let v = Number(raw)
    if (!Number.isFinite(v)) continue
    const [min, max] = NUM_RANGES[key]
    v = Math.min(max, Math.max(min, v))
    if (INT_KEYS.has(key)) v = Math.round(v)
    out[key] = v
  }
  for (const key of BOOL_KEYS) {
    const raw = params.get(key)
    if (raw === '1') out[key] = true
    else if (raw === '0') out[key] = false
  }
  return out
}

export function serializeHash(state: ShareState): string {
  const parts: string[] = []
  const push = (key: string, value: string) => parts.push(`${key}=${value}`)
  if (state.d !== SHARE_DEFAULTS.d) push('d', state.d)
  if (state.b !== SHARE_DEFAULTS.b) push('b', state.b)
  if (state.s !== SHARE_DEFAULTS.s && ALLOWED_SPEEDS.includes(state.s)) push('s', String(state.s))
  for (const key of Object.keys(NUM_RANGES) as NumKey[]) {
    const v = Number(state[key].toFixed(NUM_DECIMALS[key]))
    if (v !== SHARE_DEFAULTS[key]) push(key, String(v))
  }
  for (const key of BOOL_KEYS) {
    if (state[key] !== SHARE_DEFAULTS[key]) push(key, state[key] ? '1' : '0')
  }
  return parts.join('&')
}

/** Read the current location hash (empty object outside a browser). */
export function readUrlState(): Partial<ShareState> {
  if (typeof location === 'undefined') return {}
  return parseHash(location.hash)
}

/** Reflect state into the URL without history spam; clears the hash at defaults. */
let lastWritten: string | null = null
export function writeUrlState(state: ShareState): void {
  if (typeof history === 'undefined' || typeof location === 'undefined') return
  const hash = serializeHash(state)
  if (hash === lastWritten) return
  lastWritten = hash
  history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search)
}
