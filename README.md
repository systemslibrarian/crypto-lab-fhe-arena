# crypto-lab-fhe-arena

## 1. What It Is

FHE Arena demonstrates BGV (Brakerski-Gentry-Vaikuntanathan, 2012) and BFV (Fan-Vercauteren, 2012) — the two most widely deployed integer Fully Homomorphic Encryption schemes. Both encrypt integers and support addition and multiplication directly on ciphertexts, allowing a server to compute on encrypted data without ever decrypting it. The central challenge is the noise budget: every operation adds noise to the ciphertext, and when noise exceeds a threshold, decryption fails. BGV manages this via modulus switching; BFV via rescaling. This demo is the integer FHE companion to Blind Oracle (TFHE bit-level FHE).

## 2. When to Use It

- ✅ BFV: encrypted integer arithmetic, simple-to-moderate computation depth, most accessible starting point (Microsoft SEAL default)
- ✅ BGV: deeper computation requiring more multiplication levels, statistical workloads on encrypted integers
- ✅ Both: encrypted database queries, private genomics, encrypted voting tallying, private machine learning inference on integer data
- ❌ Neither is suitable for encrypted floating-point / approximate arithmetic — use CKKS for that (see crypto-lab-ckks-lab)
- ❌ Neither supports unlimited computation depth without bootstrapping (expensive — plan your circuit depth carefully)
- ❌ Not yet practical for real-time applications without GPU acceleration (2024 state of the art for deep circuits)

## 3. Live Demo

Link: https://systemslibrarian.github.io/crypto-lab-fhe-arena/

Six exhibits: what BGV/BFV FHE is and how it differs from TFHE, homomorphic addition with noise budget meter, the noise budget problem with modulus switching explanation, homomorphic multiplication and relinearization with SIMD batching demo, BGV vs BFV vs TFHE comparison table and decision tree, and real-world FHE deployments in private databases, genomics, ML inference, and encrypted voting.

## 4. How to Run Locally

```bash
git clone https://github.com/systemslibrarian/crypto-lab-fhe-arena
cd crypto-lab-fhe-arena
npm install
npm run dev
```

## 5. Part of the Crypto-Lab Suite

Part of [crypto-lab](https://systemslibrarian.github.io/crypto-lab/) — browser-based cryptography demos spanning 2,500 years of cryptographic history to NIST FIPS 2024 post-quantum standards.

Whether you eat or drink or whatever you do, do it all for the glory of God. — 1 Corinthians 10:31
