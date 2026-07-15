# crypto-lab-fhe-arena

## What It Is

FHE Arena runs a live toy of **BFV** (Fan-Vercauteren, 2012) — one of the two most widely deployed integer Fully Homomorphic Encryption schemes — and **compares** it against its close relative **BGV** (Brakerski-Gentry-Vaikuntanathan, 2012) in the tables and prose. Only BFV is implemented as a runnable engine here; BGV is discussed for contrast, not executed. Both schemes encrypt integers and support addition and multiplication directly on ciphertexts, allowing a server to compute on encrypted data without ever decrypting it. The central challenge is the noise budget: every operation adds noise to the ciphertext, and when noise exceeds a threshold, decryption fails. BGV manages this via modulus switching; BFV via rescaling. This demo is the integer FHE companion to Blind Oracle (TFHE bit-level FHE).

> **Honesty note.** The live engine is a *toy* BFV over real negacyclic ring arithmetic at insecure parameters (n=64, t=17, q=65537). It samples randomness with `Math.random()` (not cryptographically secure) and does **not** implement production BFV *SIMD batching*: values are packed into polynomial **coefficient** slots, so batched **addition** is genuinely slot-wise, but multiplication is a negacyclic convolution that mixes slots — unlike real CRT/NTT-slot SIMD. BGV is not a second live engine. Everything the demo *computes* (encrypt/decrypt, add, multiply→relinearize→rescale, noise budgets, the vote tally) is real and unit-tested; nothing is faked.

## When to Use It

- BFV: encrypted integer arithmetic, simple-to-moderate computation depth, most accessible starting point (Microsoft SEAL default)
- BGV: deeper computation requiring more multiplication levels, statistical workloads on encrypted integers
- Both: encrypted database queries, private genomics, encrypted voting tallying, private machine learning inference on integer data
- Neither is suitable for encrypted floating-point / approximate arithmetic — use CKKS for that (see crypto-lab-ckks-lab)
- Neither supports unlimited computation depth without bootstrapping (expensive — plan your circuit depth carefully)
- Not yet practical for real-time applications without GPU acceleration (2024 state of the art for deep circuits)
- Do NOT use this for real encrypted workloads — it runs toy parameters for teaching, not production FHE security.

## Live Demo

**[systemslibrarian.github.io/crypto-lab-fhe-arena](https://systemslibrarian.github.io/crypto-lab-fhe-arena/)**

Every number in the demo is computed by a real (toy-parameter) BFV engine over genuine negacyclic ring arithmetic — nothing is faked. The lab is built to *teach*, so the hidden machinery is made visible:

- **The decryption equation, live.** Exhibit 2 opens up exactly what the secret key recovers: `c0 + c1·s = Δ·m + e`. You see the clean signal `Δ·m`, the actual recovered value, and the noise `e` — so "noise" stops being abstract.
- **Noise budget in bits.** Every meter reports the budget in *bits* (like Microsoft SEAL's `invariant_noise_budget`), color-coded healthy → low → fails, alongside a visual bar.
- **Measured, not asserted.** Exhibit 3 logs the *real measured* noise and budget after each operation and plots it on a live chart — addition steps glide flat, each multiplication drops a cliff. A "multiply until it breaks" button animates the collapse to the decryption-failure floor.
- **Honest about failure.** When the budget is exhausted the demo shows the *actual* (corrupted) decryption and explains that the budget is a guarantee over the whole ciphertext — a single slot may coincidentally survive while the rest is garbage. Nothing is faked to look broken.
- **Semantic security, shown.** Encrypt the same value twice and watch the ciphertexts diverge completely while both still decrypt correctly — a concrete demonstration of IND-CPA randomized encryption.
- **Bootstrapping, shown.** Exhaust the budget, then press *Bootstrap* and watch it snap back to full — with an honest note that real bootstrapping refreshes noise homomorphically (without the key) and must run *before* overflow, not after.
- **The parameter tradeoff, hands-on.** A slider over the real Homomorphic Encryption Standard (128-bit security) shows how a larger degree `n` buys a larger modulus `q` → more multiplicative depth → but slower operations.
- **A live private computation.** Cast ten secret Yes/No ballots, encrypt them, homomorphically sum the ciphertexts, and decrypt *only the tally* — the headline FHE application, verifiable end to end, with no individual vote ever revealed.
- **Verification badges.** Encrypted results are checked against plaintext arithmetic with ✓/✗ badges, so the homomorphic payoff is unmissable.

Six exhibits: the core idea (compute on locked boxes, with a client/server trust diagram); encrypt-add-decrypt with the live `Δ·m + e` reveal and a semantic-security demo; the noise-budget visualizer with a live chart, animated "multiply until it breaks", and a bootstrapping refresh; multiplication, relinearization (2→3→2 ciphertext components) and coefficient packing (batched add); a BGV vs BFV vs TFHE comparison table, decision tree, and interactive parameter explorer; and real-world FHE deployments capped by a live encrypted vote tally.

## What Can Go Wrong

- **Noise budget exhaustion.** Every homomorphic operation grows ciphertext noise; exceed the budget and decryption silently returns garbage. Multiplicative depth must be planned before the circuit is built.
- **Wrong scheme for the data.** BGV/BFV are integer schemes. Forcing real-valued or approximate workloads onto them gives poor results — CKKS exists for that, with its own approximation caveats.
- **Insecure parameter selection.** Polynomial degree and modulus must follow the Homomorphic Encryption Standard; ad-hoc parameters can drop below the claimed security level or fail to support the intended depth.
- **No integrity by default.** FHE ciphertexts are malleable by design (that is the whole point), so a malicious server can tamper with results unless you add separate verification. IND-CPA security does not imply CCA security.
- **Bootstrapping cost and timing.** Bootstrapping refreshes noise but is expensive and must run before overflow, not after; treating it as free or as a recovery step after corruption does not work.

## Real-World Usage

- **Private machine learning inference.** Encrypted prediction services let a model run on a client's encrypted inputs without seeing the data, a primary commercial driver for FHE.
- **Encrypted database and analytics queries.** Servers compute sums, counts, and statistics over encrypted records, relevant to regulated medical and financial data.
- **Private genomics.** Encrypted comparison of genomic data is a long-standing FHE research and deployment target where data sensitivity is extreme.
- **Secure voting and aggregation.** Homomorphic summation lets only the final tally be decrypted while individual contributions stay encrypted.
- **Production libraries.** Microsoft SEAL, OpenFHE, HElib, and PALISADE implement BGV/BFV/CKKS and are used in research and industry FHE deployments.

## How to Run Locally

```bash
git clone https://github.com/systemslibrarian/crypto-lab-fhe-arena
cd crypto-lab-fhe-arena
npm install
npm run dev
```

## Tests

```bash
npm test          # vitest: toy-BFV crypto unit tests (round-trip, add, multiply→relinearize→rescale, noise budget, vote tally)
npm run test:a11y # Playwright + axe-core WCAG A/AA gate (both themes)
```

`npm test` runs the crypto unit tests in `src/toyFhe.test.ts` and does **not** collect the Playwright a11y spec in `e2e/`. The tests assert the claims the demo makes on screen: encrypt/decrypt round-trips for every plaintext, homomorphic add and multiply match plaintext arithmetic mod *t*, relinearization shrinks 3→2 components without changing the value, the noise budget is a real measurement (multiply consumes far more than add and eventually reaches 0 bits), encryption is randomized (IND-CPA), and the encrypted vote tally returns the true sum.

## Related Demos

- [crypto-lab-blind-oracle](https://systemslibrarian.github.io/crypto-lab-blind-oracle/) — TFHE bit-level FHE, the companion scheme to this integer FHE lab.
- [crypto-lab-ckks-lab](https://systemslibrarian.github.io/crypto-lab-ckks-lab/) — CKKS approximate FHE for encrypted real-valued / inference workloads.
- [crypto-lab-paillier-gate](https://systemslibrarian.github.io/crypto-lab-paillier-gate/) — Paillier additive homomorphic encryption for private aggregation.
- [crypto-lab-elgamal-plain](https://systemslibrarian.github.io/crypto-lab-elgamal-plain/) — ElGamal homomorphism and re-randomization.

---

*"So whether you eat or drink or whatever you do, do it all for the glory of God." — 1 Corinthians 10:31*
