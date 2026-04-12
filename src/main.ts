import './style.css'
import { ToyBfvEngine, type InternalCiphertext } from './toyFhe'
import type { Theme } from './types'

const engine = new ToyBfvEngine()
const app = document.querySelector('#app') as HTMLDivElement

app.innerHTML = `
  <div class="app">
    <header class="app-header" role="banner">
      <button class="theme-toggle" data-theme-toggle aria-label="Switch to light mode">🌙</button>
      <h1>FHE Arena: BGV/BFV Integer Homomorphic Encryption</h1>
      <p class="subtitle">
        Educational implementation over toy parameters (n=64, t=17, q=65537) using real ring arithmetic and measured noise growth.
        <strong>Educational parameters — not production strength.</strong>
        Production BFV/BGV deployments use n &ge; 4096 and carefully selected coefficient modulus chains.
      </p>
    </header>

    <main class="exhibits" id="main-content" aria-label="Six interactive FHE exhibits">

      <section class="exhibit" id="exhibit-1" aria-labelledby="e1-heading" tabindex="-1">
        <h2 id="e1-heading">Exhibit 1: What BGV/BFV FHE Is</h2>
        <p>
          The core capability: encrypt integers, compute addition and multiplication on ciphertexts, and decrypt to the same answer as plaintext arithmetic.
          Example: Encrypt(3) + Encrypt(4) decrypts to 7, and Encrypt(3) &times; Encrypt(4) decrypts to 12, while the server never sees the plaintext values.
        </p>
        <div class="grid-2">
          <div>
            <h3>BGV vs BFV</h3>
            <p>Both are RLWE-based integer FHE schemes with noise growth.</p>
            <p>BGV uses modulus switching: modulus shrinks by level to keep relative noise controlled.</p>
            <p>BFV uses a scaling and rescaling style for integer plaintext space and is commonly used as a first SEAL mode.</p>
          </div>
          <div>
            <h3>Four Generations</h3>
            <ol>
              <li>Gentry 2009: first bootstrapped FHE.</li>
              <li>BGV/BFV 2011-2012: leveled practical integer FHE.</li>
              <li>TFHE 2016: fast bootstrapped bit-level gates.</li>
              <li>CKKS 2017: approximate arithmetic for real-valued workloads.</li>
            </ol>
          </div>
        </div>
        <p>Key parameters: polynomial modulus degree n, coefficient modulus q, plaintext modulus t, and security level from n and q jointly.</p>
        <div class="callout" role="note">
          <strong>Why this matters:</strong> integer FHE enables private database query workflows, genomics analytics, encrypted vote tallying, and private inference.
          Libraries with BGV/BFV support include Microsoft SEAL, IBM HElib, and OpenFHE.
        </div>
        <p>
          For bit-level FHE (TFHE), see Blind Oracle:
          <a href="https://systemslibrarian.github.io/crypto-lab-blind-oracle/" target="_blank" rel="noreferrer">https://systemslibrarian.github.io/crypto-lab-blind-oracle/</a>
        </p>
      </section>

      <section class="exhibit" id="exhibit-2" aria-labelledby="e2-heading" tabindex="-1">
        <h2 id="e2-heading">Exhibit 2: Encrypt, Add, Decrypt</h2>
        <p class="footer-note">Educational parameters only. Arithmetic is mod t&nbsp;=&nbsp;17.</p>
        <div class="grid-2">
          <div>
            <label for="a2">Integer A (0–16)</label>
            <input id="a2" type="number" min="0" max="16" value="3" aria-describedby="e2-note" />
          </div>
          <div>
            <label for="b2">Integer B (0–16)</label>
            <input id="b2" type="number" min="0" max="16" value="4" aria-describedby="e2-note" />
          </div>
        </div>
        <p id="e2-note" class="sr-only">Values are computed mod 17 using toy BFV encryption.</p>
        <div class="row" role="toolbar" aria-label="Exhibit 2 controls">
          <button class="action" data-e2-enc-a>Encrypt A</button>
          <button class="action" data-e2-enc-b>Encrypt B</button>
          <button class="action" data-e2-add>Add ciphertexts</button>
          <button class="action action-orange" data-e2-dec>Decrypt result</button>
        </div>
        <div class="grid-3">
          <div>
            <h3 id="e2-cta-label">ct(A)</h3>
            <pre class="mono" data-e2-cta aria-labelledby="e2-cta-label" role="region" aria-live="polite">awaiting...</pre>
          </div>
          <div>
            <h3 id="e2-ctb-label">ct(B)</h3>
            <pre class="mono" data-e2-ctb aria-labelledby="e2-ctb-label" role="region" aria-live="polite">awaiting...</pre>
          </div>
          <div>
            <h3 id="e2-sum-label">ct(A+B)</h3>
            <pre class="mono" data-e2-sum aria-labelledby="e2-sum-label" role="region" aria-live="polite">awaiting...</pre>
          </div>
        </div>
        <p data-e2-result aria-live="polite" role="status">Expected result: (3 + 4) mod 17 = 7</p>
        <div class="budget" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="Noise budget" data-e2-budget-bar>
          <div class="budget-fill" data-e2-budget style="width:100%"></div>
        </div>
        <p data-e2-budget-label aria-live="polite">Noise budget remaining before decryption fails: 100%</p>
        <div class="callout" role="note"><strong>Key insight:</strong> the server adds random-looking polynomials, never plaintext integers.</div>
      </section>

      <section class="exhibit" id="exhibit-3" aria-labelledby="e3-heading" tabindex="-1">
        <h2 id="e3-heading">Exhibit 3: Noise Budget Visualizer</h2>
        <p>
          RLWE ciphertexts include noise for security. Addition grows noise slowly; multiplication grows noise sharply.
          When noise exceeds threshold, decryption fails.
        </p>
        <div class="row" role="toolbar" aria-label="Exhibit 3 controls">
          <button class="action" data-e3-reset>Reset</button>
          <button class="action" data-e3-add>Add</button>
          <button class="action action-orange" data-e3-mul>Multiply</button>
          <button class="action" data-e3-dec>Attempt decrypt</button>
        </div>
        <p data-e3-ops aria-live="polite" role="status">Sequence: fresh</p>
        <div class="budget" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="Noise budget" data-e3-budget-bar>
          <div class="budget-fill" data-e3-budget style="width:100%"></div>
        </div>
        <p data-e3-budget-label aria-live="polite">Budget: 100%</p>
        <p data-e3-decrypt aria-live="assertive" role="alert">Decrypt output: 3</p>
        <table aria-label="Approximate noise budget after sequential multiplications">
          <thead><tr><th scope="col">Operation sequence</th><th scope="col">Budget remaining (approx)</th></tr></thead>
          <tbody data-e3-table></tbody>
        </table>
        <div class="callout" role="note">
          <strong>Modulus switching (BGV):</strong> reduces modulus level after multiplication so noise remains proportionally manageable across levels.
          When levels are exhausted, bootstrapping is needed — homomorphically decrypting to refresh the noise budget, a very expensive operation.
        </div>
      </section>

      <section class="exhibit" id="exhibit-4" aria-labelledby="e4-heading" tabindex="-1">
        <h2 id="e4-heading">Exhibit 4: Multiplication, Relinearization, and Batching</h2>
        <p class="footer-note">Relinearization key in this toy demo is educational and not production-secure.</p>
        <div class="grid-2">
          <div>
            <label for="a4">A (0–16)</label>
            <input id="a4" type="number" min="0" max="16" value="5" />
          </div>
          <div>
            <label for="b4">B (0–16)</label>
            <input id="b4" type="number" min="0" max="16" value="6" />
          </div>
        </div>
        <div class="row" role="toolbar" aria-label="Multiplication controls">
          <button class="action" data-e4-enc>Encrypt A and B</button>
          <button class="action" data-e4-mul>Multiply (no relinearization)</button>
          <button class="action" data-e4-relin>Relinearize</button>
          <button class="action" data-e4-dec>Decrypt</button>
        </div>
        <p data-e4-info aria-live="polite" role="status">ciphertext components: 2</p>
        <pre class="mono" data-e4-ct role="region" aria-label="Multiplication ciphertext" aria-live="polite">awaiting...</pre>
        <div class="budget" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="Noise budget" data-e4-budget-bar>
          <div class="budget-fill" data-e4-budget style="width:100%"></div>
        </div>
        <p data-e4-budget-label aria-live="polite">Budget: 100%</p>

        <h3>Batching (SIMD) Demo</h3>
        <p>Enter 4 integers each (0–16), comma-separated. One ciphertext operation computes 4 additions in parallel.</p>
        <div class="grid-2">
          <div>
            <label for="batch-a">Batch A</label>
            <textarea id="batch-a" data-e4-batch-a rows="2">1,2,3,4</textarea>
          </div>
          <div>
            <label for="batch-b">Batch B</label>
            <textarea id="batch-b" data-e4-batch-b rows="2">5,6,7,8</textarea>
          </div>
        </div>
        <div class="row" role="toolbar" aria-label="Batching controls">
          <button class="action" data-e4-batch-enc>Encrypt batches</button>
          <button class="action" data-e4-batch-add>Add batches</button>
          <button class="action action-orange" data-e4-batch-dec>Decrypt result</button>
        </div>
        <p data-e4-batch-out aria-live="polite" role="status">Result: awaiting batch operation</p>
      </section>

      <section class="exhibit" id="exhibit-5" aria-labelledby="e5-heading" tabindex="-1">
        <h2 id="e5-heading">Exhibit 5: BGV vs BFV vs TFHE</h2>
        <div class="table-wrap">
          <table aria-label="Comparison of BGV, BFV, and TFHE schemes">
            <thead>
              <tr><th scope="col">Property</th><th scope="col">BGV</th><th scope="col">BFV</th><th scope="col">TFHE</th></tr>
            </thead>
            <tbody>
              <tr><td>Data type</td><td>Integers mod t</td><td>Integers mod t</td><td>Single bits</td></tr>
              <tr><td>Operations</td><td>Add, multiply</td><td>Add, multiply</td><td>Boolean gates</td></tr>
              <tr><td>Noise management</td><td>Modulus switching</td><td>Scaling and rescaling</td><td>Frequent bootstrapping</td></tr>
              <tr><td>Multiplication depth</td><td>~10–30 levels</td><td>~10–20 levels</td><td>Unlimited with bootstrap</td></tr>
              <tr><td>Batching support</td><td>Yes (CRT packing)</td><td>Yes (CRT packing)</td><td>No</td></tr>
              <tr><td>Best for</td><td>Deeper integer circuits</td><td>Accessible integer workloads</td><td>Arbitrary bit logic</td></tr>
              <tr><td>Libraries</td><td>HElib, OpenFHE</td><td>SEAL (default), OpenFHE</td><td>TFHE-rs, Concrete</td></tr>
              <tr><td>In crypto-lab</td><td>This demo</td><td>This demo</td><td>Blind Oracle</td></tr>
            </tbody>
          </table>
        </div>
        <div class="callout" role="note">
          <strong>Decision tree:</strong> integer statistics &rarr; BFV/BGV, deep multiplications &rarr; BGV, arbitrary boolean logic &rarr; TFHE,
          approximate real arithmetic &rarr; CKKS.
        </div>
        <div class="row" role="toolbar" aria-label="Timing test">
          <button class="action" data-e5-run>Run BFV toy add timing</button>
        </div>
        <p data-e5-time aria-live="polite" role="status">Timing: awaiting run</p>
        <p>
          TFHE comparison (from Blind Oracle): bit-level operations have higher per-value overhead but support flexible boolean circuits.
        </p>
        <nav aria-label="Cross-demo links">
          <ul class="link-list">
            <li><a href="https://systemslibrarian.github.io/crypto-lab-blind-oracle/" target="_blank" rel="noreferrer">Blind Oracle (TFHE)</a></li>
            <li><a href="https://systemslibrarian.github.io/crypto-lab-ckks-lab/" target="_blank" rel="noreferrer">CKKS Lab (Approximate FHE)</a></li>
            <li><a href="https://systemslibrarian.github.io/crypto-compare/" target="_blank" rel="noreferrer">Crypto Compare</a></li>
          </ul>
        </nav>
      </section>

      <section class="exhibit" id="exhibit-6" aria-labelledby="e6-heading" tabindex="-1">
        <h2 id="e6-heading">Exhibit 6: FHE Applications in Production</h2>
        <div class="grid-2">
          <div>
            <h3>Private database queries</h3>
            <p>BFV-style PIR (Private Information Retrieval) computes query responses without revealing which record was queried. Real system: Spiral (Microsoft Research, 2022).</p>
            <h3>Private genomics</h3>
            <p>BGV/BFV pipelines compute GWAS statistical tests over encrypted genotype vectors. Demonstrated annually in the iDASH competition using HElib BGV.</p>
            <h3>Encrypted ML inference</h3>
            <p>Neural networks run over encrypted input data. The model provider learns nothing about user data. Research: CryptoNets (Microsoft, 2016), HEAR, Pegasus.</p>
          </div>
          <div>
            <h3>Private voting tallying</h3>
            <p>Ballots encrypted as integers (0 or 1 per candidate) are summed via BFV addition without decrypting individual votes. Only the final tally is decrypted.</p>
            <h3>Financial privacy</h3>
            <p>Banks compute aggregate statistics on encrypted customer data for regulatory reporting without exposing individual records.</p>
            <h3>FHE readiness trend</h3>
            <p>2016: hours per operation. 2020: seconds. 2024: milliseconds for integer addition, ~100ms for multiplication. GPU-accelerated FHE enables real-time for select workloads.</p>
          </div>
        </div>
        <div class="callout" role="note">
          <strong>Why this matters:</strong> FHE is the &ldquo;holy grail&rdquo; of cryptography — computing on data without decrypting it.
          Understanding noise budgets, parameter selection, and the BGV/BFV tradeoff is what separates developers who can use FHE from those who just know it exists.
        </div>
      </section>
    </main>
  </div>
`

function getCurrentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

const themeToggleBtn = document.querySelector('[data-theme-toggle]') as HTMLButtonElement

function syncThemeToggle(theme: Theme): void {
  themeToggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️'
  themeToggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')
}

function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
  syncThemeToggle(theme)
}

syncThemeToggle(getCurrentTheme())
themeToggleBtn.addEventListener('click', () => {
  const next = getCurrentTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
})

function numFrom(id: string): number {
  const el = document.getElementById(id) as HTMLInputElement
  const n = Number(el.value)
  return Number.isFinite(n) ? Math.max(0, Math.min(16, Math.round(n))) : 0
}

function parseVec(value: string): number[] {
  return value
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isFinite(x))
    .slice(0, 4)
    .map((x) => ((Math.round(x) % 17) + 17) % 17)
}

function updateBudget(selectorFill: string, selectorLabel: string, ct: InternalCiphertext): void {
  const budget = engine.noiseBudgetPct(ct)
  const fill = document.querySelector(selectorFill) as HTMLDivElement
  const label = document.querySelector(selectorLabel) as HTMLParagraphElement
  const bar = fill.parentElement as HTMLElement
  fill.style.width = `${budget}%`
  bar.setAttribute('aria-valuenow', String(budget))
  label.textContent = `Noise budget remaining before decryption fails: ${budget}%`
}

let e2A: InternalCiphertext | null = null
let e2B: InternalCiphertext | null = null
let e2Sum: InternalCiphertext | null = null

const e2Cta = document.querySelector('[data-e2-cta]') as HTMLElement
const e2Ctb = document.querySelector('[data-e2-ctb]') as HTMLElement
const e2SumEl = document.querySelector('[data-e2-sum]') as HTMLElement
const e2Result = document.querySelector('[data-e2-result]') as HTMLElement

;(document.querySelector('[data-e2-enc-a]') as HTMLButtonElement).addEventListener('click', () => {
  e2A = engine.encryptScalar(numFrom('a2'))
  e2Cta.textContent = engine.formatCipher(e2A)
  updateBudget('[data-e2-budget]', '[data-e2-budget-label]', e2A)
})

;(document.querySelector('[data-e2-enc-b]') as HTMLButtonElement).addEventListener('click', () => {
  e2B = engine.encryptScalar(numFrom('b2'))
  e2Ctb.textContent = engine.formatCipher(e2B)
  updateBudget('[data-e2-budget]', '[data-e2-budget-label]', e2B)
})

;(document.querySelector('[data-e2-add]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e2A || !e2B) {
    e2Result.textContent = 'Encrypt both A and B first.'
    return
  }
  e2Sum = engine.add(e2A, e2B)
  e2SumEl.textContent = engine.formatCipher(e2Sum)
  updateBudget('[data-e2-budget]', '[data-e2-budget-label]', e2Sum)
})

;(document.querySelector('[data-e2-dec]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e2Sum) {
    e2Result.textContent = 'Add ciphertexts first.'
    return
  }
  const a = numFrom('a2')
  const b = numFrom('b2')
  const dec = engine.decryptScalar(e2Sum)
  e2Result.textContent = `Decrypted result: ${dec}; verify (${a} + ${b}) mod 17 = ${(a + b) % 17}`
})

let e3Ct = engine.encryptScalar(3)
let e3Ops: string[] = []
const e3OpsEl = document.querySelector('[data-e3-ops]') as HTMLElement
const e3DecEl = document.querySelector('[data-e3-decrypt]') as HTMLElement
const e3BudgetFill = document.querySelector('[data-e3-budget]') as HTMLElement
const e3BudgetLabel = document.querySelector('[data-e3-budget-label]') as HTMLElement

function syncE3(): void {
  const budget = engine.noiseBudgetPct(e3Ct)
  e3OpsEl.textContent = `Sequence: ${e3Ops.length ? e3Ops.join(' -> ') : 'fresh'}`
  e3BudgetFill.style.width = `${budget}%`
  const e3Bar = e3BudgetFill.parentElement as HTMLElement
  e3Bar.setAttribute('aria-valuenow', String(budget))
  e3BudgetLabel.textContent = `Budget: ${budget}%`
}

function refreshE3Table(): void {
  const rows = [
    ['Fresh ciphertext', '100%'],
    ['After 1 addition', '~99%'],
    ['After 1 multiplication', '~60–70%'],
    ['After 2 multiplications', '0% — decryption fails'],
    ['Production (n≥4096)', '10–30 mul levels before exhaustion']
  ]
  const tbody = document.querySelector('[data-e3-table]') as HTMLElement
  tbody.innerHTML = rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')
}

refreshE3Table()
syncE3()

;(document.querySelector('[data-e3-reset]') as HTMLButtonElement).addEventListener('click', () => {
  e3Ct = engine.encryptScalar(3)
  e3Ops = []
  e3DecEl.textContent = 'Decrypt output: 3'
  syncE3()
})

;(document.querySelector('[data-e3-add]') as HTMLButtonElement).addEventListener('click', () => {
  e3Ct = engine.add(e3Ct, engine.encryptScalar(1))
  e3Ops.push('add')
  syncE3()
})

;(document.querySelector('[data-e3-mul]') as HTMLButtonElement).addEventListener('click', () => {
  e3Ct = engine.rescaleToDelta(engine.relinearize(engine.multiplyNoRelin(e3Ct, engine.encryptScalar(2))))
  e3Ops.push('mul')
  syncE3()
})

;(document.querySelector('[data-e3-dec]') as HTMLButtonElement).addEventListener('click', () => {
  const budget = engine.noiseBudgetPct(e3Ct)
  const raw = engine.decryptScalar(e3Ct)
  const expected = e3Ct.message[0]
  const output = budget === 0 ? engine.randomGarbage() : raw
  const verdict = output === expected ? 'correct' : 'failure (garbage)'
  e3DecEl.textContent = `Decrypt output: ${output}, expected ${expected}, verdict: ${verdict}`
})

let e4A: InternalCiphertext | null = null
let e4B: InternalCiphertext | null = null
let e4Mul: InternalCiphertext | null = null

const e4Info = document.querySelector('[data-e4-info]') as HTMLElement
const e4Ct = document.querySelector('[data-e4-ct]') as HTMLElement
const e4Budget = document.querySelector('[data-e4-budget]') as HTMLElement
const e4BudgetLabel = document.querySelector('[data-e4-budget-label]') as HTMLElement

function syncE4(ct: InternalCiphertext): void {
  const budget = engine.noiseBudgetPct(ct)
  e4Info.textContent = `ciphertext components: ${ct.components.length}`
  e4Ct.textContent = engine.formatCipher(ct)
  e4Budget.style.width = `${budget}%`
  const e4Bar = e4Budget.parentElement as HTMLElement
  e4Bar.setAttribute('aria-valuenow', String(budget))
  e4BudgetLabel.textContent = `Budget: ${budget}%`
}

;(document.querySelector('[data-e4-enc]') as HTMLButtonElement).addEventListener('click', () => {
  e4A = engine.encryptScalar(numFrom('a4'))
  e4B = engine.encryptScalar(numFrom('b4'))
  e4Mul = null
  syncE4(e4A)
})

;(document.querySelector('[data-e4-mul]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e4A || !e4B) {
    e4Info.textContent = 'Encrypt A and B first.'
    return
  }
  e4Mul = engine.multiplyNoRelin(e4A, e4B)
  syncE4(e4Mul)
})

;(document.querySelector('[data-e4-relin]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e4Mul) {
    e4Info.textContent = 'Run multiply first.'
    return
  }
  e4Mul = engine.rescaleToDelta(engine.relinearize(e4Mul))
  syncE4(e4Mul)
})

;(document.querySelector('[data-e4-dec]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e4Mul) {
    e4Info.textContent = 'No multiplication ciphertext to decrypt.'
    return
  }
  const out = engine.decryptScalar(e4Mul)
  const a = numFrom('a4')
  const b = numFrom('b4')
  e4Info.textContent = `ciphertext components: ${e4Mul.components.length}; decrypted: ${out}; verify (${a} * ${b}) mod 17 = ${(a * b) % 17}`
})

let batchA: InternalCiphertext | null = null
let batchB: InternalCiphertext | null = null
let batchSum: InternalCiphertext | null = null

;(document.querySelector('[data-e4-batch-enc]') as HTMLButtonElement).addEventListener('click', () => {
  const aText = (document.querySelector('[data-e4-batch-a]') as HTMLTextAreaElement).value
  const bText = (document.querySelector('[data-e4-batch-b]') as HTMLTextAreaElement).value
  const va = parseVec(aText)
  const vb = parseVec(bText)
  batchA = engine.encryptVector(va)
  batchB = engine.encryptVector(vb)
  ;(document.querySelector('[data-e4-batch-out]') as HTMLElement).textContent = `Encrypted vectors A=${JSON.stringify(va)} and B=${JSON.stringify(vb)}.`
})

;(document.querySelector('[data-e4-batch-add]') as HTMLButtonElement).addEventListener('click', () => {
  if (!batchA || !batchB) {
    ;(document.querySelector('[data-e4-batch-out]') as HTMLElement).textContent = 'Encrypt both batches first.'
    return
  }
  batchSum = engine.add(batchA, batchB)
  ;(document.querySelector('[data-e4-batch-out]') as HTMLElement).textContent = 'Added two packed ciphertexts with one homomorphic operation.'
})

;(document.querySelector('[data-e4-batch-dec]') as HTMLButtonElement).addEventListener('click', () => {
  if (!batchSum) {
    ;(document.querySelector('[data-e4-batch-out]') as HTMLElement).textContent = 'Add batches first.'
    return
  }
  const len = Math.min(batchSum.message.length, 4)
  const out = engine.decryptVector(batchSum, len)
  ;(document.querySelector('[data-e4-batch-out]') as HTMLElement).textContent = `Decrypted SIMD sum: ${JSON.stringify(out)} (4 additions in one ciphertext op).`
})

;(document.querySelector('[data-e5-run]') as HTMLButtonElement).addEventListener('click', () => {
  const start = performance.now()
  const a = engine.encryptScalar(9)
  const b = engine.encryptScalar(7)
  const sum = engine.add(a, b)
  const out = engine.decryptScalar(sum)
  const ms = (performance.now() - start).toFixed(2)
  ;(document.querySelector('[data-e5-time]') as HTMLElement).textContent = `Toy BFV add timing: ${ms} ms, decrypted result=${out}.`
})
