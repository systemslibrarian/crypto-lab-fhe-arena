export type Theme = 'dark' | 'light'

export type ToyCiphertext = {
  components: number[][]
  noise: number[]
  q: number
  t: number
  n: number
  encoding: string
}

export type ToySecretKey = number[]

export type ToyKeySet = {
  secretKey: ToySecretKey
  relinKey: number[][]
}
