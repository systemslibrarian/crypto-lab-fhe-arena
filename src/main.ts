import './style.css'
import { ToyBfvEngine, type InternalCiphertext } from './toyFhe'
import type { Theme } from './types'

const engine = new ToyBfvEngine()
const { q, t, n } = engine.params
const app = document.querySelector('#app') as HTMLDivElement

app.innerHTML = `
  <div class="app">
    <header class="app-header" role="banner">
      <button class="theme-toggle" data-theme-toggle aria-label="Switch to light mode">🌙</button>
      <h1>FHE Arena: BGV/BFV Integer Homomorphic Encryption</h1>
      <p class="subtitle">
        A live, correct toy of BFV encryption over real ring arithmetic (n=${n}, t=${t}, q=${q}) with measured noise growth.
        Every number below is computed, not faked. <strong>Toy parameters — not production strength.</strong>
        Production BFV/BGV uses n &ge; 4096 and tuned coefficient-modulus chains.
      </p>

      <div class="guide" role="note" aria-label="How to use this lab">
        <strong>Start here.</strong> Homomorphic encryption lets a server compute on data it cannot read.
        The catch is <em>noise</em>: every ciphertext carries a little, and every operation adds more — when it
        overflows, decryption fails. Follow the path and watch the noise budget:
        <ol class="guide-steps">
          <li><a href="#exhibit-1">The idea</a> — compute on locked boxes.</li>
          <li><a href="#exhibit-2">Encrypt &amp; add</a> — see the <code>Δ·m + e</code> equation that makes it work.</li>
          <li><a href="#exhibit-3">Noise budget</a> — why multiply is far costlier than add.</li>
          <li><a href="#exhibit-4">Multiply &amp; relinearize</a> — ciphertexts grow, then shrink; SIMD batching.</li>
          <li><a href="#exhibit-5">BGV vs BFV vs TFHE</a> — pick the right scheme.</li>
          <li><a href="#exhibit-6">In production</a> — where this is deployed today.</li>
        </ol>
        <p class="legend">
          Noise-budget meter:
          <span class="legend-chip legend-healthy">healthy</span>
          <span class="legend-chip legend-warning">running low</span>
          <span class="legend-chip legend-critical">decryption fails</span>
          — measured in <strong>bits</strong>, like Microsoft SEAL's <code>invariant_noise_budget</code>.
        </p>
      </div>
    </header>

    <main class="exhibits" id="main-content" aria-label="Six interactive FHE exhibits">

      <section class="exhibit" id="exhibit-1" aria-labelledby="e1-heading" tabindex="-1">
        <h2 id="e1-heading">Exhibit 1 · The Idea: Compute on Locked Boxes</h2>
        <p>
          Encrypt your integers, hand the ciphertexts to a server, and the server can add and multiply them —
          returning a ciphertext that decrypts to exactly the plaintext answer. The server never sees your data.
        </p>
        <div class="flow" aria-label="Who sees what">
          <div class="flow-step"><span class="flow-who">You (client)</span><span class="flow-what">hold the secret key. Encrypt 3 and 4.</span></div>
          <div class="flow-arrow" aria-hidden="true">→</div>
          <div class="flow-step flow-blind"><span class="flow-who">Server (blind)</span><span class="flow-what">sees only random-looking polynomials. Computes ct(3)+ct(4) and ct(3)×ct(4).</span></div>
          <div class="flow-arrow" aria-hidden="true">→</div>
          <div class="flow-step"><span class="flow-who">You (client)</span><span class="flow-what">decrypt → 7 and 12. Same as plaintext math.</span></div>
        </div>
        <div class="grid-2">
          <div>
            <h3>BGV vs BFV</h3>
            <p>Both are RLWE-based integer FHE schemes whose ciphertexts accumulate noise.</p>
            <p>BGV controls noise with <em>modulus switching</em>: the modulus shrinks level-by-level to keep relative noise in check.</p>
            <p>BFV controls it with a <em>scale-and-rescale</em> style around the plaintext space — the scheme this lab implements, and SEAL's default mode.</p>
          </div>
          <div>
            <h3>Four Generations of FHE</h3>
            <ol>
              <li><strong>Gentry 2009</strong> — first bootstrapped FHE (proof of possibility).</li>
              <li><strong>BGV / BFV 2011–2012</strong> — practical <em>leveled</em> integer FHE (this lab).</li>
              <li><strong>TFHE 2016</strong> — fast bootstrapped bit-level gates.</li>
              <li><strong>CKKS 2017</strong> — approximate arithmetic for real-valued workloads.</li>
            </ol>
          </div>
        </div>
        <p>Key parameters: polynomial-modulus degree <code>n</code>, coefficient modulus <code>q</code>, plaintext modulus <code>t</code>; security comes from <code>n</code> and <code>q</code> jointly.</p>
        <div class="callout" role="note">
          <strong>Why it matters:</strong> integer FHE powers private database queries, encrypted genomics, vote tallying, and private inference.
          Production libraries: Microsoft SEAL, IBM HElib, OpenFHE. For bit-level FHE (TFHE), see
          <a href="https://systemslibrarian.github.io/crypto-lab-blind-oracle/" target="_blank" rel="noreferrer">Blind Oracle</a>.
        </div>
      </section>

      <section class="exhibit" id="exhibit-2" aria-labelledby="e2-heading" tabindex="-1">
        <h2 id="e2-heading">Exhibit 2 · Encrypt, Add, Decrypt — and See the Noise</h2>
        <p>
          Pick two integers, encrypt each, add the ciphertexts on the (blind) server, then decrypt.
          The reveal panel opens up <em>exactly</em> what the secret key recovers. Arithmetic is mod t&nbsp;=&nbsp;${t}.
        </p>
        <div class="grid-2">
          <div>
            <label for="a2">Integer A (0–${t - 1})</label>
            <input id="a2" type="number" min="0" max="${t - 1}" value="3" aria-describedby="e2-note" />
          </div>
          <div>
            <label for="b2">Integer B (0–${t - 1})</label>
            <input id="b2" type="number" min="0" max="${t - 1}" value="4" aria-describedby="e2-note" />
          </div>
        </div>
        <p id="e2-note" class="sr-only">Values are computed mod ${t} using toy BFV encryption.</p>
        <div class="row" role="toolbar" aria-label="Exhibit 2 controls">
          <button class="action" data-e2-enc-a><span class="step-num">1</span> Encrypt A</button>
          <button class="action" data-e2-enc-b><span class="step-num">2</span> Encrypt B</button>
          <button class="action" data-e2-add><span class="step-num">3</span> Add ciphertexts</button>
          <button class="action action-orange" data-e2-dec><span class="step-num">4</span> Decrypt result</button>
        </div>
        <div class="grid-3">
          <div>
            <h3 id="e2-cta-label">ct(A)</h3>
            <pre class="mono" data-e2-cta aria-labelledby="e2-cta-label" role="region" aria-live="polite">awaiting…</pre>
          </div>
          <div>
            <h3 id="e2-ctb-label">ct(B)</h3>
            <pre class="mono" data-e2-ctb aria-labelledby="e2-ctb-label" role="region" aria-live="polite">awaiting…</pre>
          </div>
          <div>
            <h3 id="e2-sum-label">ct(A+B)</h3>
            <pre class="mono" data-e2-sum aria-labelledby="e2-sum-label" role="region" aria-live="polite">awaiting…</pre>
          </div>
        </div>
        <p data-e2-result aria-live="polite" role="status">Expected: (3 + 4) mod ${t} = 7. Encrypt A and B, add, then decrypt.</p>
        <div class="budget" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="Noise budget" data-health="healthy" data-e2-budget-bar>
          <div class="budget-fill" data-e2-budget style="width:100%"></div>
        </div>
        <p data-e2-budget-label aria-live="polite">Encrypt a value to measure its noise budget.</p>
        <div class="reveal" data-e2-reveal hidden>
          <h3>What the secret key actually recovers</h3>
          <p>
            Decryption computes <code>c0 + c1·s</code>, which equals <code>Δ·m + e</code> — your message <code>m</code>
            scaled by <code>Δ = ⌊q/t⌋</code>, plus tiny noise <code>e</code>. Divide by <code>Δ</code>, round, and the noise vanishes.
            Decryption only fails once <code>|e|</code> exceeds <code>Δ/2</code>.
          </p>
          <pre class="mono reveal-eq" data-e2-eq aria-label="Decryption equation with live values"></pre>
        </div>
        <div class="semantic">
          <h3>Semantic security: same input, different ciphertext</h3>
          <p>
            Encryption is <em>randomized</em>. Encrypt the same value twice and the two ciphertexts look completely
            unrelated — yet both decrypt to the same number. That is exactly what IND-CPA security guarantees: a
            ciphertext leaks nothing about its plaintext, not even whether it equals another ciphertext.
          </p>
          <div class="row" role="toolbar" aria-label="Semantic security demo">
            <button class="action" data-e2-sem>Encrypt A twice</button>
          </div>
          <div class="grid-2">
            <pre class="mono" data-e2-sem1 aria-label="First encryption of A">—</pre>
            <pre class="mono" data-e2-sem2 aria-label="Second encryption of A">—</pre>
          </div>
          <p data-e2-sem-note aria-live="polite" role="status"></p>
        </div>
        <div class="callout" role="note"><strong>Key insight:</strong> homomorphic addition just adds the two ciphertext polynomials. The server moves random-looking numbers around; the structure <code>Δ·m + e</code> only re-emerges under your secret key.</div>
      </section>

      <section class="exhibit" id="exhibit-3" aria-labelledby="e3-heading" tabindex="-1">
        <h2 id="e3-heading">Exhibit 3 · The Noise Budget: Add Is Cheap, Multiply Is Not</h2>
        <p>
          Start from a fresh ciphertext of 3 and apply operations. Addition barely dents the budget; a single
          multiplication consumes most of it (toy parameters are small, so the effect is dramatic). When the budget
          hits 0, decryption returns garbage. Every row below is a <strong>real measurement</strong>.
        </p>
        <div class="row" role="toolbar" aria-label="Exhibit 3 controls">
          <button class="action" data-e3-reset>Reset to fresh ct(3)</button>
          <button class="action" data-e3-add>+ Add 1</button>
          <button class="action action-orange" data-e3-mul>× Multiply by 2</button>
          <button class="action action-orange" data-e3-auto>▶ Multiply until it breaks</button>
          <button class="action" data-e3-boot>♻ Bootstrap (refresh)</button>
          <button class="action" data-e3-dec>Attempt decrypt</button>
        </div>
        <p data-e3-ops aria-live="polite" role="status">Sequence: fresh</p>
        <div class="budget" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="Noise budget" data-health="healthy" data-e3-budget-bar>
          <div class="budget-fill" data-e3-budget style="width:100%"></div>
        </div>
        <p data-e3-budget-label aria-live="polite">Budget: 100%</p>
        <p data-e3-decrypt aria-live="assertive" role="alert">Decrypt output: 3</p>
        <figure class="chart-wrap">
          <div class="chart" data-e3-chart role="img" aria-label="Line chart of noise budget in bits after each operation."></div>
          <figcaption>Noise budget (bits) after each operation. Addition steps are nearly flat; each multiplication drops a cliff. The dashed line is the decryption-failure floor at 0 bits.</figcaption>
        </figure>
        <div class="callout callout-why" role="note">
          <strong>Why multiply is so much costlier:</strong> adding two ciphertexts just adds their noise (<code>e₁ + e₂</code>).
          Multiplying <em>cross-multiplies</em> them, so the new noise is roughly <code>e₁·(Δ·m₂) + e₂·(Δ·m₁)</code> — the noise is scaled by the message, so it grows multiplicatively. Each multiplication burns a big chunk of bits; addition barely registers.
        </div>
        <div class="table-wrap">
          <table aria-label="Live measured noise budget after each operation">
            <thead><tr>
              <th scope="col">Step</th><th scope="col">Operation</th>
              <th scope="col">Max noise coeff</th><th scope="col">Budget (bits)</th><th scope="col" title="Is correct decryption guaranteed for every slot?">Guaranteed?</th>
            </tr></thead>
            <tbody data-e3-table></tbody>
          </table>
        </div>
        <div class="callout" role="note">
          <strong>Modulus switching (BGV) &amp; rescaling (BFV)</strong> rein in noise after each multiplication so more levels fit before exhaustion.
          A production ciphertext (n&nbsp;≥&nbsp;4096, large q) starts with ~100+ bits of budget — enough for 10–30 multiplications.
          When levels run out, only <em>bootstrapping</em> — homomorphically decrypting to refresh the budget — lets computation continue.
          Press <strong>♻ Bootstrap</strong> to watch the budget snap back to full. The honest caveat: real bootstrapping runs <em>without</em> the secret key (that is what makes it so expensive) and must happen <em>before</em> the budget hits 0 — it refreshes noise, it cannot recover data already destroyed by overflow.
        </div>
      </section>

      <section class="exhibit" id="exhibit-4" aria-labelledby="e4-heading" tabindex="-1">
        <h2 id="e4-heading">Exhibit 4 · Multiply, Relinearize, and Batch (SIMD)</h2>
        <p>
          Multiplying two 2-part ciphertexts yields a <strong>3-part</strong> ciphertext. <em>Relinearization</em> uses a
          public key-switching key to shrink it back to 2 parts (and rescale it), so you can keep computing.
          Watch the component count and the budget.
        </p>
        <div class="grid-2">
          <div>
            <label for="a4">A (0–${t - 1})</label>
            <input id="a4" type="number" min="0" max="${t - 1}" value="5" />
          </div>
          <div>
            <label for="b4">B (0–${t - 1})</label>
            <input id="b4" type="number" min="0" max="${t - 1}" value="6" />
          </div>
        </div>
        <div class="row" role="toolbar" aria-label="Multiplication controls">
          <button class="action" data-e4-enc><span class="step-num">1</span> Encrypt A &amp; B</button>
          <button class="action action-orange" data-e4-mul><span class="step-num">2</span> Multiply (no relin)</button>
          <button class="action" data-e4-relin><span class="step-num">3</span> Relinearize</button>
          <button class="action" data-e4-dec><span class="step-num">4</span> Decrypt</button>
        </div>
        <p data-e4-info aria-live="polite" role="status">Ciphertext components: 2 (a fresh ciphertext). Encrypt A &amp; B to begin.</p>
        <pre class="mono" data-e4-ct role="region" aria-label="Multiplication ciphertext" aria-live="polite">awaiting…</pre>
        <div class="budget" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="Noise budget" data-health="healthy" data-e4-budget-bar>
          <div class="budget-fill" data-e4-budget style="width:100%"></div>
        </div>
        <p data-e4-budget-label aria-live="polite">Budget: 100%</p>

        <h3>Batching (SIMD): one operation, many values</h3>
        <p>A single ciphertext packs many integers into independent slots. One homomorphic add processes all slots at once — this is how FHE amortizes its cost. Enter up to 4 integers each (0–${t - 1}), comma-separated.</p>
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
          <button class="action" data-e4-batch-enc><span class="step-num">1</span> Encrypt batches</button>
          <button class="action" data-e4-batch-add><span class="step-num">2</span> Add batches</button>
          <button class="action action-orange" data-e4-batch-dec><span class="step-num">3</span> Decrypt result</button>
        </div>
        <p data-e4-batch-out aria-live="polite" role="status">Result: awaiting batch operation.</p>
      </section>

      <section class="exhibit" id="exhibit-5" aria-labelledby="e5-heading" tabindex="-1">
        <h2 id="e5-heading">Exhibit 5 · BGV vs BFV vs TFHE — Choosing a Scheme</h2>
        <div class="table-wrap">
          <table aria-label="Comparison of BGV, BFV, and TFHE schemes">
            <thead>
              <tr><th scope="col">Property</th><th scope="col">BGV</th><th scope="col">BFV</th><th scope="col">TFHE</th></tr>
            </thead>
            <tbody>
              <tr><td>Data type</td><td>Integers mod t</td><td>Integers mod t</td><td>Single bits</td></tr>
              <tr><td>Operations</td><td>Add, multiply</td><td>Add, multiply</td><td>Boolean gates</td></tr>
              <tr><td>Noise management</td><td>Modulus switching</td><td>Scaling &amp; rescaling</td><td>Frequent bootstrapping</td></tr>
              <tr><td>Multiplication depth</td><td>~10–30 levels</td><td>~10–20 levels</td><td>Unlimited (bootstrap each gate)</td></tr>
              <tr><td>Batching (SIMD)</td><td>Yes (CRT packing)</td><td>Yes (CRT packing)</td><td>No</td></tr>
              <tr><td>Best for</td><td>Deeper integer circuits</td><td>Accessible integer workloads</td><td>Arbitrary bit logic</td></tr>
              <tr><td>Libraries</td><td>HElib, OpenFHE</td><td>SEAL (default), OpenFHE</td><td>TFHE-rs, Concrete</td></tr>
              <tr><td>In crypto-lab</td><td>This demo</td><td>This demo</td><td>Blind Oracle</td></tr>
            </tbody>
          </table>
        </div>
        <div class="callout" role="note">
          <strong>Decision tree:</strong> integer statistics &rarr; BFV/BGV · deep multiplications &rarr; BGV ·
          arbitrary boolean logic &rarr; TFHE · approximate real arithmetic &rarr; CKKS.
        </div>
        <div class="row" role="toolbar" aria-label="Timing test">
          <button class="action" data-e5-run>Time a toy BFV add (100 ops)</button>
        </div>
        <p data-e5-time aria-live="polite" role="status">Timing: awaiting run.</p>

        <h3>Parameter explorer: the security ↔ depth tradeoff</h3>
        <p>
          A larger polynomial degree <code>n</code> permits a larger coefficient modulus <code>q</code> at the same
          security level, which buys more noise budget — and therefore more multiplications — but every operation gets
          slower. The maximum <code>log₂(q)</code> values below are from the
          <a href="https://homomorphicencryption.org/standard/" target="_blank" rel="noreferrer">Homomorphic Encryption Standard</a>
          (128-bit classical security). Drag the slider.
        </p>
        <label for="param-n">Polynomial degree n = <strong data-param-n-label>4096</strong></label>
        <input id="param-n" type="range" min="0" max="5" step="1" value="2" data-param-n aria-describedby="param-out" />
        <div class="param-card" id="param-out" data-param-out aria-live="polite" role="status"></div>
        <p class="footer-note">Depth is a rough estimate (≈ each multiplication consumes ~25 bits of modulus); real depth depends on the noise budget your circuit needs per level.</p>

        <nav aria-label="Cross-demo links">
          <ul class="link-list">
            <li><a href="https://systemslibrarian.github.io/crypto-lab-blind-oracle/" target="_blank" rel="noreferrer">Blind Oracle (TFHE)</a></li>
            <li><a href="https://systemslibrarian.github.io/crypto-lab-ckks-lab/" target="_blank" rel="noreferrer">CKKS Lab (Approximate FHE)</a></li>
            <li><a href="https://systemslibrarian.github.io/crypto-compare/" target="_blank" rel="noreferrer">Crypto Compare</a></li>
          </ul>
        </nav>
      </section>

      <section class="exhibit" id="exhibit-6" aria-labelledby="e6-heading" tabindex="-1">
        <h2 id="e6-heading">Exhibit 6 · FHE in Production</h2>
        <div class="grid-2">
          <div>
            <h3>Private database queries</h3>
            <p>BFV-style PIR (Private Information Retrieval) returns a record without revealing which one was requested. Real system: Spiral (Microsoft Research, 2022).</p>
            <h3>Private genomics</h3>
            <p>BGV/BFV pipelines run GWAS statistical tests over encrypted genotype vectors. Demonstrated yearly in the iDASH competition with HElib BGV.</p>
            <h3>Encrypted ML inference</h3>
            <p>Neural networks evaluate encrypted inputs; the model owner learns nothing about the data. Research: CryptoNets (Microsoft, 2016), HEAR, Pegasus.</p>
          </div>
          <div>
            <h3>Private voting tallying</h3>
            <p>Ballots (0/1 per candidate) are summed by BFV addition without decrypting any individual vote. Only the final tally is opened.</p>
            <h3>Financial privacy</h3>
            <p>Banks compute aggregate statistics over encrypted customer records for regulatory reporting without exposing any single record.</p>
            <h3>The readiness trend</h3>
            <p>2016: hours per operation. 2020: seconds. 2024: milliseconds for integer addition, ~100&nbsp;ms for multiplication. GPU acceleration brings select workloads to real time.</p>
          </div>
        </div>
        <div class="vote-demo">
          <h3>Try it live: an encrypted vote tally</h3>
          <p>
            Ten voters each cast a secret Yes/No ballot. The server encrypts every ballot, sums the ciphertexts with
            homomorphic addition, and <strong>only the final tally is ever decrypted</strong> — no individual vote is
            revealed, and the budget barely moves because addition is cheap. Click a chip to flip that vote.
          </p>
          <div class="vote-grid" data-vote-grid role="group" aria-label="Ten voter ballots — click to toggle Yes or No"></div>
          <div class="row" role="toolbar" aria-label="Voting controls">
            <button class="action" data-vote-enc><span class="step-num">1</span> Encrypt ballots</button>
            <button class="action" data-vote-tally><span class="step-num">2</span> Tally (sum ciphertexts)</button>
            <button class="action action-orange" data-vote-dec><span class="step-num">3</span> Decrypt tally only</button>
          </div>
          <p data-vote-out aria-live="polite" role="status">Set the ballots above, then encrypt.</p>
        </div>
        <div class="callout" role="note">
          <strong>Why it matters:</strong> FHE is cryptography's &ldquo;holy grail&rdquo; — computing on data without decrypting it.
          Understanding noise budgets, parameter selection, and the BGV/BFV tradeoff is what separates engineers who can <em>use</em> FHE from those who only know it exists.
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
  setTheme(getCurrentTheme() === 'dark' ? 'light' : 'dark')
})

function numFrom(id: string): number {
  const el = document.getElementById(id) as HTMLInputElement
  const num = Number(el.value)
  return Number.isFinite(num) ? Math.max(0, Math.min(t - 1, Math.round(num))) : 0
}

function parseVec(value: string): number[] {
  return value
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .map(Number)
    .filter((x) => Number.isFinite(x))
    .slice(0, 4)
    .map((x) => ((Math.round(x) % t) + t) % t)
}

/** Shared noise-budget meter renderer: bits + percent + health color. */
function renderBudget(fillSel: string, labelSel: string, ct: InternalCiphertext): void {
  const bits = engine.noiseBudgetBits(ct)
  const pct = engine.noiseBudgetPct(ct)
  const health = engine.noiseHealth(ct)
  const fill = document.querySelector(fillSel) as HTMLDivElement
  const label = document.querySelector(labelSel) as HTMLElement
  const bar = fill.parentElement as HTMLElement
  fill.style.width = `${pct}%`
  bar.setAttribute('aria-valuenow', String(pct))
  bar.setAttribute('data-health', health)
  const tag = `<span class="health-tag health-${health}">${health}</span>`
  label.innerHTML = `Noise budget: <strong>${bits.toFixed(1)} bits</strong> (${pct}%) — ${tag}`
}

function verdictBadge(ok: boolean): string {
  return ok
    ? '<span class="badge badge-ok">✓ matches plaintext</span>'
    : '<span class="badge badge-fail">✗ noise overflow — garbage</span>'
}

// ── Exhibit 2 ──────────────────────────────────────────────────────────────
let e2A: InternalCiphertext | null = null
let e2B: InternalCiphertext | null = null
let e2Sum: InternalCiphertext | null = null

const e2Cta = document.querySelector('[data-e2-cta]') as HTMLElement
const e2Ctb = document.querySelector('[data-e2-ctb]') as HTMLElement
const e2SumEl = document.querySelector('[data-e2-sum]') as HTMLElement
const e2Result = document.querySelector('[data-e2-result]') as HTMLElement
const e2Reveal = document.querySelector('[data-e2-reveal]') as HTMLElement
const e2Eq = document.querySelector('[data-e2-eq]') as HTMLElement

;(document.querySelector('[data-e2-enc-a]') as HTMLButtonElement).addEventListener('click', () => {
  e2A = engine.encryptScalar(numFrom('a2'))
  e2Cta.textContent = engine.formatCipher(e2A)
  renderBudget('[data-e2-budget]', '[data-e2-budget-label]', e2A)
  e2Result.textContent = `Encrypted A = ${numFrom('a2')}. The ciphertext above is two random-looking polynomials.`
})

;(document.querySelector('[data-e2-enc-b]') as HTMLButtonElement).addEventListener('click', () => {
  e2B = engine.encryptScalar(numFrom('b2'))
  e2Ctb.textContent = engine.formatCipher(e2B)
  renderBudget('[data-e2-budget]', '[data-e2-budget-label]', e2B)
  e2Result.textContent = `Encrypted B = ${numFrom('b2')}. Now add the two ciphertexts.`
})

;(document.querySelector('[data-e2-add]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e2A || !e2B) {
    e2Result.textContent = 'Encrypt both A and B first.'
    return
  }
  e2Sum = engine.add(e2A, e2B)
  e2SumEl.textContent = engine.formatCipher(e2Sum)
  renderBudget('[data-e2-budget]', '[data-e2-budget-label]', e2Sum)
  e2Result.textContent = 'Added on the (blind) server — no plaintext was touched. Now decrypt.'
})

;(document.querySelector('[data-e2-dec]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e2Sum) {
    e2Result.textContent = 'Add the ciphertexts first.'
    return
  }
  const a = numFrom('a2')
  const b = numFrom('b2')
  const tr = engine.decryptionTrace(e2Sum)
  const expected = (a + b) % t
  e2Result.innerHTML = `Decrypted: <strong>${tr.decoded}</strong> &nbsp; verify (${a} + ${b}) mod ${t} = ${expected} &nbsp; ${verdictBadge(tr.decoded === expected)}`
  e2Eq.textContent = [
    `Δ                = ⌊q / t⌋ = ⌊${q} / ${t}⌋ = ${tr.delta}`,
    `m                = (${a} + ${b}) mod ${t} = ${tr.m}`,
    `Δ·m              = ${tr.signal}                 ← the clean "signal"`,
    `c0 + c1·s        = ${tr.recovered}                 ← what the secret key recovers`,
    `noise e          = ${tr.noise >= 0 ? '+' : ''}${tr.noise}                     (fails only if |e| > Δ/2 = ${Math.floor(tr.delta / 2)})`,
    `round(${tr.recovered} / ${tr.delta}) mod ${t} = ${tr.decoded}   ✓`
  ].join('\n')
  e2Reveal.hidden = false
})

const e2Sem1 = document.querySelector('[data-e2-sem1]') as HTMLElement
const e2Sem2 = document.querySelector('[data-e2-sem2]') as HTMLElement
const e2SemNote = document.querySelector('[data-e2-sem-note]') as HTMLElement

;(document.querySelector('[data-e2-sem]') as HTMLButtonElement).addEventListener('click', () => {
  const v = numFrom('a2')
  const c1 = engine.encryptScalar(v)
  const c2 = engine.encryptScalar(v)
  e2Sem1.textContent = engine.formatCipher(c1)
  e2Sem2.textContent = engine.formatCipher(c2)
  const identical = JSON.stringify(c1.components) === JSON.stringify(c2.components)
  const d1 = engine.decryptScalar(c1)
  const d2 = engine.decryptScalar(c2)
  e2SemNote.innerHTML = `Both encrypt A = ${v}. The ciphertexts ${
    identical ? 'are identical (vanishingly unlikely!)' : 'differ completely'
  }, yet both decrypt to <strong>${d1}</strong> and <strong>${d2}</strong>. ${verdictBadge(d1 === v && d2 === v)}`
})

// ── Exhibit 3 ──────────────────────────────────────────────────────────────
type E3Point = { step: number; label: string; bits: number; health: string }

let e3Ct = engine.encryptScalar(3)
let e3Ops: string[] = []
let e3Step = 0
let e3History: E3Point[] = []
let e3Running = false

const e3OpsEl = document.querySelector('[data-e3-ops]') as HTMLElement
const e3DecEl = document.querySelector('[data-e3-decrypt]') as HTMLElement
const e3Table = document.querySelector('[data-e3-table]') as HTMLElement
const e3Chart = document.querySelector('[data-e3-chart]') as HTMLElement
const E3_MAX_BITS = engine.freshBudgetBits
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const healthColor: Record<string, string> = {
  healthy: 'var(--healthy)',
  warning: 'var(--warning)',
  critical: 'var(--critical)'
}

const e3Ctrls = ['[data-e3-reset]', '[data-e3-add]', '[data-e3-mul]', '[data-e3-auto]', '[data-e3-boot]', '[data-e3-dec]'].map(
  (sel) => document.querySelector(sel) as HTMLButtonElement
)

function lockE3(disabled: boolean): void {
  e3Ctrls.forEach((btn) => {
    btn.disabled = disabled
  })
}

function renderE3Chart(): void {
  const W = 620
  const H = 210
  const padL = 42
  const padR = 14
  const padT = 14
  const padB = 30
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const len = e3History.length
  const xFor = (i: number): number => (len <= 1 ? padL + plotW / 2 : padL + (i / (len - 1)) * plotW)
  const yFor = (b: number): number => padT + (1 - Math.min(Math.max(b, 0), E3_MAX_BITS) / E3_MAX_BITS) * plotH

  const yTicks = [0, Math.round(E3_MAX_BITS / 2), Math.round(E3_MAX_BITS)]
  const grid = yTicks
    .map((b) => {
      const y = yFor(b).toFixed(1)
      return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="chart-grid"/><text x="${padL - 6}" y="${(yFor(b) + 4).toFixed(1)}" class="chart-tick" text-anchor="end">${b}</text>`
    })
    .join('')
  const failLine = `<line x1="${padL}" y1="${yFor(0).toFixed(1)}" x2="${W - padR}" y2="${yFor(0).toFixed(1)}" class="chart-fail"/>`
  const path = e3History.map((h, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(h.bits).toFixed(1)}`).join(' ')
  const line = len > 1 ? `<path d="${path}" class="chart-line"/>` : ''
  const dots = e3History
    .map(
      (h, i) =>
        `<circle cx="${xFor(i).toFixed(1)}" cy="${yFor(h.bits).toFixed(1)}" r="4" fill="${healthColor[h.health]}"><title>step ${h.step}: ${h.label} — ${h.bits.toFixed(1)} bits</title></circle>`
    )
    .join('')
  const xLabels = e3History
    .map((h, i) => (len > 12 && i % 2 ? '' : `<text x="${xFor(i).toFixed(1)}" y="${H - 8}" class="chart-tick" text-anchor="middle">${h.step}</text>`))
    .join('')
  const yAxis = `<text x="12" y="${padT + plotH / 2}" class="chart-axis" text-anchor="middle" transform="rotate(-90 12 ${padT + plotH / 2})">budget (bits)</text>`

  e3Chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" width="100%">${grid}${failLine}${line}${dots}${xLabels}${yAxis}</svg>`
  const last = e3History[e3History.length - 1]
  e3Chart.setAttribute(
    'aria-label',
    `Noise budget chart, ${len} step${len === 1 ? '' : 's'}. Latest: ${last.label}, ${last.bits.toFixed(1)} bits, ${last.health}.`
  )
}

function syncE3(): void {
  e3OpsEl.textContent = `Sequence: ${e3Ops.length ? e3Ops.join(' → ') : 'fresh'}`
  renderBudget('[data-e3-budget]', '[data-e3-budget-label]', e3Ct)
}

function logE3(label: string): void {
  const bits = engine.noiseBudgetBits(e3Ct)
  const noise = engine.noiseMagnitude(e3Ct)
  const health = engine.noiseHealth(e3Ct)
  e3History.push({ step: e3Step, label, bits, health })
  e3Table.insertAdjacentHTML(
    'beforeend',
    `<tr class="health-row-${health}">
      <td>${e3Step}</td><td>${label}</td><td>${noise}</td>
      <td>${bits.toFixed(1)}</td>
      <td>${bits > 0 ? '✓ yes' : '✗ no'}</td>
    </tr>`
  )
  renderE3Chart()
}

function multiplyE3(): void {
  e3Ct = engine.rescaleToDelta(engine.relinearize(engine.multiplyNoRelin(e3Ct, engine.encryptScalar(2))))
  e3Ops.push('mul')
  e3Step += 1
  logE3('× Multiply by 2')
  syncE3()
}

function resetE3(): void {
  e3Ct = engine.encryptScalar(3)
  e3Ops = []
  e3Step = 0
  e3History = []
  e3Table.innerHTML = ''
  logE3('Fresh ct(3)')
  e3DecEl.textContent = 'Decrypt output: 3 (expected 3) — ✓ correct'
  syncE3()
}

function bootstrapE3(): void {
  // Bootstrapping refreshes the noise budget. A real implementation does this
  // homomorphically (no secret key); here we re-encrypt the tracked value to
  // illustrate the budget jumping back to full.
  e3Ct = engine.encryptScalar(e3Ct.message[0])
  e3Ops.push('bootstrap')
  e3Step += 1
  logE3('♻ Bootstrap (refresh)')
  syncE3()
}

function decryptE3(): void {
  const bits = engine.noiseBudgetBits(e3Ct)
  const expected = e3Ct.message[0]
  const actual = engine.decryptScalar(e3Ct)
  if (bits > 0) {
    e3DecEl.textContent = `Decrypt output: ${actual} (expected ${expected}) — ✓ correct, budget intact.`
  } else if (actual === expected) {
    e3DecEl.textContent = `Decrypt output: ${actual} (expected ${expected}) — ✗ budget exhausted. This slot happens to survive, but the ciphertext is corrupted (see the huge max-noise coefficient) and correctness is no longer guaranteed.`
  } else {
    e3DecEl.textContent = `Decrypt output: ${actual} (expected ${expected}) — ✗ budget exhausted; the noise overflowed and the result is garbage.`
  }
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, prefersReduced ? 0 : ms))

async function autoRunE3(): Promise<void> {
  if (e3Running) return
  e3Running = true
  lockE3(true)
  resetE3()
  let guard = 0
  while (engine.noiseBudgetBits(e3Ct) > 0 && guard < 12) {
    await wait(450)
    multiplyE3()
    guard += 1
  }
  await wait(350)
  decryptE3()
  lockE3(false)
  e3Running = false
}

;(document.querySelector('[data-e3-reset]') as HTMLButtonElement).addEventListener('click', resetE3)

;(document.querySelector('[data-e3-add]') as HTMLButtonElement).addEventListener('click', () => {
  e3Ct = engine.add(e3Ct, engine.encryptScalar(1))
  e3Ops.push('add')
  e3Step += 1
  logE3('+ Add 1')
  syncE3()
})

;(document.querySelector('[data-e3-mul]') as HTMLButtonElement).addEventListener('click', multiplyE3)
;(document.querySelector('[data-e3-auto]') as HTMLButtonElement).addEventListener('click', autoRunE3)
;(document.querySelector('[data-e3-boot]') as HTMLButtonElement).addEventListener('click', bootstrapE3)
;(document.querySelector('[data-e3-dec]') as HTMLButtonElement).addEventListener('click', decryptE3)

// ── Exhibit 4 ──────────────────────────────────────────────────────────────
let e4A: InternalCiphertext | null = null
let e4B: InternalCiphertext | null = null
let e4Mul: InternalCiphertext | null = null

const e4Info = document.querySelector('[data-e4-info]') as HTMLElement
const e4Ct = document.querySelector('[data-e4-ct]') as HTMLElement

function syncE4(ct: InternalCiphertext, note: string): void {
  e4Info.innerHTML = `Ciphertext components: <strong>${ct.components.length}</strong> — ${note}`
  e4Ct.textContent = engine.formatCipher(ct)
  renderBudget('[data-e4-budget]', '[data-e4-budget-label]', ct)
}

;(document.querySelector('[data-e4-enc]') as HTMLButtonElement).addEventListener('click', () => {
  e4A = engine.encryptScalar(numFrom('a4'))
  e4B = engine.encryptScalar(numFrom('b4'))
  e4Mul = null
  syncE4(e4A, 'fresh ciphertexts have 2 parts (c0, c1). Now multiply.')
})

;(document.querySelector('[data-e4-mul]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e4A || !e4B) {
    e4Info.textContent = 'Encrypt A and B first.'
    return
  }
  e4Mul = engine.multiplyNoRelin(e4A, e4B)
  syncE4(e4Mul, 'multiplication produced a 3-part ciphertext (c0, c1, c2). Relinearize to shrink it.')
})

;(document.querySelector('[data-e4-relin]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e4Mul) {
    e4Info.textContent = 'Run multiply first.'
    return
  }
  if (e4Mul.components.length !== 3) {
    e4Info.textContent = 'Already relinearized — 2 components. Decrypt to check the result.'
    return
  }
  e4Mul = engine.rescaleToDelta(engine.relinearize(e4Mul))
  syncE4(e4Mul, 'relinearized back to 2 parts via the key-switching key. Now decrypt.')
})

;(document.querySelector('[data-e4-dec]') as HTMLButtonElement).addEventListener('click', () => {
  if (!e4Mul) {
    e4Info.textContent = 'No multiplication ciphertext to decrypt. Encrypt and multiply first.'
    return
  }
  const out = engine.decryptScalar(e4Mul)
  const a = numFrom('a4')
  const b = numFrom('b4')
  const expected = (a * b) % t
  e4Info.innerHTML = `Components: <strong>${e4Mul.components.length}</strong> · decrypted <strong>${out}</strong> · verify (${a} × ${b}) mod ${t} = ${expected} &nbsp; ${verdictBadge(out === expected)}`
})

// ── Exhibit 4: batching ────────────────────────────────────────────────────
let batchA: InternalCiphertext | null = null
let batchB: InternalCiphertext | null = null
let batchSum: InternalCiphertext | null = null
const batchOut = document.querySelector('[data-e4-batch-out]') as HTMLElement

let batchLen = 0

;(document.querySelector('[data-e4-batch-enc]') as HTMLButtonElement).addEventListener('click', () => {
  const va = parseVec((document.querySelector('[data-e4-batch-a]') as HTMLTextAreaElement).value)
  const vb = parseVec((document.querySelector('[data-e4-batch-b]') as HTMLTextAreaElement).value)
  if (va.length === 0 || vb.length === 0) {
    batchOut.textContent = `Enter at least one integer (0–${t - 1}) in each batch first.`
    return
  }
  batchLen = Math.min(va.length, vb.length)
  batchA = engine.encryptVector(va)
  batchB = engine.encryptVector(vb)
  batchSum = null
  batchOut.textContent = `Encrypted A = [${va.join(', ')}] and B = [${vb.join(', ')}] into two packed ciphertexts. Now add them.`
})

;(document.querySelector('[data-e4-batch-add]') as HTMLButtonElement).addEventListener('click', () => {
  if (!batchA || !batchB) {
    batchOut.textContent = 'Encrypt both batches first.'
    return
  }
  batchSum = engine.add(batchA, batchB)
  batchOut.textContent = 'One homomorphic add processed all slots in parallel. Decrypt to read the per-slot results.'
})

;(document.querySelector('[data-e4-batch-dec]') as HTMLButtonElement).addEventListener('click', () => {
  if (!batchSum) {
    batchOut.textContent = 'Add the batches first.'
    return
  }
  const len = Math.min(batchSum.message.length, batchLen || 4)
  const out = engine.decryptVector(batchSum, len)
  batchOut.innerHTML = `Decrypted SIMD sum: <strong>[${out.join(', ')}]</strong> — ${out.length} addition${out.length === 1 ? '' : 's'} from a single ciphertext operation.`
})

// ── Exhibit 5: timing ──────────────────────────────────────────────────────
;(document.querySelector('[data-e5-run]') as HTMLButtonElement).addEventListener('click', () => {
  const reps = 100
  const a = engine.encryptScalar(9)
  const b = engine.encryptScalar(7)
  const start = performance.now()
  let out = 0
  for (let i = 0; i < reps; i += 1) {
    out = engine.decryptScalar(engine.add(a, b))
  }
  const total = performance.now() - start
  const per = (total / reps).toFixed(3)
  ;(document.querySelector('[data-e5-time]') as HTMLElement).textContent =
    `Toy BFV add+decrypt: ${per} ms/op over ${reps} runs (last result = ${out}). Production SEAL is similar for add; multiplication is ~100× costlier.`
})

// ── Exhibit 5: parameter explorer ──────────────────────────────────────────
const HE_STD = [
  { n: 1024, logq: 27 },
  { n: 2048, logq: 54 },
  { n: 4096, logq: 109 },
  { n: 8192, logq: 218 },
  { n: 16384, logq: 438 },
  { n: 32768, logq: 881 }
]
const paramSlider = document.querySelector('[data-param-n]') as HTMLInputElement
const paramLabel = document.querySelector('[data-param-n-label]') as HTMLElement
const paramOut = document.querySelector('[data-param-out]') as HTMLElement

function renderParam(): void {
  const row = HE_STD[Number(paramSlider.value)]
  const depth = Math.max(0, Math.floor((row.logq - 30) / 25))
  const relCost = Math.round((row.n / 4096) * (Math.log2(row.n) / Math.log2(4096)) * 10) / 10
  const speed =
    row.n <= 2048 ? 'very fast' : row.n <= 4096 ? 'fast' : row.n <= 8192 ? 'moderate' : row.n <= 16384 ? 'slow' : 'very slow'
  paramLabel.textContent = row.n.toLocaleString()
  paramSlider.setAttribute('aria-valuetext', `n = ${row.n}, max log2 q = ${row.logq} bits, about ${depth} multiplication levels, ${speed}`)
  paramOut.innerHTML = [
    ['Max log₂(q) @ 128-bit security', `${row.logq} bits`],
    ['Est. multiplication depth', `≈ ${depth} level${depth === 1 ? '' : 's'}`],
    ['Relative op cost vs n=4096', `~${relCost}×`],
    ['Speed', speed]
  ]
    .map(([k, v]) => `<div><span class="param-k">${k}</span><span class="param-v">${v}</span></div>`)
    .join('')
}
paramSlider.addEventListener('input', renderParam)
renderParam()

// ── Exhibit 6: encrypted vote tally ────────────────────────────────────────
const VOTERS = 10
const votes = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1]
let voteCts: InternalCiphertext[] | null = null
let voteTally: InternalCiphertext | null = null
const voteGrid = document.querySelector('[data-vote-grid]') as HTMLElement
const voteOut = document.querySelector('[data-vote-out]') as HTMLElement

function paintChip(btn: HTMLElement, v: number): void {
  const i = Number(btn.getAttribute('data-vi'))
  btn.classList.toggle('vote-yes', v === 1)
  btn.classList.toggle('vote-no', v === 0)
  btn.setAttribute('aria-pressed', v ? 'true' : 'false')
  btn.textContent = `#${i + 1} ${v ? 'Yes' : 'No'}`
}

function renderVotes(): void {
  voteGrid.innerHTML = votes.map((_, i) => `<button class="vote-chip" data-vi="${i}"></button>`).join('')
  voteGrid.querySelectorAll<HTMLElement>('[data-vi]').forEach((btn, i) => paintChip(btn, votes[i]))
}
renderVotes()

voteGrid.addEventListener('click', (event) => {
  const btn = (event.target as HTMLElement).closest('[data-vi]') as HTMLElement | null
  if (!btn) return
  const i = Number(btn.getAttribute('data-vi'))
  votes[i] = votes[i] ? 0 : 1
  paintChip(btn, votes[i]) // update in place so keyboard focus stays on the chip
  voteCts = null
  voteTally = null
  voteOut.textContent = 'Ballots changed — encrypt again to tally.'
})

;(document.querySelector('[data-vote-enc]') as HTMLButtonElement).addEventListener('click', () => {
  voteCts = votes.map((v) => engine.encryptScalar(v))
  voteTally = null
  voteOut.textContent = `Encrypted ${VOTERS} ballots into ${VOTERS} independent ciphertexts. The server cannot read any single vote.`
})

;(document.querySelector('[data-vote-tally]') as HTMLButtonElement).addEventListener('click', () => {
  if (!voteCts) {
    voteOut.textContent = 'Encrypt the ballots first.'
    return
  }
  voteTally = voteCts.reduce((acc, ct) => engine.add(acc, ct))
  const bits = engine.noiseBudgetBits(voteTally)
  voteOut.textContent = `Summed all ${VOTERS} ciphertexts into one tally ciphertext with homomorphic addition. Budget still healthy (${bits.toFixed(1)} bits) — addition is cheap. Now decrypt the tally.`
})

;(document.querySelector('[data-vote-dec]') as HTMLButtonElement).addEventListener('click', () => {
  if (!voteTally) {
    voteOut.textContent = 'Tally the ciphertexts first.'
    return
  }
  const tally = engine.decryptScalar(voteTally)
  const expected = votes.reduce((sum, v) => sum + v, 0)
  voteOut.innerHTML = `Decrypted tally: <strong>${tally} Yes</strong> out of ${VOTERS} — verify plaintext sum = ${expected} ${verdictBadge(tally === expected)}. No individual ballot was ever decrypted.`
})

resetE3()
