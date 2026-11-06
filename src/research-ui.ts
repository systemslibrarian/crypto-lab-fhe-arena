import { ToyBfvEngine } from './toyFhe'
import { boundaryExperiment, costModel, mergeTrace, outsourcedSum, radixTrace, ranks, type Boundary } from './research'

export const researchHtml = `
<section class="exhibit" id="research-workbench" aria-labelledby="research-heading">
  <h2 id="research-heading">Research workbench · Four questions before trusting a result</h2>
  <p>These exercises build on the live BFV arithmetic above. Toy encryption, scalar models and plaintext algorithm traces are labelled separately. They provide no production security or implementation of the cited research protocols.</p>
  <h3>1 · Private computation—but did the server cheat?</h3>
  <p>Encryption hides data under a secure scheme; by itself it does not prove that a server ran the requested program. Here the requested program is a + b modulo 17. The simulated dishonest server adds the supplied ciphertext for b twice, without using the secret key.</p>
  <div class="row">
    <label>Input a <input id="research-a" type="number" min="0" max="8" step="1" value="3"></label>
    <label>Input b <input id="research-b" type="number" min="0" max="8" step="1" value="4"></label>
    <label>Server action <select id="research-server"><option value="honest">Requested sum</option><option value="dishonest">Add b twice</option></select></label>
    <button class="action" id="research-run" type="button">Encrypt, evaluate and check</button>
  </div>
  <p id="research-integrity" role="status" aria-live="polite">Run the experiment to compare the decrypted result with local recomputation.</p>
  <p><strong>Local recomputation is not a cryptographic proof.</strong> A matching result on one input does not prove which program ran (try b = 0). Both parties and the secret key live in this browser. A verifiable FHE protocol needs a sound proof binding the requested circuit, input ciphertexts and returned ciphertext, with the correct evaluation keys, parameters, constraint coverage and noise assumptions. Verify before decrypting/releasing the result; reject a failed proof. <a href="https://eprint.iacr.org/2026/1871">PEEV</a> combines FHE with a proof system and trusted setup; this exercise does not implement or certify it.</p>

  <h3>2 · Where did the speedup go?</h3>
  <p>A synthetic cost worksheet—not a browser benchmark or a paper timing. One-time setup is 1,000 ms. Each batch costs encryption 10 + transfer 20 + evaluation (below) + proof generation 500 + verification 200 + decryption 10 ms. Sequential stages, no overlap. Change occupancy without mistaking amortized cost for request latency.</p>
  <div class="row">
    <label>Occupied slots (of 1,024) <input id="research-slots" type="number" min="1" max="1024" step="1" value="1"></label>
    <label>Batches sharing setup <input id="research-batches" type="number" min="1" max="1000" step="1" value="1"></label>
    <label>Evaluation per batch (ms) <input id="research-eval" type="number" min="0" max="1000000" step="1" value="100"></label>
  </div>
  <p id="research-cost" role="status" aria-live="polite"></p>
  <p>Separate illustrative resource assumptions: 64 MiB resident evaluation keys, 128 KiB ciphertext traffic and 8 KiB proof per batch. These sizes are not derived from the BFV toy or the entered latency. Unoccupied slots do no useful work; a faster method can consume more slots or memory. The worksheet assumes 1,024 independent SIMD slots; the BFV exhibit above uses coefficient packing, which is different. <a href="https://eprint.iacr.org/2026/1871">PEEV separates evaluation, proof and verification costs</a>; <a href="https://drive.google.com/file/d/1r5za7qhtz1nXUb6jE-BFpL5eC1-ifMvt/view">CKKS precision allocation</a> motivates reporting useful occupancy and output precision alongside latency.</p>

  <h3>3 · Why did the encrypted answer become wrong?</h3>
  <label>Failure boundary <select id="research-boundary"><option value="wrap">Plaintext wraparound</option><option value="noise">Injected ciphertext phase error</option><option value="precision">Approximation and encoding precision</option><option value="depth">Circuit depth allocation</option></select></label>
  <p id="research-boundary-result" role="status" aria-live="polite"></p>
  <p>Do not diagnose every discrepancy as noise. Integer modular semantics, approximate encoding error and an unsupported circuit are separate checks. <a href="#exhibit-3">Run the live noise experiment</a> or explore <a href="https://systemslibrarian.github.io/crypto-lab-ckks-lab/">CKKS Lab</a>. Research on <a href="https://eprint.iacr.org/2026/2368">digit decomposition and sign evaluation</a> distinguishes input gap/resolution from output accuracy; its specialized assumptions are not transferred to this toy.</p>

  <h3>4 · Debug the printed sorting algorithm</h3>
  <p>Executable plaintext traces of selected pseudocode in the saved <a href="https://eprint.iacr.org/2026/1495">sorting survey</a> (Algorithms 1, 9, 16 and 18). These are not encrypted executions or tests of the authors’ software. The proposed repairs below are teaching variants, not reported author corrections.</p>
  <div class="row">
    <label>Counterexample <select id="research-sort"><option value="merge">Merge [1] and [2]</option><option value="radix">Radix [1,0], b=2, r=2</option><option value="ranks">Tied ranks [5,5]</option></select></label>
    <label><input id="research-repair" type="checkbox"> Apply proposed repair</label>
  </div>
  <pre id="research-trace" aria-label="Sorting trace" tabindex="0"></pre>
  <p id="research-sort-result" role="status" aria-live="polite"></p>
  <p>Merge must mask exhausted inputs despite blind access returning zero. Radix needs all r low bits, (1 &lt;&lt; r) − 1, rather than only bit r − 1. Equal upper ranks can still support client-side sorting of value/rank pairs; they are not unique scatter destinations. Stable ranks count smaller values plus preceding equals. These counterexamples do not establish a break of FHE or invalidate reported benchmarks.</p>
</section>`

export function wireResearch(engine: ToyBfvEngine): void {
  const input = (id: string) => document.getElementById(id) as HTMLInputElement
  const write = (id: string, value: string) => { document.getElementById(id)!.textContent = value }
  const invalidate = () => write('research-integrity', 'Inputs or action changed. Run again to check this request.')
  for (const id of ['research-a', 'research-b', 'research-server']) input(id).addEventListener('input', invalidate)
  input('research-run').addEventListener('click', () => {
    const a = Number(input('research-a').value), b = Number(input('research-b').value)
    if ([a, b].some(v => !Number.isInteger(v) || v < 0 || v > 8) || !input('research-a').value || !input('research-b').value) {
      write('research-integrity', 'Enter whole numbers from 0 to 8.'); return
    }
    const r = outsourcedSum(engine, a, b, input('research-server').value === 'dishonest')
    write('research-integrity', `Expected ${r.expected}; decrypted ${r.actual}. ${r.matches ? 'Local check matches on this input' : 'Local check detects wrong output'}. No cryptographic proof was supplied.`)
  })
  const updateCost = () => {
    try {
      const ids = ['research-slots', 'research-batches', 'research-eval']
      if (ids.some(id => !input(id).value || !input(id).checkValidity())) throw new Error('Enter values within the displayed bounds.')
      const c = costModel(Number(input(ids[0]).value), Number(input(ids[1]).value), Number(input(ids[2]).value))
      write('research-cost', `Online batch latency: ${c.onlineMs.toFixed(0)} ms; first batch with setup: ${(c.setupMs + c.onlineMs).toFixed(0)} ms; total run: ${c.totalMs.toFixed(0)} ms. Amortized cost including setup: ${c.perItemMs.toFixed(3)} ms/useful item; throughput: ${c.itemsPerSecond.toFixed(3)} useful items/s.`)
    } catch (e) { write('research-cost', (e as Error).message) }
  }
  for (const id of ['research-slots', 'research-batches', 'research-eval']) input(id).addEventListener('input', updateCost)
  const updateBoundary = () => write('research-boundary-result', boundaryExperiment(input('research-boundary').value as Boundary, engine))
  input('research-boundary').addEventListener('change', updateBoundary)
  const updateSort = () => {
    const repair = input('research-repair').checked, kind = input('research-sort').value
    if (kind === 'ranks') {
      const result = ranks([5, 5], repair)
      write('research-trace', `values [5,5] → ranks [${result}]`)
      write('research-sort-result', repair ? 'Stable unique destinations [0,1].' : 'Upper ranks [1,1] tie: valid for sorting value/rank pairs, not unique scatter destinations.')
    } else {
      const r = kind === 'merge' ? mergeTrace([1], [2], repair) : radixTrace([1, 0], 2, 2, repair)
      write('research-trace', r.trace.join('\n'))
      write('research-sort-result', `Output [${r.output}]. ${repair ? 'Correct for this example; tests cover more bounded inputs.' : 'Counterexample to the printed pseudocode under these semantics.'}`)
    }
  }
  input('research-sort').addEventListener('change', updateSort)
  input('research-repair').addEventListener('change', updateSort)
  updateCost(); updateBoundary(); updateSort()
}
