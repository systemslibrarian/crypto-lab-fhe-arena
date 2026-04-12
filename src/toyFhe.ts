import type { ToyCiphertext, ToyKeySet } from './types'

type InternalCiphertext = ToyCiphertext & {
  scale: number
  message: number[]
}

type ToyParams = {
  n: number
  t: number
  q: number
}

const BASE_PARAMS: ToyParams = {
  n: 64,
  t: 17,
  q: 65537
}

function mod(x: number, m: number): number {
  const r = x % m
  return r < 0 ? r + m : r
}

function centerLift(x: number, q: number): number {
  const r = mod(x, q)
  return r > q / 2 ? r - q : r
}

function zeroPoly(n: number): number[] {
  return Array.from({ length: n }, () => 0)
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPoly(n: number, q: number): number[] {
  return Array.from({ length: n }, () => randomInt(0, q - 1))
}

function smallNoisePoly(n: number): number[] {
  return Array.from({ length: n }, () => randomInt(-1, 1))
}

function polyAdd(a: number[], b: number[], q: number): number[] {
  return a.map((v, i) => mod(v + b[i], q))
}

function polySub(a: number[], b: number[], q: number): number[] {
  return a.map((v, i) => mod(v - b[i], q))
}

function polyMulNegacyclic(a: number[], b: number[], n: number, q: number): number[] {
  const out = zeroPoly(n)
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      const k = i + j
      if (k < n) {
        out[k] = mod(out[k] + a[i] * b[j], q)
      } else {
        out[k - n] = mod(out[k - n] - a[i] * b[j], q)
      }
    }
  }
  return out
}

function polyDivRound(a: number[], d: number, q: number): number[] {
  return a.map((v) => mod(Math.round(centerLift(v, q) / d), q))
}

function encodeMessageScalar(value: number, n: number, t: number, q: number, scale: number): number[] {
  const out = zeroPoly(n)
  out[0] = mod(value, t) * scale % q
  return out
}

function encodeMessageVector(values: number[], n: number, t: number, q: number, scale: number): number[] {
  const out = zeroPoly(n)
  const slots = Math.min(values.length, Math.floor(n / 2))
  for (let i = 0; i < slots; i += 1) {
    out[i] = mod(values[i], t) * scale % q
  }
  return out
}

function decodeScalar(poly: number[], t: number, q: number, scale: number): number {
  const v = Math.round(centerLift(poly[0], q) / scale)
  return mod(v, t)
}

function decodeVector(poly: number[], count: number, t: number, q: number, scale: number): number[] {
  const out: number[] = []
  for (let i = 0; i < count; i += 1) {
    const v = Math.round(centerLift(poly[i], q) / scale)
    out.push(mod(v, t))
  }
  return out
}

function trimHex(poly: number[]): string {
  return poly.map((v) => v.toString(16).padStart(4, '0')).join(' ')
}

export class ToyBfvEngine {
  readonly params = BASE_PARAMS
  readonly delta = Math.floor(BASE_PARAMS.q / BASE_PARAMS.t)
  readonly keySet: ToyKeySet

  constructor() {
    const s = smallNoisePoly(this.params.n).map((v) => mod(v, this.params.q))
    const a = randomPoly(this.params.n, this.params.q)
    const s2 = polyMulNegacyclic(s, s, this.params.n, this.params.q)
    const rk0 = polySub(s2, polyMulNegacyclic(a, s, this.params.n, this.params.q), this.params.q)
    const rk1 = a
    this.keySet = {
      secretKey: s,
      relinKey: [rk0, rk1]
    }
  }

  private encryptEncoded(m: number[], message: number[], scale: number): InternalCiphertext {
    const a = randomPoly(this.params.n, this.params.q)
    const e = smallNoisePoly(this.params.n).map((v) => mod(v, this.params.q))
    const aTimesS = polyMulNegacyclic(a, this.keySet.secretKey, this.params.n, this.params.q)
    const c0 = polyAdd(polySub(m, aTimesS, this.params.q), e, this.params.q)
    const c1 = a
    return {
      components: [c0, c1],
      noise: e,
      q: this.params.q,
      t: this.params.t,
      n: this.params.n,
      encoding: `Delta=${scale}`,
      scale,
      message
    }
  }

  encryptScalar(value: number): InternalCiphertext {
    const m = encodeMessageScalar(value, this.params.n, this.params.t, this.params.q, this.delta)
    return this.encryptEncoded(m, [mod(value, this.params.t)], this.delta)
  }

  encryptVector(values: number[]): InternalCiphertext {
    const reduced = values.map((v) => mod(v, this.params.t))
    const m = encodeMessageVector(reduced, this.params.n, this.params.t, this.params.q, this.delta)
    return this.encryptEncoded(m, reduced, this.delta)
  }

  add(a: InternalCiphertext, b: InternalCiphertext): InternalCiphertext {
    if (a.scale !== b.scale) {
      throw new Error('Scale mismatch for add')
    }

    return {
      components: a.components.map((poly, i) => polyAdd(poly, b.components[i], this.params.q)),
      noise: zeroPoly(this.params.n),
      q: this.params.q,
      t: this.params.t,
      n: this.params.n,
      encoding: `Delta=${a.scale}`,
      scale: a.scale,
      message: a.message.map((v, i) => mod(v + b.message[i], this.params.t))
    }
  }

  multiplyNoRelin(a: InternalCiphertext, b: InternalCiphertext): InternalCiphertext {
    const c00 = polyMulNegacyclic(a.components[0], b.components[0], this.params.n, this.params.q)
    const c01 = polyMulNegacyclic(a.components[0], b.components[1], this.params.n, this.params.q)
    const c10 = polyMulNegacyclic(a.components[1], b.components[0], this.params.n, this.params.q)
    const c11 = polyMulNegacyclic(a.components[1], b.components[1], this.params.n, this.params.q)

    return {
      components: [c00, polyAdd(c01, c10, this.params.q), c11],
      noise: zeroPoly(this.params.n),
      q: this.params.q,
      t: this.params.t,
      n: this.params.n,
      encoding: `Delta^2=${a.scale * b.scale}`,
      scale: a.scale * b.scale,
      message: a.message.map((v, i) => mod(v * b.message[i], this.params.t))
    }
  }

  relinearize(ct: InternalCiphertext): InternalCiphertext {
    if (ct.components.length !== 3) {
      return ct
    }

    const [rk0, rk1] = this.keySet.relinKey
    const c2rk0 = polyMulNegacyclic(ct.components[2], rk0, this.params.n, this.params.q)
    const c2rk1 = polyMulNegacyclic(ct.components[2], rk1, this.params.n, this.params.q)

    return {
      ...ct,
      components: [
        polyAdd(ct.components[0], c2rk0, this.params.q),
        polyAdd(ct.components[1], c2rk1, this.params.q)
      ]
    }
  }

  rescaleToDelta(ct: InternalCiphertext): InternalCiphertext {
    if (ct.scale <= this.delta) {
      return ct
    }

    return {
      ...ct,
      components: ct.components.map((poly) => polyDivRound(poly, this.delta, this.params.q)),
      scale: Math.max(this.delta, Math.round(ct.scale / this.delta)),
      encoding: `Delta=${this.delta}`
    }
  }

  decryptPoly(ct: InternalCiphertext): number[] {
    const powers: number[][] = [
      Array.from({ length: this.params.n }, (_, i) => (i === 0 ? 1 : 0)),
      this.keySet.secretKey
    ]

    while (powers.length < ct.components.length) {
      const next = polyMulNegacyclic(
        powers[powers.length - 1],
        this.keySet.secretKey,
        this.params.n,
        this.params.q
      )
      powers.push(next)
    }

    let acc = zeroPoly(this.params.n)
    ct.components.forEach((poly, i) => {
      const part = polyMulNegacyclic(poly, powers[i], this.params.n, this.params.q)
      acc = polyAdd(acc, part, this.params.q)
    })

    return acc
  }

  decryptScalar(ct: InternalCiphertext): number {
    const pt = this.decryptPoly(ct)
    return decodeScalar(pt, this.params.t, this.params.q, ct.scale)
  }

  decryptVector(ct: InternalCiphertext, count: number): number[] {
    const pt = this.decryptPoly(ct)
    return decodeVector(pt, count, this.params.t, this.params.q, ct.scale)
  }

  noiseMagnitude(ct: InternalCiphertext): number {
    const decrypted = this.decryptPoly(ct)
    const expected = ct.message.length === 1
      ? encodeMessageScalar(ct.message[0], this.params.n, this.params.t, this.params.q, ct.scale)
      : encodeMessageVector(ct.message, this.params.n, this.params.t, this.params.q, ct.scale)

    let maxNoise = 0
    for (let i = 0; i < this.params.n; i += 1) {
      const err = Math.abs(centerLift(decrypted[i] - expected[i], this.params.q))
      if (err > maxNoise) {
        maxNoise = err
      }
    }

    return maxNoise
  }

  noiseBudgetPct(ct: InternalCiphertext): number {
    const threshold = ct.scale / 2
    const used = this.noiseMagnitude(ct)
    const remain = Math.max(0, 1 - used / Math.max(1, threshold))
    return Math.round(remain * 100)
  }

  formatCipher(ct: InternalCiphertext): string {
    return ct.components
      .map((poly, idx) => `c${idx}: ${trimHex(poly.slice(0, 12))} ...`)
      .join('\n')
  }

  randomGarbage(): number {
    return randomInt(0, this.params.t - 1)
  }

}

export type { InternalCiphertext }
