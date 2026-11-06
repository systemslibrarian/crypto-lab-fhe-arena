import { ToyBfvEngine } from './toyFhe'

export function outsourcedSum(engine: ToyBfvEngine, a: number, b: number, dishonest: boolean) {
  const left = engine.encryptScalar(a)
  const right = engine.encryptScalar(b)
  const sum = engine.add(left, right)
  // The simulated server only adds supplied ciphertexts. It needs no secret key.
  const returned = dishonest ? engine.add(sum, right) : sum
  const expected = ((a + b) % engine.params.t + engine.params.t) % engine.params.t
  const actual = engine.decryptScalar(returned)
  return { expected, actual, matches: actual === expected }
}

export function costModel(occupied: number, batches: number, evaluationMs: number) {
  if (![occupied, batches, evaluationMs].every(Number.isFinite) ||
      !Number.isInteger(occupied) || occupied < 1 || occupied > 1024 ||
      !Number.isInteger(batches) || batches < 1 || batches > 1000 || evaluationMs < 0) {
    throw new Error('Use 1–1024 occupied slots, 1–1000 batches and nonnegative evaluation time.')
  }
  const setupMs = 1000
  const onlineMs = 10 + 20 + evaluationMs + 500 + 200 + 10
  const totalMs = setupMs + batches * onlineMs
  return { setupMs, onlineMs, totalMs, perItemMs: totalMs / (occupied * batches),
    itemsPerSecond: occupied * batches * 1000 / totalMs }
}

export type Boundary = 'wrap' | 'noise' | 'precision' | 'depth'
export function boundaryExperiment(kind: Boundary, engine: ToyBfvEngine): string {
  if (kind === 'wrap') {
    const result = engine.decryptScalar(engine.add(engine.encryptScalar(12), engine.encryptScalar(9)))
    return `Live toy BFV: 12 + 9 = 21 as integers, but 21 mod 17 = 4; decrypted result = ${result}. Correct ring arithmetic, wrong application encoding if you expected 21. Noise failure is not needed.`
  }
  if (kind === 'noise') {
    const ct = engine.encryptScalar(3)
    // Inject a known phase error; leave tracked message unchanged for diagnostics.
    ct.components[0][0] = (ct.components[0][0] + engine.delta) % engine.params.q
    return `Live toy BFV: expected 3; decrypted result = ${engine.decryptScalar(ct)} after adding Δ=${engine.delta} to c0[0]. The injected phase error crosses a decoding cell. This is controlled corruption, not a measured multiplication-depth limit.`
  }
  if (kind === 'precision') {
    const x = 0.3, scale = 16
    const decoded = Math.round(x * scale) / scale
    return `Scalar fixed-point model, not CKKS encryption: round(0.3 × 16) / 16 = ${decoded}; absolute error = ${Math.abs(decoded - x).toFixed(4)}. Encoding/rounding error exists even with zero encryption noise. Input resolution, output precision and comparison-gap guarantees are different quantities.`
  }
  return 'Level-accounting model, not a BFV failure threshold: a circuit with 4 sequential multiplications needs 4 levels under a one-level-per-multiply assumption. A 3-level allocation is insufficient even if the first result looks accurate. Actual noise, scale, coefficient recovery and rescaling constraints depend on the scheme, parameters and circuit; see the live noise exhibit and CKKS Lab.'
}

export function mergeTrace(left: number[], right: number[], repaired: boolean) {
  let li = 0, ri = 0
  const output: number[] = [], trace: string[] = []
  for (let step = 0; step < left.length + right.length; step++) {
    const lval = left[li] ?? 0, rval = right[ri] ?? 0
    const takeLeft = repaired
      ? li < left.length && (ri >= right.length || lval <= rval)
      : lval <= rval
    trace.push(`step ${step}: left[${li}]=${lval}${li >= left.length ? ' (out of bounds)' : ''}, right[${ri}]=${rval}${ri >= right.length ? ' (out of bounds)' : ''}; take ${takeLeft ? 'left' : 'right'}`)
    output.push(takeLeft ? lval : rval)
    if (takeLeft) li++; else ri++
  }
  return { output, trace }
}

export function radixTrace(input: number[], digitBits: number, bits: number, repaired: boolean) {
  if (![digitBits, bits].every(Number.isInteger) || digitBits < 1 || digitBits > 4 || bits < 1 || bits > 16 ||
    input.some(v => !Number.isInteger(v) || v < 0 || v >= 2 ** bits)) throw new Error('Unsigned bounded integers required.')
  const mask = repaired ? (1 << digitBits) - 1 : 1 << (digitBits - 1)
  let output = [...input]
  const trace: string[] = []
  for (let shift = 0; shift < bits; shift += digitBits) {
    const digits = output.map(v => (v >> shift) & mask)
    const destinations = digits.map((d, i) => digits.filter((e, j) => e < d || (e === d && j < i)).length)
    const next = new Array<number>(input.length).fill(0)
    for (let i = 0; i < output.length; i++) next[destinations[i]] = output[i]
    trace.push(`shift ${shift}, mask ${mask}: digits [${digits}], destinations [${destinations}] → [${next}]`)
    output = next
  }
  return { output, trace }
}

export function ranks(input: number[], repaired: boolean): number[] {
  return input.map((x, i) => repaired
    ? input.filter((y, j) => y < x || (y === x && j < i)).length
    : input.filter(y => x >= y).length - 1)
}
