import { describe, expect, it } from 'vitest'
import { ToyBfvEngine } from './toyFhe'
import { boundaryExperiment, costModel, mergeTrace, outsourcedSum, radixTrace, ranks } from './research'

describe('outsourced computation is not authenticated by FHE', () => {
  const engine = new ToyBfvEngine()
  it('decrypts actual honest and substituted computations across the input domain', () => {
    for (let a = 0; a <= 8; a++) for (let b = 0; b <= 8; b++) {
      expect(outsourcedSum(engine, a, b, false)).toEqual({ expected: a + b, actual: a + b, matches: true })
      const attack = outsourcedSum(engine, a, b, true)
      expect(attack.actual).toBe((a + 2 * b) % 17)
      expect(attack.matches).toBe(b === 0)
    }
  })
  it('separates ring wrap from a deliberately corrupted decoding cell', () => {
    expect(boundaryExperiment('wrap', engine)).toContain('decrypted result = 4')
    expect(boundaryExperiment('noise', engine)).toContain('decrypted result = 4')
    expect(boundaryExperiment('precision', engine)).toContain('absolute error = 0.0125')
  })
})

describe('cost denominators', () => {
  it('includes each stage and amortizes setup without reducing batch latency', () => {
    const sparse = costModel(1, 1, 100), full = costModel(1024, 1, 100)
    expect(sparse.onlineMs).toBe(840)
    expect(sparse.totalMs).toBe(1840)
    expect(full.onlineMs).toBe(sparse.onlineMs)
    expect(full.perItemMs * 1024).toBe(sparse.perItemMs)
    expect(costModel(10, 2, 100).totalMs).toBe(2680)
    expect(costModel(10, 2, 100).itemsPerSecond).toBeCloseTo(20000 / 2680)
    expect(costModel(1, 1, 200).totalMs).toBe(1940)
  })
  it('rejects invalid denominators and nonfinite values', () => {
    for (const x of [0, -1, 1.5, 1025, NaN, Infinity]) expect(() => costModel(x, 1, 100)).toThrow()
    expect(() => costModel(1, 0, 100)).toThrow()
    expect(() => costModel(1, 1, -1)).toThrow()
  })
})

function arrays(n: number): number[][] {
  if (!n) return [[]]
  return arrays(n - 1).flatMap(a => [0, 1, 2, 3].map(x => [...a, x]))
}

describe('printed sorting pseudocode and proposed repairs', () => {
  it('reproduces all three scoped counterexamples', () => {
    expect(mergeTrace([1], [2], false).output).toEqual([1, 0])
    expect(radixTrace([1, 0], 2, 2, false).output).toEqual([1, 0])
    expect(ranks([5, 5], false)).toEqual([1, 1])
    expect(ranks([5, 5], true)).toEqual([0, 1])
  })
  it('repairs permutations, duplicate destinations and exhausted sides on all arrays up to length four', () => {
    for (let n = 0; n <= 4; n++) for (const a of arrays(n)) {
      const expected = [...a].sort((x, y) => x - y)
      for (let split = 0; split <= n; split++) {
        const left = a.slice(0, split).sort((x, y) => x - y), right = a.slice(split).sort((x, y) => x - y)
        expect(mergeTrace(left, right, true).output).toEqual(expected)
      }
      for (const bits of [1, 2]) expect(radixTrace(a, bits, 2, true).output).toEqual(expected)
      expect(radixTrace(a, 1, 2, false).output).toEqual(expected) // r=1 is unaffected
      const stable = ranks(a, true), scatter = new Array(n)
      a.forEach((x, i) => { scatter[stable[i]] = x })
      expect(new Set(stable).size).toBe(n)
      expect(scatter).toEqual(expected)
      // Upper ranks need not be unique, but ordering pairs by them is valid.
      const upper = ranks(a, false)
      expect(a.map((x, i) => ({ x, rank: upper[i] })).sort((x, y) => x.rank - y.rank).map(v => v.x)).toEqual(expected)
    }
  })
})
