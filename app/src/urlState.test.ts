import { describe, expect, it } from 'vitest'
import type { ShareState } from './urlState'
import { parseHash, serializeHash, SHARE_DEFAULTS } from './urlState'

describe('URL shareable state (§8)', () => {
  it('serializes defaults to the empty string (clean URL at first paint)', () => {
    expect(serializeHash(SHARE_DEFAULTS)).toBe('')
  })

  it('round-trips a fully non-default state', () => {
    const state: ShareState = {
      d: '1999-12-31',
      b: 'civil',
      l: -77.25,
      s: 86400,
      o: -232656.123,
      r: 3.82,
      p: 1.571,
      z0: -12,
      w: 7,
      g: false,
      cs: false,
      lc: false,
      sg: true,
      nh: true,
      zs: true,
      gf: true,
      gr: 11,
      gs: 0.55,
      gh: 48,
    }
    const parsed = parseHash(serializeHash(state))
    expect(parsed).toEqual(state)
  })

  it('omits keys at their defaults so URLs stay short', () => {
    const hash = serializeHash({ ...SHARE_DEFAULTS, r: 2.5, sg: true })
    expect(hash).toBe('r=2.5&sg=1')
  })

  it('parses with or without the leading #', () => {
    expect(parseHash('#r=1.5')).toEqual({ r: 1.5 })
    expect(parseHash('r=1.5')).toEqual({ r: 1.5 })
    expect(parseHash('')).toEqual({})
  })

  it('clamps numeric values into their control ranges', () => {
    expect(parseHash('r=99&w=0&gr=200')).toEqual({ r: 10, w: 1, gr: 15 })
    expect(parseHash('p=-3')).toEqual({ p: 0 })
  })

  it('drops junk: bad enums, bad dates, non-preset speeds, malformed numbers', () => {
    expect(parseHash('b=warp&s=777&d=2026-99-99&r=abc&q=zzz')).toEqual({})
    expect(parseHash('d=2026-07-19&s=3600')).toEqual({ d: '2026-07-19', s: 3600 })
  })

  it('rounds serialized numbers to their declared precision', () => {
    const hash = serializeHash({ ...SHARE_DEFAULTS, p: 1.23456789, o: 48.000004 })
    expect(hash).toBe('o=48&p=1.235')
  })
})
