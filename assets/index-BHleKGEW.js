(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e={n:64,t:17,q:65537};function t(e,t){let n=e%t;return n<0?n+t:n}function n(e,n){let r=t(e,n);return r>n/2?r-n:r}function r(e){return Array.from({length:e},()=>0)}function i(e,t){return Math.floor(Math.random()*(t-e+1))+e}function a(e,t){return Array.from({length:e},()=>i(0,t-1))}function o(e){return Array.from({length:e},()=>i(-1,1))}function s(e,n,r){return e.map((e,i)=>t(e+n[i],r))}function c(e,n,r){return e.map((e,i)=>t(e-n[i],r))}function l(e,n,i,a){let o=r(i);for(let r=0;r<i;r+=1)for(let s=0;s<i;s+=1){let c=r+s;c<i?o[c]=t(o[c]+e[r]*n[s],a):o[c-i]=t(o[c-i]-e[r]*n[s],a)}return o}function u(e,r,i){return e.map(e=>t(Math.round(n(e,i)/r),i))}function d(e,n,i,a,o){let s=r(n);return s[0]=t(e,i)*o%a,s}function f(e,n,i,a,o){let s=r(n),c=Math.min(e.length,Math.floor(n/2));for(let n=0;n<c;n+=1)s[n]=t(e[n],i)*o%a;return s}function p(e,r,i,a){return t(Math.round(n(e[0],i)/a),r)}function m(e,r,i,a,o){let s=[];for(let c=0;c<r;c+=1){let r=Math.round(n(e[c],a)/o);s.push(t(r,i))}return s}function h(e){return e.map(e=>e.toString(16).padStart(4,`0`)).join(` `)}var g=new class{params=e;delta=Math.floor(e.q/e.t);keySet;constructor(){let e=o(this.params.n).map(e=>t(e,this.params.q)),n=a(this.params.n,this.params.q);this.keySet={secretKey:e,relinKey:[c(l(e,e,this.params.n,this.params.q),l(n,e,this.params.n,this.params.q),this.params.q),n]}}encryptEncoded(e,n,r){let i=a(this.params.n,this.params.q),u=o(this.params.n).map(e=>t(e,this.params.q));return{components:[s(c(e,l(i,this.keySet.secretKey,this.params.n,this.params.q),this.params.q),u,this.params.q),i],noise:u,q:this.params.q,t:this.params.t,n:this.params.n,encoding:`Delta=${r}`,scale:r,message:n}}encryptScalar(e){let n=d(e,this.params.n,this.params.t,this.params.q,this.delta);return this.encryptEncoded(n,[t(e,this.params.t)],this.delta)}encryptVector(e){let n=e.map(e=>t(e,this.params.t)),r=f(n,this.params.n,this.params.t,this.params.q,this.delta);return this.encryptEncoded(r,n,this.delta)}add(e,n){if(e.scale!==n.scale)throw Error(`Scale mismatch for add`);return{components:e.components.map((e,t)=>s(e,n.components[t],this.params.q)),noise:r(this.params.n),q:this.params.q,t:this.params.t,n:this.params.n,encoding:`Delta=${e.scale}`,scale:e.scale,message:e.message.map((e,r)=>t(e+n.message[r],this.params.t))}}multiplyNoRelin(e,n){let i=l(e.components[0],n.components[0],this.params.n,this.params.q),a=l(e.components[0],n.components[1],this.params.n,this.params.q),o=l(e.components[1],n.components[0],this.params.n,this.params.q),c=l(e.components[1],n.components[1],this.params.n,this.params.q);return{components:[i,s(a,o,this.params.q),c],noise:r(this.params.n),q:this.params.q,t:this.params.t,n:this.params.n,encoding:`Delta^2=${e.scale*n.scale}`,scale:e.scale*n.scale,message:e.message.map((e,r)=>t(e*n.message[r],this.params.t))}}relinearize(e){if(e.components.length!==3)return e;let[t,n]=this.keySet.relinKey,r=l(e.components[2],t,this.params.n,this.params.q),i=l(e.components[2],n,this.params.n,this.params.q);return{...e,components:[s(e.components[0],r,this.params.q),s(e.components[1],i,this.params.q)]}}rescaleToDelta(e){return e.scale<=this.delta?e:{...e,components:e.components.map(e=>u(e,this.delta,this.params.q)),scale:Math.max(this.delta,Math.round(e.scale/this.delta)),encoding:`Delta=${this.delta}`}}decryptPoly(e){let t=[Array.from({length:this.params.n},(e,t)=>+(t===0)),this.keySet.secretKey];for(;t.length<e.components.length;){let e=l(t[t.length-1],this.keySet.secretKey,this.params.n,this.params.q);t.push(e)}let n=r(this.params.n);return e.components.forEach((e,r)=>{let i=l(e,t[r],this.params.n,this.params.q);n=s(n,i,this.params.q)}),n}decryptScalar(e){return p(this.decryptPoly(e),this.params.t,this.params.q,e.scale)}decryptVector(e,t){return m(this.decryptPoly(e),t,this.params.t,this.params.q,e.scale)}noiseMagnitude(e){let t=this.decryptPoly(e),r=e.message.length===1?d(e.message[0],this.params.n,this.params.t,this.params.q,e.scale):f(e.message,this.params.n,this.params.t,this.params.q,e.scale),i=0;for(let e=0;e<this.params.n;e+=1){let a=Math.abs(n(t[e]-r[e],this.params.q));a>i&&(i=a)}return i}noiseBudgetPct(e){let t=e.scale/2,n=this.noiseMagnitude(e),r=Math.max(0,1-n/Math.max(1,t));return Math.round(r*100)}formatCipher(e){return e.components.map((e,t)=>`c${t}: ${h(e.slice(0,12))} ...`).join(`
`)}randomGarbage(){return i(0,this.params.t-1)}},_=document.querySelector(`#app`);_.innerHTML=`
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
`;function v(){return document.documentElement.getAttribute(`data-theme`)===`light`?`light`:`dark`}var y=document.querySelector(`[data-theme-toggle]`);function b(e){y.textContent=e===`dark`?`🌙`:`☀️`,y.setAttribute(`aria-label`,e===`dark`?`Switch to light mode`:`Switch to dark mode`)}function x(e){document.documentElement.setAttribute(`data-theme`,e),localStorage.setItem(`theme`,e),b(e)}b(v()),y.addEventListener(`click`,()=>{x(v()===`dark`?`light`:`dark`)});function S(e){let t=document.getElementById(e),n=Number(t.value);return Number.isFinite(n)?Math.max(0,Math.min(16,Math.round(n))):0}function C(e){return e.split(`,`).map(e=>Number(e.trim())).filter(e=>Number.isFinite(e)).slice(0,4).map(e=>(Math.round(e)%17+17)%17)}function w(e,t,n){let r=g.noiseBudgetPct(n),i=document.querySelector(e),a=document.querySelector(t),o=i.parentElement;i.style.width=`${r}%`,o.setAttribute(`aria-valuenow`,String(r)),a.textContent=`Noise budget remaining before decryption fails: ${r}%`}var T=null,E=null,D=null,O=document.querySelector(`[data-e2-cta]`),k=document.querySelector(`[data-e2-ctb]`),A=document.querySelector(`[data-e2-sum]`),j=document.querySelector(`[data-e2-result]`);document.querySelector(`[data-e2-enc-a]`).addEventListener(`click`,()=>{T=g.encryptScalar(S(`a2`)),O.textContent=g.formatCipher(T),w(`[data-e2-budget]`,`[data-e2-budget-label]`,T)}),document.querySelector(`[data-e2-enc-b]`).addEventListener(`click`,()=>{E=g.encryptScalar(S(`b2`)),k.textContent=g.formatCipher(E),w(`[data-e2-budget]`,`[data-e2-budget-label]`,E)}),document.querySelector(`[data-e2-add]`).addEventListener(`click`,()=>{if(!T||!E){j.textContent=`Encrypt both A and B first.`;return}D=g.add(T,E),A.textContent=g.formatCipher(D),w(`[data-e2-budget]`,`[data-e2-budget-label]`,D)}),document.querySelector(`[data-e2-dec]`).addEventListener(`click`,()=>{if(!D){j.textContent=`Add ciphertexts first.`;return}let e=S(`a2`),t=S(`b2`);j.textContent=`Decrypted result: ${g.decryptScalar(D)}; verify (${e} + ${t}) mod 17 = ${(e+t)%17}`});var M=g.encryptScalar(3),N=[],P=document.querySelector(`[data-e3-ops]`),F=document.querySelector(`[data-e3-decrypt]`),I=document.querySelector(`[data-e3-budget]`),L=document.querySelector(`[data-e3-budget-label]`);function R(){let e=g.noiseBudgetPct(M);P.textContent=`Sequence: ${N.length?N.join(` -> `):`fresh`}`,I.style.width=`${e}%`,I.parentElement.setAttribute(`aria-valuenow`,String(e)),L.textContent=`Budget: ${e}%`}function z(){let e=[[`Fresh ciphertext`,`100%`],[`x 1 multiplication`,`70%`],[`x 2 multiplications`,`45%`],[`x 3 multiplications`,`25%`],[`x 5 multiplications`,`5%`],[`x 6 multiplications`,`0% - decryption fails`]],t=document.querySelector(`[data-e3-table]`);t.innerHTML=e.map(e=>`<tr><td>${e[0]}</td><td>${e[1]}</td></tr>`).join(``)}z(),R(),document.querySelector(`[data-e3-reset]`).addEventListener(`click`,()=>{M=g.encryptScalar(3),N=[],F.textContent=`Decrypt output: 3`,R()}),document.querySelector(`[data-e3-add]`).addEventListener(`click`,()=>{M=g.add(M,g.encryptScalar(1)),N.push(`add`),R()}),document.querySelector(`[data-e3-mul]`).addEventListener(`click`,()=>{M=g.rescaleToDelta(g.relinearize(g.multiplyNoRelin(M,g.encryptScalar(2)))),N.push(`mul`),R()}),document.querySelector(`[data-e3-dec]`).addEventListener(`click`,()=>{let e=g.noiseBudgetPct(M),t=g.decryptScalar(M),n=M.message[0],r=e===0?g.randomGarbage():t;F.textContent=`Decrypt output: ${r}, expected ${n}, verdict: ${r===n?`correct`:`failure (garbage)`}`});var B=null,V=null,H=null,U=document.querySelector(`[data-e4-info]`),W=document.querySelector(`[data-e4-ct]`),G=document.querySelector(`[data-e4-budget]`),K=document.querySelector(`[data-e4-budget-label]`);function q(e){let t=g.noiseBudgetPct(e);U.textContent=`ciphertext components: ${e.components.length}`,W.textContent=g.formatCipher(e),G.style.width=`${t}%`,G.parentElement.setAttribute(`aria-valuenow`,String(t)),K.textContent=`Budget: ${t}%`}document.querySelector(`[data-e4-enc]`).addEventListener(`click`,()=>{B=g.encryptScalar(S(`a4`)),V=g.encryptScalar(S(`b4`)),H=null,q(B)}),document.querySelector(`[data-e4-mul]`).addEventListener(`click`,()=>{if(!B||!V){U.textContent=`Encrypt A and B first.`;return}H=g.multiplyNoRelin(B,V),q(H)}),document.querySelector(`[data-e4-relin]`).addEventListener(`click`,()=>{if(!H){U.textContent=`Run multiply first.`;return}H=g.rescaleToDelta(g.relinearize(H)),q(H)}),document.querySelector(`[data-e4-dec]`).addEventListener(`click`,()=>{if(!H){U.textContent=`No multiplication ciphertext to decrypt.`;return}let e=g.decryptScalar(H),t=S(`a4`),n=S(`b4`);U.textContent=`ciphertext components: ${H.components.length}; decrypted: ${e}; verify (${t} * ${n}) mod 17 = ${t*n%17}`});var J=null,Y=null,X=null;document.querySelector(`[data-e4-batch-enc]`).addEventListener(`click`,()=>{let e=document.querySelector(`[data-e4-batch-a]`).value,t=document.querySelector(`[data-e4-batch-b]`).value,n=C(e),r=C(t);J=g.encryptVector(n),Y=g.encryptVector(r),document.querySelector(`[data-e4-batch-out]`).textContent=`Encrypted vectors A=${JSON.stringify(n)} and B=${JSON.stringify(r)}.`}),document.querySelector(`[data-e4-batch-add]`).addEventListener(`click`,()=>{if(!J||!Y){document.querySelector(`[data-e4-batch-out]`).textContent=`Encrypt both batches first.`;return}X=g.add(J,Y),document.querySelector(`[data-e4-batch-out]`).textContent=`Added two packed ciphertexts with one homomorphic operation.`}),document.querySelector(`[data-e4-batch-dec]`).addEventListener(`click`,()=>{if(!X){document.querySelector(`[data-e4-batch-out]`).textContent=`Add batches first.`;return}let e=Math.min(X.message.length,4),t=g.decryptVector(X,e);document.querySelector(`[data-e4-batch-out]`).textContent=`Decrypted SIMD sum: ${JSON.stringify(t)} (4 additions in one ciphertext op).`}),document.querySelector(`[data-e5-run]`).addEventListener(`click`,()=>{let e=performance.now(),t=g.encryptScalar(9),n=g.encryptScalar(7),r=g.add(t,n),i=g.decryptScalar(r),a=(performance.now()-e).toFixed(2);document.querySelector(`[data-e5-time]`).textContent=`Toy BFV add timing: ${a} ms, decrypted result=${i}.`});