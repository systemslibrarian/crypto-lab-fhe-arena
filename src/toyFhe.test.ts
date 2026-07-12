import { describe, it, expect } from 'vitest'
import { ToyBfvEngine } from './toyFhe'

// These tests guard the claims the demo makes on-screen ("every number is
// computed, not faked / measured, not asserted"). They exercise the real toy
// BFV engine over its genuine negacyclic ring arithmetic:
//   - encrypt/decrypt round-trip (scalar + packed vector)
//   - homomorphic addition matches plaintext (mod t)
//   - homomorphic multiply -> relinearize -> rescale matches plaintext (mod t)
//   - the noise budget is a real, monotonically-consumed measurement
//   - IND-CPA style randomization (same plaintext -> different ciphertext)
//   - the encrypted vote-tally application returns the true sum
//
// The engine samples fresh randomness per ciphertext, so any single run could
// in principle draw an unlucky noise vector. We repeat the probabilistic checks
// over many independent engines/encryptions to make the suite deterministic in
// practice while still testing the real randomized construction.

const t = new ToyBfvEngine().params.t // plaintext modulus (17)

describe('encode/encrypt/decrypt round-trip', () => {
  it('recovers every plaintext value in [0, t) for a fresh scalar ciphertext', () => {
    const engine = new ToyBfvEngine()
    for (let v = 0; v < t; v += 1) {
      const ct = engine.encryptScalar(v)
      expect(engine.decryptScalar(ct)).toBe(v)
    }
  })

  it('reduces the plaintext mod t on encryption', () => {
    const engine = new ToyBfvEngine()
    // t + 5 must decrypt to 5, not t + 5.
    expect(engine.decryptScalar(engine.encryptScalar(t + 5))).toBe(5)
  })

  it('round-trips a packed vector slot-by-slot', () => {
    const engine = new ToyBfvEngine()
    const values = [1, 2, 3, 4]
    const ct = engine.encryptVector(values)
    expect(engine.decryptVector(ct, values.length)).toEqual(values)
  })
})

describe('homomorphic addition (the cheap operation)', () => {
  it('ct(a) + ct(b) decrypts to (a + b) mod t across many pairs', () => {
    const engine = new ToyBfvEngine()
    for (let a = 0; a < t; a += 1) {
      for (const b of [0, 1, 5, t - 1]) {
        const ct = engine.add(engine.encryptScalar(a), engine.encryptScalar(b))
        expect(engine.decryptScalar(ct)).toBe((a + b) % t)
      }
    }
  })

  it('adds packed vectors slot-wise in a single operation', () => {
    const engine = new ToyBfvEngine()
    const a = [1, 2, 3, 4]
    const b = [5, 6, 7, 8]
    const sum = engine.add(engine.encryptVector(a), engine.encryptVector(b))
    const expected = a.map((x, i) => (x + b[i]) % t)
    expect(engine.decryptVector(sum, a.length)).toEqual(expected)
  })

  it('rejects adding ciphertexts at mismatched scales', () => {
    const engine = new ToyBfvEngine()
    const fresh = engine.encryptScalar(3)
    const product = engine.multiplyNoRelin(engine.encryptScalar(2), engine.encryptScalar(2))
    // A 3-part product (still at Delta scale here) is fine, but force a scale
    // mismatch by hand to prove the guard fires.
    const scaled = { ...fresh, scale: fresh.scale * 4 }
    expect(() => engine.add(fresh, scaled)).toThrow(/scale/i)
    // product path used elsewhere; reference to avoid unused warnings
    expect(product.components.length).toBe(3)
  })
})

describe('homomorphic multiplication + relinearization (the costly operation)', () => {
  it('multiply -> relinearize -> rescale decrypts to (a * b) mod t', () => {
    // Repeat over independent engines: multiply burns most of the toy budget,
    // so we confirm the construction is correct across many key/noise draws.
    let correct = 0
    const trials = 40
    for (let k = 0; k < trials; k += 1) {
      const engine = new ToyBfvEngine()
      const a = k % t
      const b = (k * 3 + 1) % t
      const raw = engine.multiplyNoRelin(engine.encryptScalar(a), engine.encryptScalar(b))
      const ct = engine.rescaleToDelta(engine.relinearize(raw))
      if (engine.decryptScalar(ct) === (a * b) % t) correct += 1
    }
    // The toy multiply is exact for a single level at these parameters; require
    // it to hold in every trial. If the tensor/rescale math regresses this drops.
    expect(correct).toBe(trials)
  })

  it('multiplication produces a 3-part ciphertext; relinearize shrinks it to 2', () => {
    const engine = new ToyBfvEngine()
    const product = engine.multiplyNoRelin(engine.encryptScalar(5), engine.encryptScalar(6))
    expect(product.components.length).toBe(3)
    const relin = engine.relinearize(product)
    expect(relin.components.length).toBe(2)
    // relinearization must not change the value it decrypts to
    expect(engine.decryptScalar(engine.rescaleToDelta(relin))).toBe((5 * 6) % t)
  })

  it('multiply by 0 and by 1 behave as plaintext identities', () => {
    const engine = new ToyBfvEngine()
    const seven = engine.encryptScalar(7)
    const zero = engine.rescaleToDelta(
      engine.relinearize(engine.multiplyNoRelin(seven, engine.encryptScalar(0)))
    )
    const same = engine.rescaleToDelta(
      engine.relinearize(engine.multiplyNoRelin(seven, engine.encryptScalar(1)))
    )
    expect(engine.decryptScalar(zero)).toBe(0)
    expect(engine.decryptScalar(same)).toBe(7)
  })
})

describe('noise budget is a real measurement, not a decoration', () => {
  it('a fresh ciphertext has a healthy, positive budget', () => {
    const engine = new ToyBfvEngine()
    const ct = engine.encryptScalar(3)
    const bits = engine.noiseBudgetBits(ct)
    expect(bits).toBeGreaterThan(0)
    expect(engine.noiseBudgetBits(ct)).toBeLessThanOrEqual(engine.freshBudgetBits + 1e-9)
    expect(engine.noiseHealth(ct)).toBe('healthy')
    expect(engine.noiseBudgetPct(ct)).toBeLessThanOrEqual(100)
  })

  it('multiplication consumes far more budget than addition', () => {
    // Averaged over trials because both quantities are randomized.
    let addRemaining = 0
    let mulRemaining = 0
    const trials = 30
    for (let k = 0; k < trials; k += 1) {
      const engine = new ToyBfvEngine()
      const fresh = engine.encryptScalar(3)
      const start = engine.noiseBudgetBits(fresh)

      const added = engine.add(fresh, engine.encryptScalar(1))
      addRemaining += engine.noiseBudgetBits(added) / start

      const multiplied = engine.rescaleToDelta(
        engine.relinearize(engine.multiplyNoRelin(fresh, engine.encryptScalar(2)))
      )
      mulRemaining += engine.noiseBudgetBits(multiplied) / start
    }
    // Addition should retain nearly all of its budget; multiply should retain
    // dramatically less. This encodes the exhibit's whole thesis.
    expect(addRemaining / trials).toBeGreaterThan(0.8)
    expect(mulRemaining / trials).toBeLessThan(addRemaining / trials)
  })

  it('repeated multiplication eventually exhausts the budget to 0 bits', () => {
    const engine = new ToyBfvEngine()
    let ct = engine.encryptScalar(1)
    let hitZero = false
    for (let i = 0; i < 12; i += 1) {
      ct = engine.rescaleToDelta(
        engine.relinearize(engine.multiplyNoRelin(ct, engine.encryptScalar(1)))
      )
      if (engine.noiseBudgetBits(ct) === 0) {
        hitZero = true
        break
      }
    }
    expect(hitZero).toBe(true)
    // budget is clamped and never negative
    expect(engine.noiseBudgetBits(ct)).toBeGreaterThanOrEqual(0)
  })
})

describe('semantic security (IND-CPA randomization)', () => {
  it('encrypting the same value twice yields different ciphertexts that both decrypt correctly', () => {
    const engine = new ToyBfvEngine()
    const a = engine.encryptScalar(9)
    const b = engine.encryptScalar(9)
    expect(JSON.stringify(a.components)).not.toBe(JSON.stringify(b.components))
    expect(engine.decryptScalar(a)).toBe(9)
    expect(engine.decryptScalar(b)).toBe(9)
  })
})

describe('encrypted vote tally (the headline application)', () => {
  it('summing encrypted 0/1 ballots decrypts to the true tally, budget intact', () => {
    const engine = new ToyBfvEngine()
    const ballots = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1]
    const cts = ballots.map((v) => engine.encryptScalar(v))
    const tally = cts.reduce((acc, ct) => engine.add(acc, ct))
    const expected = ballots.reduce((s, v) => s + v, 0)
    expect(engine.decryptScalar(tally)).toBe(expected)
    // ten cheap additions must not exhaust the budget
    expect(engine.noiseBudgetBits(tally)).toBeGreaterThan(0)
  })
})
